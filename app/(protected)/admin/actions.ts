"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import { sendTenantEmail } from "@/lib/email/mailer";
import { accessApprovedEmail, accessDeniedEmail } from "@/lib/email/templates";

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
  const { data: request, error: updateError } = await supabase
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_by: adminUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("email")
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  // F3-R6: notify the requester. Best-effort — never block approval.
  if (request?.email) {
    try {
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenant.id)
        .single();
      const { subject, html, text } = accessApprovedEmail(
        tenantRow?.name ?? tenant.slug
      );
      await sendTenantEmail(tenant.id, { to: request.email, subject, html, text });
    } catch {
      // SMTP not configured or send failed — swallow.
    }
  }

  revalidatePath("/admin");
  return { message: "Användaren har godkänts." };
}

export async function denyRequest(
  requestId: string,
  reason?: string
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  const { data: request, error } = await supabase
    .from("access_requests")
    .update({
      status: "denied",
      deny_reason: reason || null,
      reviewed_by: adminUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("email")
    .single();

  if (error) {
    return { error: error.message };
  }

  // F3-R6: notify the requester. Best-effort — never block denial.
  if (request?.email && tenant) {
    try {
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenant.id)
        .single();
      const { subject, html, text } = accessDeniedEmail(
        tenantRow?.name ?? tenant.slug,
        reason || null
      );
      await sendTenantEmail(tenant.id, { to: request.email, subject, html, text });
    } catch {
      // SMTP not configured or send failed — swallow.
    }
  }

  revalidatePath("/admin");
  return { message: "Förfrågan nekad." };
}
