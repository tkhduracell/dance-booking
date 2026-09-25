"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/permissions";
import { encryptSecret } from "@/lib/email/crypto";
import { sendTestEmail, getTenantSmtpConfig } from "@/lib/email/mailer";

const SECURITY_VALUES = ["tls", "starttls", "none"] as const;

async function loadTenantId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

/** F9-R10/R11: save per-tenant SMTP settings. Password is encrypted
 * server-side and never echoed back. Empty password field keeps the
 * existing one (write-only UI, "••• sparad"). */
export async function saveSmtpSettings(
  slug: string,
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

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
    // Any settings change invalidates the last test result (F9-R12).
    smtp_test_ok: false,
    smtp_test_at: null,
    smtp_test_error: null,
  };

  if (password) {
    update.smtp_password_enc = "\\x" + encryptSecret(password).toString("hex");
  }

  const { error } = await supabase.from("tenants").update(update).eq("id", tenantId);
  if (error) return { error: error.message };

  revalidatePath(`/superadmin/${slug}`);
  return { message: "SMTP-inställningar sparade." };
}

/** F9-R10: "Skicka testmejl" — uses the saved config (must be saved first). */
export async function sendSmtpTestEmail(
  slug: string,
  to: string
): Promise<{ error?: string; message?: string }> {
  await requireSuperAdmin();

  const tenantId = await loadTenantId(slug);
  if (!tenantId) return { error: "Klubb hittades inte." };

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

  revalidatePath(`/superadmin/${slug}`);

  if (!result.ok) return { error: `Testmejl misslyckades: ${result.error}` };
  return { message: "Testmejl skickat." };
}
