"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";

/** F7-R1: grant or revoke a role for a member. Blocks demoting/removing the
 * tenant's last admin. */
export async function setMemberRole(
  userId: string,
  role: "admin" | "booker",
  grant: boolean
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();

  if (role === "admin" && !grant) {
    const { data: count } = await supabase.rpc("admin_count_in_tenant", {
      p_tenant_id: tenant.id,
    });
    const { data: memberships } = await supabase
      .from("memberships")
      .select("role_id, roles:role_id(name)")
      .eq("user_id", userId)
      .eq("tenant_id", tenant.id);
    const isCurrentlyAdmin = (memberships ?? []).some(
      (m) => (m.roles as unknown as { name: string })?.name === "admin"
    );
    if (isCurrentlyAdmin && (count ?? 0) <= 1) {
      return { error: "Kan inte ta bort klubbens sista admin." };
    }
  }

  const { data: roleRow } = await supabase.from("roles").select("id").eq("name", role).single();
  if (!roleRow) return { error: "Rollen hittades inte." };

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (grant) {
    const { error } = await supabase.from("memberships").upsert(
      { user_id: userId, tenant_id: tenant.id, role_id: roleRow.id, assigned_by: adminUser?.id },
      { onConflict: "user_id,tenant_id" }
    );
    if (error) return { error: error.message };
  } else {
    // Only one role per membership row today (user_id+tenant_id is PK), so
    // "revoke" means demoting to booker if removing admin, or removing the
    // membership entirely if removing booker (their only role).
    if (role === "admin") {
      const { data: bookerRole } = await supabase.from("roles").select("id").eq("name", "booker").single();
      if (!bookerRole) return { error: "Booker-rollen hittades inte." };
      const { error } = await supabase
        .from("memberships")
        .update({ role_id: bookerRole.id })
        .eq("user_id", userId)
        .eq("tenant_id", tenant.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("user_id", userId)
        .eq("tenant_id", tenant.id);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/admin/members");
  return { message: "Uppdaterat." };
}

/** F7-R1: remove a member's membership entirely. Future bookings are kept
 * (booked_by is unaffected — only the membership row is deleted). */
export async function removeMember(
  userId: string
): Promise<{ error?: string; message?: string; futureBookings?: number }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("roles:role_id(name)")
    .eq("user_id", userId)
    .eq("tenant_id", tenant.id);
  const isAdmin = (memberships ?? []).some(
    (m) => (m.roles as unknown as { name: string })?.name === "admin"
  );

  if (isAdmin) {
    const { data: count } = await supabase.rpc("admin_count_in_tenant", {
      p_tenant_id: tenant.id,
    });
    if ((count ?? 0) <= 1) {
      return { error: "Kan inte ta bort klubbens sista admin." };
    }
  }

  const { count: futureBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("booked_by", userId)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString());

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenant.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  return {
    message: `Medlem borttagen. ${futureBookings ?? 0} kommande bokningar behålls.`,
    futureBookings: futureBookings ?? 0,
  };
}

export async function currentAdminId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
