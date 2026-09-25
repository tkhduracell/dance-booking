import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockRequireSuperAdmin, mockSingle, mockInsertDomain } = vi.hoisted(() => ({
  mockRequireSuperAdmin: vi.fn(async () => {}),
  mockSingle: vi.fn(),
  mockInsertDomain: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireSuperAdmin: mockRequireSuperAdmin,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === "tenants") {
        return {
          insert: () => ({
            select: () => ({ single: mockSingle }),
          }),
        };
      }
      if (table === "tenant_domains") {
        return { insert: mockInsertDomain };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  })),
}));

import { createTenant } from "./actions";

describe("createTenant (F9-R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a missing name", async () => {
    const formData = new FormData();
    formData.set("slug", "nsw");
    const result = await createTenant(formData);
    expect(result.error).toBeDefined();
  });

  it("rejects an invalid slug", async () => {
    const formData = new FormData();
    formData.set("name", "Nackswinget");
    formData.set("slug", "Not Valid!");
    const result = await createTenant(formData);
    expect(result.error).toBeDefined();
  });

  it("creates a tenant with a valid name/slug and optional domain", async () => {
    mockSingle.mockResolvedValue({ data: { id: "tenant-1" }, error: null });
    mockInsertDomain.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set("name", "Nackswinget");
    formData.set("slug", "nsw");
    formData.set("domain", "boka.nackswinget.se");

    const result = await createTenant(formData);

    expect(result.error).toBeUndefined();
    expect(mockRequireSuperAdmin).toHaveBeenCalled();
    expect(mockInsertDomain).toHaveBeenCalledWith({
      domain: "boka.nackswinget.se",
      tenant_id: "tenant-1",
    });
  });
});
