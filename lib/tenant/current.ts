import { headers } from "next/headers";

export interface CurrentTenant {
  id: string;
  slug: string;
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
