import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTenant } from "@/lib/dans-se/sync";

export const dynamic = "force-dynamic";

/** F5-R1: Vercel cron, daily (Vercel Hobby limit), syncs all tenants with a
 * dans.se org + token configured. Protected by CRON_SECRET. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id")
    .not("dans_se_org", "is", null)
    .not("dans_se_token_enc", "is", null);

  const results = [];
  for (const tenant of tenants ?? []) {
    const result = await syncTenant(tenant.id);
    results.push({ tenantId: tenant.id, ...result });
  }

  return NextResponse.json({ synced: results.length, results });
}
