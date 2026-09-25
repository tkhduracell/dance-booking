import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockRequireRole, mockRpc, mockGetUser } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(async () => {}),
  mockRpc: vi.fn(),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "admin-1" } } })),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  getCurrentUser: vi.fn(async () => ({ id: "admin-1" })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: vi.fn(async () => ({ id: "tenant-1", slug: "gasasteget" })),
}));

function buildSupabaseMock(opts: {
  adminCount?: number;
  membershipsForUser?: { roles: { name: string } }[];
  futureBookingsCount?: number;
}) {
  return {
    auth: { getUser: mockGetUser },
    rpc: mockRpc.mockImplementation(async (fn: string) => {
      if (fn === "admin_count_in_tenant") return { data: opts.adminCount ?? 0 };
      return { data: null };
    }),
    from: vi.fn((table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: opts.membershipsForUser ?? [] }),
            }),
          }),
          delete: () => ({
            eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
          }),
        };
      }
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () =>
                    Promise.resolve({ count: opts.futureBookingsCount ?? 0 }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("removeMember (F7-R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("blocks removing the tenant's last admin", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({
          adminCount: 1,
          membershipsForUser: [{ roles: { name: "admin" } }],
        })
      ),
    }));
    const { removeMember } = await import("./actions");
    const result = await removeMember("user-1");
    expect(result.error).toMatch(/sista admin/);
  });

  it("allows removing a non-last admin and reports future bookings kept", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({
          adminCount: 2,
          membershipsForUser: [{ roles: { name: "admin" } }],
          futureBookingsCount: 3,
        })
      ),
    }));
    const { removeMember } = await import("./actions");
    const result = await removeMember("user-1");
    expect(result.error).toBeUndefined();
    expect(result.futureBookings).toBe(3);
    expect(result.message).toMatch(/3 kommande/);
  });

  it("allows removing a non-admin member regardless of admin count", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({
          adminCount: 1,
          membershipsForUser: [{ roles: { name: "booker" } }],
          futureBookingsCount: 0,
        })
      ),
    }));
    const { removeMember } = await import("./actions");
    const result = await removeMember("user-2");
    expect(result.error).toBeUndefined();
  });
});
