// Shared save logic for tenant settings (F9), called from both
// /superadmin/[slug]/actions.ts (super-admin) and
// /(protected)/admin/settings/actions.ts (tenant admin). Permission checks
// are done by the callers before invoking these.

import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/email/crypto";
import { sendTestEmail, getTenantSmtpConfig } from "@/lib/email/mailer";
import { syncTenant } from "@/lib/dans-se/sync";

const SECURITY_VALUES = ["tls", "starttls", "none"] as const;

export async function saveSmtpSettingsForTenant(
  tenantId: string,
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  const host = (formData.get("smtp_host") as string | null)?.trim() ?? "";
  const portRaw = (formData.get("smtp_port") as string | null)?.trim() ?? "";
  const security = (formData.get("smtp_security") as string | null) ?? "starttls";
  const user = (formData.get("smtp_user") as string | null)?.trim() ?? "";
  const password = (formData.get("smtp_password") as string | null) ?? "";
  const fromName = (formData.get("smtp_from_name") as string | null)?.trim() ?? "";
  const fromAddress =
    (formData.get("smtp_from_address") as string | null)?.trim() ?? "";

  if (!host) return { error: "Värd (host) krävs." };
  const port = Number(portRaw);
  if (!portRaw || Number.isNaN(port) || port <= 0) {
    return { error: "Ogiltig port." };
  }
  if (!SECURITY_VALUES.includes(security as (typeof SECURITY_VALUES)[number])) {
    return { error: "Ogiltig säkerhetsinställning." };
  }
  if (!fromAddress || !fromAddress.includes("@")) {
    return { error: "Giltig avsändaradress krävs." };
  }

  const supabase = await createClient();

  const update: Record<string, unknown> = {
    smtp_host: host,
    smtp_port: port,
    smtp_security: security,
    smtp_user: user || null,
    smtp_from_name: fromName || null,
    smtp_from_address: fromAddress,
    smtp_test_ok: false,
    smtp_test_at: null,
    smtp_test_error: null,
  };

  if (password) {
    update.smtp_password_enc = "\\x" + encryptSecret(password).toString("hex");
  }

  const { error } = await supabase.from("tenants").update(update).eq("id", tenantId);
  if (error) return { error: error.message };

  return { message: "SMTP-inställningar sparade." };
}

export async function sendSmtpTestEmailForTenant(
  tenantId: string,
  to: string
): Promise<{ error?: string; message?: string }> {
  const config = await getTenantSmtpConfig(tenantId);
  if (!config) {
    return { error: "Spara SMTP-inställningarna innan du skickar ett testmejl." };
  }

  const result = await sendTestEmail(config, to);

  const supabase = await createClient();
  await supabase
    .from("tenants")
    .update({
      smtp_test_ok: result.ok,
      smtp_test_at: new Date().toISOString(),
      smtp_test_error: result.ok ? null : result.error,
    })
    .eq("id", tenantId);

  if (!result.ok) return { error: `Testmejl misslyckades: ${result.error}` };
  return { message: "Testmejl skickat." };
}

export async function saveDansSeSettingsForTenant(
  tenantId: string,
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  const orgRaw = (formData.get("dans_se_org") as string | null)?.trim() ?? "";
  const token = (formData.get("dans_se_token") as string | null) ?? "";

  const org = orgRaw.replace(/^https?:\/\/(www\.)?dans\.se\//i, "").replace(/\/.*$/, "");

  const supabase = await createClient();
  const update: Record<string, unknown> = { dans_se_org: org || null };
  if (token) {
    update.dans_se_token_enc = "\\x" + encryptSecret(token).toString("hex");
  }

  const { error } = await supabase.from("tenants").update(update).eq("id", tenantId);
  if (error) return { error: error.message };

  return { message: "dans.se-inställningar sparade." };
}

export async function syncDansSeNowForTenant(
  tenantId: string
): Promise<{ error?: string; message?: string }> {
  const result = await syncTenant(tenantId);
  if (!result.ok) return { error: `Synk misslyckades: ${result.error}` };
  return {
    message: `Synk klar: ${result.coursesCount} kurser, ${result.occasionsCount} tillfällen.`,
  };
}
