import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockGetCurrentUser,
  mockGetCurrentTenant,
  mockRpc,
  mockSendTenantEmail,
  mockGetUserById,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetCurrentTenant: vi.fn(async () => ({ id: "tenant-1", slug: "gasasteget" })),
  mockRpc: vi.fn(),
  mockSendTenantEmail: vi.fn(async () => {}),
  mockGetUserById: vi.fn(async () => ({ data: { user: { email: "owner@example.se" } } })),
}));

vi.mock("@/lib/auth/permissions", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: mockGetCurrentTenant,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/email/mailer", () => ({
  sendTenantEmail: mockSendTenantEmail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    room_id: "room-1",
    category_id: "cat-1",
    title: "Träning",
    starts_at: "2026-10-01T18:00:00.000Z",
    ends_at: "2026-10-01T19:00:00.000Z",
    booked_by: "owner-1",
    status: "confirmed",
    ...overrides,
  };
}

function buildSupabaseMock(opts: {
  existingBooking?: ReturnType<typeof bookingRow> | null;
  rpcError?: { message: string } | null;
  tenantName?: string;
}) {
  return {
    rpc: mockRpc.mockImplementation(async () => ({ error: opts.rpcError ?? null })),
    from: vi.fn((table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: opts.existingBooking ?? null }),
              }),
            }),
          }),
        };
      }
      if (table === "tenants") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: opts.tenantName ?? "Gåsasteget" } }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("updateBooking (F4-R6 / F4-R11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls update_booking_with_log RPC (atomic write+log)", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "owner-1", roles: ["booker"], permissions: [] });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({ existingBooking: bookingRow() })
      ),
    }));
    const { updateBooking } = await import("./dashboard-actions");

    const result = await updateBooking("booking-1", {
      roomId: "room-2",
      categoryId: "cat-1",
      title: "Träning",
      startsAt: "2026-10-02T18:00:00.000Z",
      endsAt: "2026-10-02T19:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "update_booking_with_log",
      expect.objectContaining({ p_booking_id: "booking-1", p_actor_id: "owner-1" })
    );
    // Actor is the owner themselves -> no email sent.
    expect(mockSendTenantEmail).not.toHaveBeenCalled();
  });

  it("emails the owner when an admin moves someone else's booking", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "admin-1", roles: ["admin"], permissions: [] });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({ existingBooking: bookingRow({ booked_by: "owner-1" }) })
      ),
    }));
    const { updateBooking } = await import("./dashboard-actions");

    const result = await updateBooking("booking-1", {
      roomId: "room-2",
      categoryId: "cat-1",
      title: "Träning",
      startsAt: "2026-10-02T18:00:00.000Z",
      endsAt: "2026-10-02T19:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    expect(mockSendTenantEmail).toHaveBeenCalledTimes(1);
    expect(mockSendTenantEmail).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ to: "owner@example.se" })
    );
  });

  it("does not email when the actor is the owner themselves", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "owner-1", roles: ["booker"], permissions: [] });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({ existingBooking: bookingRow({ booked_by: "owner-1" }) })
      ),
    }));
    const { updateBooking } = await import("./dashboard-actions");

    await updateBooking("booking-1", {
      roomId: "room-2",
      categoryId: "cat-1",
      title: "Träning",
      startsAt: "2026-10-02T18:00:00.000Z",
      endsAt: "2026-10-02T19:00:00.000Z",
    });

    expect(mockSendTenantEmail).not.toHaveBeenCalled();
  });
});

describe("cancelBooking (F4-R6 / F4-R11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls cancel_booking_with_log RPC and emails owner when admin cancels", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "admin-1", roles: ["admin"], permissions: [] });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () =>
        buildSupabaseMock({ existingBooking: bookingRow({ booked_by: "owner-1" }) })
      ),
    }));
    const { cancelBooking } = await import("./dashboard-actions");

    const result = await cancelBooking("booking-1");

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "cancel_booking_with_log",
      expect.objectContaining({ p_booking_id: "booking-1", p_actor_id: "admin-1" })
    );
    expect(mockSendTenantEmail).toHaveBeenCalledTimes(1);
  });
});
