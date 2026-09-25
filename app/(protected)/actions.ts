"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenant } from "@/lib/tenant/current";
import { sendTenantEmail } from "@/lib/email/mailer";
import { newAccessRequestEmail } from "@/lib/email/templates";

const ALLOWED_ROLES = ["Funktionär", "Tävlingsdansare", "Annat"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

/**
 * F3-R1: on first sign-in to a tenant with no membership and no existing
 * request, auto-create a pending access_request using the auth provider's
 * name/email. Idempotent — safe to call on every protected-layout render.
 */
export async function ensureAccessRequest(): Promise<void> {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  if (!tenant) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: pending } = await supabase
    .from("access_requests")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return;

  const provider = user.app_metadata?.provider ?? null;
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Okänd";

  await supabase.from("access_requests").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    name,
    email: user.email ?? "",
    provider,
  });

  // F3-R5: notify every tenant admin. Best-effort — never block signup.
  try {
    await notifyAdminsOfNewRequest(tenant.id, name, user.email ?? "");
  } catch {
    // SMTP not configured yet, or send failed — swallow, F9-R10 logs elsewhere.
  }
}

async function notifyAdminsOfNewRequest(
  tenantId: string,
  requesterName: string,
  requesterEmail: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: tenantRow } = await admin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();
  const tenantName = tenantRow?.name ?? "din klubb";

  const { data: admins } = await admin
    .from("memberships")
    .select("user_id, roles!inner(name)")
    .eq("tenant_id", tenantId)
    .eq("roles.name", "admin");

  if (!admins || admins.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
  const adminUrl = `${appUrl}/admin`;

  for (const m of admins) {
    const { data: authUser } = await admin.auth.admin.getUserById(m.user_id);
    const adminEmail = authUser?.user?.email;
    if (!adminEmail) continue;

    const { subject, html, text } = newAccessRequestEmail(
      tenantName,
      requesterName,
      requesterEmail,
      adminUrl
    );
    try {
      await sendTenantEmail(tenantId, { to: adminEmail, subject, html, text });
    } catch {
      // one admin's send failing shouldn't block the others
    }
  }
}

/** F3-R2: optional community role + message, added by the user on /waiting. */
export async function updateAccessRequestDetails(
  requestId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du måste vara inloggad." };

  const roleRaw = (formData.get("communityRole") as string | null)?.trim() ?? "";
  const roleOther =
    (formData.get("communityRoleOther") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  let communityRole: string | null = null;
  if (roleRaw) {
    if (!ALLOWED_ROLES.includes(roleRaw as AllowedRole)) {
      return { error: "Välj en giltig roll." };
    }
    communityRole = roleRaw === "Annat" ? roleOther || "Annat" : roleRaw;
  }

  const { error } = await supabase
    .from("access_requests")
    .update({ community_role: communityRole, message: message || null })
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return {};
}

/** F3-R7: a denied user can request again. */
export async function requestAgain(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du måste vara inloggad." };

  const provider = user.app_metadata?.provider ?? null;
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Okänd";

  const { error } = await supabase.from("access_requests").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    name,
    email: user.email ?? "",
    provider,
  });

  if (error) return { error: error.message };
  return {};
}
