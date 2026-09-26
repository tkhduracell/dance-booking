import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface CurrentTenant {
  id: string;
  slug: string;
}

/** F9-R6: URL for the tenant's logo, served via app/logo/[slug]/route.ts from
 * DB-stored bytes. Cache-busted with updated_at so a re-upload shows
 * immediately. Returns null if unset. */
export async function getTenantLogoUrl(tenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("slug, logo_mime, logo_updated_at")
    .eq("id", tenantId)
    .single();
  if (!data?.logo_mime) return null;

  const v = data.logo_updated_at ? new Date(data.logo_updated_at).getTime() : Date.now();
  return `/logo/${data.slug}?v=${v}`;
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

/** True when the tenant came only from DEFAULT_TENANT (no domain, ?tenant= or cookie). */
export async function isTenantFallback(): Promise<boolean> {
  const h = await headers();
  return h.get("x-tenant-fallback") === "1";
}
