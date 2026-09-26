import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** F9-R6: serve a tenant's logo bytes straight from the DB. Public (logos
 * are meant to be shown on public auth pages), no auth required. Uses the
 * service-role client since RLS on tenants doesn't need to grant anonymous
 * read access to logo_data. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tenants")
    .select("logo_data, logo_mime, logo_updated_at")
    .eq("slug", slug)
    .single();

  if (!data?.logo_data || !data.logo_mime) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes =
    typeof data.logo_data === "string"
      ? Buffer.from(data.logo_data.replace(/^\\x/, ""), "hex")
      : Buffer.from(data.logo_data as unknown as ArrayBuffer);

  const etag = `"${data.logo_updated_at ?? "0"}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": data.logo_mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
