import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/email/crypto";

export type TenantSmtpConfig = {
  host: string;
  port: number;
  security: "tls" | "starttls" | "none" | null;
  user: string | null;
  password: string | null;
  fromName: string | null;
  fromAddress: string;
};

/**
 * F9-R10/R11: server-only. Loads a tenant's SMTP config, decrypting the
 * password. Never returned to the client, never logged.
 */
export async function getTenantSmtpConfig(
  tenantId: string
): Promise<TenantSmtpConfig | null> {
  const supabase = createAdminClient();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(
      "smtp_host, smtp_port, smtp_security, smtp_user, smtp_password_enc, smtp_from_name, smtp_from_address"
    )
    .eq("id", tenantId)
    .single();

  if (error || !tenant || !tenant.smtp_host || !tenant.smtp_from_address) {
    return null;
  }

  let password: string | null = null;
  if (tenant.smtp_password_enc) {
    // postgrest/supabase-js returns bytea as a "\x"-prefixed hex string.
    const raw = tenant.smtp_password_enc as unknown as string;
    const hex = raw.startsWith("\\x") ? raw.slice(2) : raw;
    password = decryptSecret(Buffer.from(hex, "hex"));
  }

  return {
    host: tenant.smtp_host,
    port: tenant.smtp_port ?? 587,
    security: (tenant.smtp_security as TenantSmtpConfig["security"]) ?? "starttls",
    user: tenant.smtp_user,
    password,
    fromName: tenant.smtp_from_name,
    fromAddress: tenant.smtp_from_address,
  };
}

function buildTransport(config: TenantSmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.security === "tls",
    ignoreTLS: config.security === "none",
    auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
  });
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends an email through the tenant's own SMTP (F9-R10). Throws on failure;
 * callers decide whether to surface or swallow (send failures must never
 * block the primary action, e.g. approving a request).
 */
export async function sendTenantEmail(
  tenantId: string,
  input: SendEmailInput
): Promise<void> {
  const config = await getTenantSmtpConfig(tenantId);
  if (!config) {
    throw new Error("Tenant has no SMTP configuration");
  }

  const transport = buildTransport(config);
  const from = config.fromName
    ? `"${config.fromName}" <${config.fromAddress}>`
    : config.fromAddress;

  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

/** F9-R10: "Skicka testmejl" — sends a test email using a given (possibly
 * unsaved) config, so admins can verify before saving. */
export async function sendTestEmail(
  config: TenantSmtpConfig,
  to: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transport = buildTransport(config);
    const from = config.fromName
      ? `"${config.fromName}" <${config.fromAddress}>`
      : config.fromAddress;
    await transport.sendMail({
      from,
      to,
      subject: "Testmejl från Gåsasteget",
      html: "<p>Det här är ett testmejl. SMTP-inställningarna fungerar.</p>",
      text: "Det här är ett testmejl. SMTP-inställningarna fungerar.",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Okänt fel" };
  }
}
