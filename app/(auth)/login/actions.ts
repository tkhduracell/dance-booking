"use server";

import { safeNext } from "@/lib/auth/safe-next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenant } from "@/lib/tenant/current";
import { getTenantSmtpConfig, sendTenantEmail } from "@/lib/email/mailer";
import { createClient } from "@/lib/supabase/server";
import { magicLinkEmail } from "@/lib/email/templates";

/**
 * F2-R3: magic-link sign-in sent via the tenant's own SMTP, not Supabase's
 * mailer. Generates the link with the admin API and emails it ourselves.
 */
export async function sendMagicLink(
  email: string,
  next?: string
): Promise<{ error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Ange en giltig e-postadress." };
  }

  const tenant = await getCurrentTenant();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  // F2-R3 bootstrap: until the tenant has SMTP configured, fall back to
  // Supabase's built-in mailer (PKCE code flow via /auth/callback).
  if (!tenant || !(await getTenantSmtpConfig(tenant.id))) {
    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
      },
    });
    return otpError ? { error: "Kunde inte skicka inloggningslänk." } : {};
  }

  const admin = createAdminClient();

  const { data: tenantRow } = await admin
    .from("tenants")
    .select("name")
    .eq("id", tenant.id)
    .single();
  const tenantName = tenantRow?.name ?? tenant.slug;

  // F2: first sign-in creates the account (auto-queued later on first visit)
  const gen = () =>
    admin.auth.admin.generateLink({ type: "magiclink", email: trimmed });
  let { data, error } = await gen();
  if (error) {
    await admin.auth.admin.createUser({ email: trimmed, email_confirm: true });
    ({ data, error } = await gen());
  }

  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    return { error: "Kunde inte skapa inloggningslänk." };
  }
  const link = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=magiclink&next=${encodeURIComponent(safeNext(next))}`;

  const { subject, html, text } = magicLinkEmail(
    tenantName,
    link
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
