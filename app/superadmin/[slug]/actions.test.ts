import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockRequireSuperAdmin,
  mockAdminFrom,
  mockServerFrom,
  mockGetUser,
} = vi.hoisted(() => ({
  mockRequireSuperAdmin: vi.fn(async () => {}),
  mockAdminFrom: vi.fn(),
  mockServerFrom: vi.fn(),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "actor-1", email: "actor@example.com" } } })),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireSuperAdmin: mockRequireSuperAdmin,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/mailer", () => ({
  sendTenantEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        generateLink: vi.fn(async () => ({ data: null, error: { message: "no user" } })),
        createUser: vi.fn(async () => ({ data: null, error: null })),
        getUserById: vi.fn(async () => ({ data: { user: null } })),
      },
    },
  })),
}));

import {
  approveRequest,
  setAdminMembership,
  inviteAdminByEmail,
  listTenantMembers,
} from "./actions";

function tenantsSelectSingle(id: string | null) {
  return {
    select: () => ({
      eq: () => ({ single: async () => ({ data: id ? { id } : null }) }),
    }),
  };
}

describe("F9-R13 superadmin members actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSuperAdmin.mockImplementation(async () => {});
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "tenants") return tenantsSelectSingle("tenant-1");
      throw new Error(`unexpected server table ${table}`);
    });
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for listTenantMembers", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /dashboard");
    });
    await expect(listTenantMembers("nsw")).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for approveRequest", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /dashboard");
    });
    await expect(approveRequest("nsw", "req-1", "admin")).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for setAdminMembership", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /dashboard");
    });
    await expect(
      setAdminMembership("nsw", "user-1", "tenant-1", true)
    ).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for inviteAdminByEmail", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /dashboard");
    });
    await expect(
      inviteAdminByEmail("nsw", "a@b.com", "tenant-1")
    ).rejects.toThrow();
  });

  it("inviteAdminByEmail rejects an invalid email format", async () => {
    const result = await inviteAdminByEmail("nsw", "not-an-email", "tenant-1");
    expect(result.error).toBeDefined();
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("setAdminMembership rejects revoking the tenant's last admin", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "roles") {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { id: "admin-role" } }) }),
          }),
        };
      }
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ count: 1 }),
            }),
          }),
        };
      }
      throw new Error(`unexpected admin table ${table}`);
    });

    const result = await setAdminMembership("nsw", "user-1", "tenant-1", false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/sista admin/);
  });
});
