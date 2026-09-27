import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockGetCurrentTenant, mockGenerateLink, mockSendTenantEmail, mockSingle } =
  vi.hoisted(() => ({
    mockGetCurrentTenant: vi.fn(),
    mockGenerateLink: vi.fn(),
    mockSendTenantEmail: vi.fn(async () => {}),
    mockSingle: vi.fn(),
  }));
const { mockGetSmtp, mockSignInWithOtp } = vi.hoisted(() => ({
  mockGetSmtp: vi.fn(),
  mockSignInWithOtp: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithOtp: mockSignInWithOtp } })),
}));

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: mockGetCurrentTenant,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
    })),
    auth: { admin: { generateLink: mockGenerateLink } },
  })),
}));

vi.mock("@/lib/email/mailer", () => ({
  sendTenantEmail: mockSendTenantEmail,
  getTenantSmtpConfig: mockGetSmtp,
}));

import { sendMagicLink } from "./actions";

describe("sendMagicLink (F2-R3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentTenant.mockResolvedValue({ id: "tenant-1", slug: "gasasteget" });
    mockSingle.mockResolvedValue({ data: { name: "Gåsasteget" } });
    mockGetSmtp.mockResolvedValue({ host: "smtp.example.com" });
  });

  it("falls back to Supabase's mailer when the tenant has no SMTP", async () => {
    mockGetSmtp.mockResolvedValue(null);
    const result = await sendMagicLink("user@example.com", "/admin");
    expect(result.error).toBeUndefined();
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/auth/callback?next=%2Fadmin"),
        }),
      })
    );
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await sendMagicLink("not-an-email");
    expect(result.error).toBeDefined();
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("rejects when no tenant is resolved", async () => {
    mockGetCurrentTenant.mockResolvedValue(null);
    const result = await sendMagicLink("user@example.com");
    expect(result.error).toBeDefined();
  });

  it("generates a link via the admin API and sends it through tenant SMTP", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "abc" } },
      error: null,
    });

    const result = await sendMagicLink("user@example.com");

    expect(result.error).toBeUndefined();
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: "magiclink", email: "user@example.com" })
    );
    expect(mockSendTenantEmail).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ to: "user@example.com" })
    );
  });

  it("surfaces an error when the tenant has no SMTP configured", async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "abc" } },
      error: null,
    });
    mockSendTenantEmail.mockRejectedValueOnce(new Error("no smtp"));

    const result = await sendMagicLink("user@example.com");
    expect(result.error).toBeDefined();
  });
});
