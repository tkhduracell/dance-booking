"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenant } from "@/lib/tenant/current";
import { sendTenantEmail } from "@/lib/email/mailer";
import { magicLinkEmail } from "@/lib/email/templates";

/**
 * F2-R3: magic-link sign-in sent via the tenant's own SMTP, not Supabase's
 * mailer. Generates the link with the admin API and emails it ourselves.
 */
export async function sendMagicLink(
  email: string
): Promise<{ error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Ange en giltig e-postadress." };
  }

  const tenant = await getCurrentTenant();
  if (!tenant) {
    return { error: "Ingen klubb hittades." };
  }

  const admin = createAdminClient();

  const { data: tenantRow } = await admin
    .from("tenants")
    .select("name")
    .eq("id", tenant.id)
    .single();
  const tenantName = tenantRow?.name ?? tenant.slug;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: trimmed,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error || !data?.properties?.action_link) {
    return { error: error?.message ?? "Kunde inte skapa inloggningslänk." };
  }

  const { subject, html, text } = magicLinkEmail(
    tenantName,
    data.properties.action_link
  );

  try {
    await sendTenantEmail(tenant.id, { to: trimmed, subject, html, text });
  } catch {
    return {
      error:
        "Klubben har inte konfigurerat e-post ännu. Kontakta en administratör.",
    };
  }

  return {};
}
