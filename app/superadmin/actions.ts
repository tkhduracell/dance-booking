"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/permissions";

const SLUG_RE = /^[a-z0-9-]+$/;

/** F9-R2: create a tenant (name, slug, first domain). */
export async function createTenant(
  formData: FormData
): Promise<{ error?: string }> {
  await requireSuperAdmin();

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const slug = (formData.get("slug") as string | null)?.trim().toLowerCase() ?? "";
  const domain = (formData.get("domain") as string | null)?.trim().toLowerCase() ?? "";

  if (!name) return { error: "Namn krävs." };
  if (!slug || !SLUG_RE.test(slug)) {
    return { error: "Ogiltig slug (endast a-z, 0-9, -)." };
  }

  const supabase = await createClient();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select("id")
    .single();

  if (tenantError) return { error: tenantError.message };

  if (domain) {
    const { error: domainError } = await supabase
      .from("tenant_domains")
      .insert({ domain, tenant_id: tenant.id });
    if (domainError) return { error: domainError.message };
  }

  revalidatePath("/superadmin");
  return {};
}
