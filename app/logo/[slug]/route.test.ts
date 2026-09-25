import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSingle } = vi.hoisted(() => ({ mockSingle: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
    })),
  })),
}));

import { GET } from "./route";

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:4000/logo/gasasteget", { headers });
}

describe("GET /logo/[slug] (F9-R6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the tenant has no logo", async () => {
    mockSingle.mockResolvedValue({ data: { logo_data: null, logo_mime: null }, error: null });
    const res = await GET(makeReq(), { params: Promise.resolve({ slug: "gasasteget" }) });
    expect(res.status).toBe(404);
  });

  it("serves the bytes with the correct Content-Type and security headers", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    mockSingle.mockResolvedValue({
      data: {
        logo_data: "\\x" + pngBytes.toString("hex"),
        logo_mime: "image/png",
        logo_updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ slug: "gasasteget" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toContain("max-age");
    expect(res.headers.get("ETag")).toBeTruthy();

    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(pngBytes)).toBe(true);
  });

  it("returns 304 when If-None-Match matches the current ETag", async () => {
    mockSingle.mockResolvedValue({
      data: {
        logo_data: "\\x89504e47",
        logo_mime: "image/png",
        logo_updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const res = await GET(makeReq({ "if-none-match": '"2026-01-01T00:00:00.000Z"' }), {
      params: Promise.resolve({ slug: "gasasteget" }),
    });
    expect(res.status).toBe(304);
  });
});
