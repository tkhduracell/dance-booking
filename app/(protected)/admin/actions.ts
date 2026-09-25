"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";

export async function approveRequest(
  requestId: string,
  userId: string
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  // Get the "booker" role ID
  const { data: bookerRole } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "booker")
    .single();

  if (!bookerRole) {
    return { error: "Booker-rollen hittades inte." };
  }

  // Assign booker membership in this tenant
  const { error: roleError } = await supabase.from("memberships").upsert(
    {
      user_id: userId,
      tenant_id: tenant.id,
      role_id: bookerRole.id,
      assigned_by: adminUser?.id,
    },
    { onConflict: "user_id,tenant_id" }
  );

  if (roleError) {
    return { error: roleError.message };
  }

  // Mark request as approved
  const { error: updateError } = await supabase
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_by: adminUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin");
  return { message: "Användaren har godkänts." };
}

export async function denyRequest(
  requestId: string
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");

  const supabase = await createClient();

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("access_requests")
    .update({
      status: "denied",
      reviewed_by: adminUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { message: "Förfrågan nekad." };
}
