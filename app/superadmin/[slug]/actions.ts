"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/permissions";
import { safeNext } from "@/lib/auth/safe-next";
import { sendTenantEmail } from "@/lib/email/mailer";
import { magicLinkEmail, accessApprovedEmail } from "@/lib/email/templates";
import {
  saveSmtpSettingsForTenant,
  sendSmtpTestEmailForTenant,
  saveDansSeSettingsForTenant,
  syncDansSeNowForTenant,
} from "@/lib/tenant-settings/save";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadTenantId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

async function logAudit(
  tenantId: string | null,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  await admin.from("platform_audit_log").insert({
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    tenant_id: tenantId,
    action,
    details,
  });
}

/** F9-R13: list members of a tenant (name, email, roles). Uses the
 * service-role client directly instead of the get_tenant_members RPC,
 * since that RPC's embedded is_tenant_admin(auth.uid()) check would
 * require the super-admin to literally be a member of the tenant. */
export async function listTenantMembers(
  slug: string
): Promise<{ userId: string; name: string; email: string; roles: string[] }[]> {
  await requireSuperAdmin();
  const tenantId = await loadTenantId(slug);
  if (!tenantId) return [];

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id, roles:role_id(name)")
    .eq("tenant_id", tenantId);

  if (!memberships || memberships.length === 0) return [];

  const byUser = new Map<string, string[]>();
  for (const m of memberships) {
    const roleName = (m.roles as unknown as { name: string } | null)?.name;
    if (!roleName) continue;
    const list = byUser.get(m.user_id) ?? [];
    list.push(roleName);
    byUser.set(m.user_id, list);
  }

  const results: { userId: string; name: string; email: string; roles: string[] }[] = [];
  for (const [userId, roles] of byUser) {
    const { data: userRes } = await admin.auth.admin.getUserById(userId);
    const u = userRes?.user;
    const email = u?.email ?? "";
    const name =
      (u?.user_metadata?.name as string | undefined) ??
      (u?.user_metadata?.full_name as string | undefined) ??
      email.split("@")[0] ??
      "";
    results.push({ userId, name, email, roles });
  }

  return results;
}

/** F9-R13: list pending access requests for a tenant. */
export async function listPendingRequests(
  slug: string
): Promise<{ id: string; name: string; email: string; createdAt: string }[]> {
  await requireSuperAdmin();
  const tenantId = await loadTenantId(slug);
  if (!tenantId) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("access_requests")
    .select("id, name, email, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.created_at,
  }));
}

/** F9-R13: approve a pending access request directly as admin or booker
 * (bypasses the tenant admin approval queue, per F9-R3). */
export async function approveRequest(
  slug: string,
  requestId: string,
  role: "admin" | "booker"
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();
  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

  const admin = createAdminClient();

  const { data: request } = await admin
    .from("access_requests")
    .select("id, user_id, email")
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .single();
  if (!request) return { error: "Förfrågan hittades inte." };

  const { data: roleRow } = await admin.from("roles").select("id").eq("name", role).single();
  if (!roleRow) return { error: "Rollen hittades inte." };

  const {
    data: { user: actor },
  } = await (await createClient()).auth.getUser();

  const { error: membershipError } = await admin.from("memberships").upsert(
    { user_id: request.user_id, tenant_id: tenantId, role_id: roleRow.id, assigned_by: actor?.id },
    { onConflict: "user_id,tenant_id" }
  );
  if (membershipError) return { error: membershipError.message };

  const { error: updateError } = await admin
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_by: actor?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (updateError) return { error: updateError.message };

  // F3-R6-style notification — best-effort, never blocks approval.
  try {
    const { data: tenantRow } = await admin.from("tenants").select("name").eq("id", tenantId).single();
    const { subject, html, text } = accessApprovedEmail(tenantRow?.name ?? slug);
    await sendTenantEmail(tenantId, { to: request.email, subject, html, text });
  } catch {
    // SMTP not configured or send failed — swallow.
  }

  await logAudit(tenantId, "approve_request", { requestId, role, email: request.email });

  revalidatePath(`/superadmin/${slug}`);
  return { message: "Förfrågan godkänd." };
}

/** F9-R13: grant or revoke admin for an existing member. Last-admin guard
 * on revoke: cannot revoke the tenant's last admin. */
export async function setAdminMembership(
  slug: string,
  userId: string,
  tenantId: string,
  grant: boolean
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { data: adminRole } = await admin.from("roles").select("id").eq("name", "admin").single();
  if (!adminRole) return { error: "Admin-rollen hittades inte." };

  if (!grant) {
    const { count } = await admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role_id", adminRole.id);
    if ((count ?? 0) <= 1) {
      return { error: "Kan inte ta bort klubbens sista admin." };
    }

    const { data: bookerRole } = await admin.from("roles").select("id").eq("name", "booker").single();
    if (!bookerRole) return { error: "Booker-rollen hittades inte." };

    const { error } = await admin
      .from("memberships")
      .update({ role_id: bookerRole.id })
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("memberships")
      .upsert(
        { user_id: userId, tenant_id: tenantId, role_id: adminRole.id },
        { onConflict: "user_id,tenant_id" }
      );
    if (error) return { error: error.message };
  }

  await logAudit(tenantId, "set_admin_membership", { userId, grant });

  revalidatePath(`/superadmin/${slug}`);
  return { message: grant ? "Admin tilldelad." : "Admin borttagen." };
}

/** F9-R13: invite a member as admin by email — creates the auth user if
 * missing, grants admin membership, and sends a magic-link invite via the
 * tenant's own SMTP (reusing F2-R3's link generation/templates). */
export async function inviteAdminByEmail(
  slug: string,
  email: string,
  tenantId: string
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return { error: "Ange en giltig e-postadress." };
  }

  const admin = createAdminClient();

  const { data: adminRole } = await admin.from("roles").select("id").eq("name", "admin").single();
  if (!adminRole) return { error: "Admin-rollen hittades inte." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  const gen = () => admin.auth.admin.generateLink({ type: "magiclink", email: trimmed });
  let { data: linkData, error: linkError } = await gen();
  if (linkError) {
    await admin.auth.admin.createUser({ email: trimmed, email_confirm: true });
    ({ data: linkData, error: linkError } = await gen());
  }

  const userId = linkData?.user?.id;
  const hashed = linkData?.properties?.hashed_token;
  if (linkError || !userId || !hashed) {
    return { error: "Kunde inte skapa inloggningslänk." };
  }

  const { error: membershipError } = await admin.from("memberships").upsert(
    { user_id: userId, tenant_id: tenantId, role_id: adminRole.id },
    { onConflict: "user_id,tenant_id" }
  );
  if (membershipError) return { error: membershipError.message };

  const { data: tenantRow } = await admin.from("tenants").select("name").eq("id", tenantId).single();
  const tenantName = tenantRow?.name ?? slug;

  const link = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=magiclink&next=${encodeURIComponent(safeNext(undefined))}`;
  const { subject, html, text } = magicLinkEmail(tenantName, link);

  try {
    await sendTenantEmail(tenantId, { to: trimmed, subject, html, text });
  } catch {
    await logAudit(tenantId, "invite_admin_by_email", { email: trimmed, sent: false });
    revalidatePath(`/superadmin/${slug}`);
    return {
      error: "Admin tillagd men inbjudningsmejlet kunde inte skickas (SMTP saknas).",
    };
  }

  await logAudit(tenantId, "invite_admin_by_email", { email: trimmed, sent: true });

  revalidatePath(`/superadmin/${slug}`);
  return { message: "Inbjudan skickad." };
}

/** F9-R10/R11: save per-tenant SMTP settings (super-admin route). */
export async function saveSmtpSettings(
  slug: string,
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

  const result = await saveSmtpSettingsForTenant(tenantId, formData);
  revalidatePath(`/superadmin/${slug}`);
  return result;
}

/** F9-R10: "Skicka testmejl" (super-admin route). */
export async function sendSmtpTestEmail(
  slug: string,
  to: string
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

  const result = await sendSmtpTestEmailForTenant(tenantId, to);
  revalidatePath(`/superadmin/${slug}`);
  return result;
}

/** F5-R7/F9-R7: save dans.se org + token (super-admin route). */
export async function saveDansSeSettings(
  slug: string,
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

  const result = await saveDansSeSettingsForTenant(tenantId, formData);
  revalidatePath(`/superadmin/${slug}`);
  return result;
}

/** F5-R1: "Synka nu" (super-admin route). */
export async function syncDansSeNow(
  slug: string
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

  const result = await syncDansSeNowForTenant(tenantId);
  revalidatePath(`/superadmin/${slug}`);
  return result;
}
