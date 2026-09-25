"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/permissions";
import {
  saveSmtpSettingsForTenant,
  sendSmtpTestEmailForTenant,
  saveDansSeSettingsForTenant,
  syncDansSeNowForTenant,
} from "@/lib/tenant-settings/save";

async function loadTenantId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
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
