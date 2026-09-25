import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdateEq = vi.fn();

function buildSupabaseMock() {
  return {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table !== "access_requests") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
        insert: mockInsert,
        update: () => ({
          eq: () => ({
            eq: () => ({ eq: mockUpdateEq }),
          }),
        }),
      };
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: vi.fn(async () => ({ id: "tenant-1", slug: "gasasteget" })),
}));

import { ensureAccessRequest, updateAccessRequestDetails } from "./actions";

describe("ensureAccessRequest (F3-R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "anna@example.se",
          app_metadata: { provider: "google" },
          user_metadata: { full_name: "Anna Andersson" },
        },
      },
    });
  });

  it("creates a pending request when none exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: null });

    await ensureAccessRequest();

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        user_id: "user-1",
        name: "Anna Andersson",
        email: "anna@example.se",
        provider: "google",
      })
    );
  });

  it("does not create a second pending request (idempotent)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "existing" } });

    await ensureAccessRequest();

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("updateAccessRequestDetails (F3-R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "anna@example.se" } },
    });
  });

  it("rejects an invalid community role", async () => {
    const formData = new FormData();
    formData.set("communityRole", "Not a real role");

    const result = await updateAccessRequestDetails("req-1", formData);

    expect(result.error).toBeDefined();
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("saves a valid role and message", async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    const formData = new FormData();
    formData.set("communityRole", "Funktionär");
    formData.set("message", "Ser fram emot att börja!");

    const result = await updateAccessRequestDetails("req-1", formData);

    expect(result.error).toBeUndefined();
    expect(mockUpdateEq).toHaveBeenCalled();
  });
});
