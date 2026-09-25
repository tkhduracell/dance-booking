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

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect: ${url}`);
  }),
}));

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mockCookieSet })),
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
  setTenantActive,
  openTenantAsAdmin,
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
      throw new Error("redirect: /");
    });
    await expect(listTenantMembers("nsw")).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for approveRequest", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /");
    });
    await expect(approveRequest("nsw", "req-1", "admin")).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for setAdminMembership", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /");
    });
    await expect(
      setAdminMembership("nsw", "user-1", "tenant-1", true)
    ).rejects.toThrow();
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller for inviteAdminByEmail", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /");
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

describe("F9-R12 go-live gate (setTenantActive)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSuperAdmin.mockImplementation(async () => {});
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "platform_audit_log") {
        return { insert: vi.fn(async () => ({ error: null })) };
      }
      throw new Error(`unexpected admin table ${table}`);
    });
  });

  it("rejects activation when the SMTP test has not succeeded", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "tenants") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: "tenant-1", smtp_test_ok: false } }),
            }),
          }),
        };
      }
      throw new Error(`unexpected server table ${table}`);
    });

    const result = await setTenantActive("nsw", true);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/SMTP/);
  });

  it("activates a tenant whose SMTP test succeeded, and writes an audit row", async () => {
    const mockUpdate = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "tenants") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: "tenant-1", smtp_test_ok: true } }),
            }),
          }),
          update: mockUpdate,
        };
      }
      throw new Error(`unexpected server table ${table}`);
    });

    const insertAudit = vi.fn(async () => ({ error: null }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "platform_audit_log") return { insert: insertAudit };
      throw new Error(`unexpected admin table ${table}`);
    });

    const result = await setTenantActive("nsw", true);
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith({ active: true });
    expect(insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "tenant-1", action: "activate_tenant" })
    );
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /");
    });
    await expect(setTenantActive("nsw", true)).rejects.toThrow();
  });
});

describe("F9-R3 openTenantAsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSuperAdmin.mockImplementation(async () => {});
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "tenants") return tenantsSelectSingle("tenant-1");
      throw new Error(`unexpected server table ${table}`);
    });
  });

  it("sets the tenant cookie, writes an audit row, and redirects to /admin", async () => {
    const insertAudit = vi.fn(async () => ({ error: null }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "platform_audit_log") return { insert: insertAudit };
      throw new Error(`unexpected admin table ${table}`);
    });

    await expect(openTenantAsAdmin("nsw")).rejects.toThrow("redirect: /admin");

    expect(mockCookieSet).toHaveBeenCalledWith(
      "tenant",
      "nsw",
      expect.objectContaining({ path: "/" })
    );
    expect(insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "tenant-1", action: "open_as_admin" })
    );
  });

  it("requireSuperAdmin guard rejects a non-super-admin caller", async () => {
    mockRequireSuperAdmin.mockImplementation(async () => {
      throw new Error("redirect: /");
    });
    await expect(openTenantAsAdmin("nsw")).rejects.toThrow();
  });
});
