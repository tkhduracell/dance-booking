import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface CurrentTenant {
  id: string;
  slug: string;
}

/** F9-R6: public URL for the tenant's uploaded logo, or null if unset. */
export async function getTenantLogoUrl(tenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("logo_path").eq("id", tenantId).single();
  if (!data?.logo_path) return null;

  const { data: pub } = supabase.storage.from("tenant-logos").getPublicUrl(data.logo_path);
  return pub.publicUrl;
}

/**
 * Read the tenant resolved by middleware (lib/supabase/middleware.ts) for the
 * current request. Returns null if no tenant could be resolved (unknown host,
 * no DEFAULT_TENANT, no ?tenant=) — callers should show the 404 page (F0-R4).
 */
export async function getCurrentTenant(): Promise<CurrentTenant | null> {
  const h = await headers();
  const id = h.get("x-tenant-id");
  const slug = h.get("x-tenant-slug");
  if (!id || !slug) return null;
  return { id, slug };
}
