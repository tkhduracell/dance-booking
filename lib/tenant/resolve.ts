import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
}

const TENANT_COOKIE = "tenant";

/**
 * Resolve the current tenant slug from a request (F0-R2/R3).
 * Priority: registered Host domain > ?tenant= query param > tenant cookie > DEFAULT_TENANT env.
 * `?tenant=` is ignored when the host IS a registered custom domain (handled by caller
 * only consulting domainTenantSlug when set).
 */
export function resolveTenantSlug(params: {
  host: string | null;
  domainTenantSlug: string | null;
  queryTenant: string | null;
  cookieTenant: string | null;
  defaultTenant?: string | null;
}): string | null {
  const { domainTenantSlug, queryTenant, cookieTenant, defaultTenant } = params;

  if (domainTenantSlug) return domainTenantSlug;
  if (queryTenant) return queryTenant;
  if (cookieTenant) return cookieTenant;
  if (defaultTenant) return defaultTenant;
  return null;
}

/** Look up a tenant_domains row for the given host. Returns null if not registered. */
export async function findTenantByDomain(
  supabase: SupabaseClient,
  host: string
): Promise<ResolvedTenant | null> {
  const { data } = await supabase
    .from("tenant_domains")
    .select("tenant:tenant_id(id, slug, name)")
    .eq("domain", host)
    .maybeSingle();

  const tenant = (data?.tenant ?? null) as ResolvedTenant | ResolvedTenant[] | null;
  if (!tenant) return null;
  return Array.isArray(tenant) ? tenant[0] ?? null : tenant;
}

/** Look up a tenant by slug. Returns null if unknown or inactive. */
export async function findTenantBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ResolvedTenant | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return (data as ResolvedTenant | null) ?? null;
}

export { TENANT_COOKIE };
