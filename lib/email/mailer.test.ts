import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSendMail, mockCreateTransport, mockSingle } = vi.hoisted(() => ({
  mockSendMail: vi.fn(async () => ({})),
  mockCreateTransport: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
    })),
  })),
}));

process.env.SMTP_ENC_KEY = Buffer.alloc(32, 3).toString("base64");

import { encryptSecret } from "./crypto";
import { sendTenantEmail, getTenantSmtpConfig } from "./mailer";

describe("getTenantSmtpConfig / sendTenantEmail (F9-R10/R11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  it("returns null when tenant has no smtp_host configured", async () => {
    mockSingle.mockResolvedValue({ data: { smtp_host: null }, error: null });
    const config = await getTenantSmtpConfig("tenant-1");
    expect(config).toBeNull();
  });

  it("decrypts the stored password before building the transport", async () => {
    const enc = encryptSecret("hunter2");
    mockSingle.mockResolvedValue({
      data: {
        smtp_host: "127.0.0.1",
        smtp_port: 54325,
        smtp_security: "none",
        smtp_user: "user",
        smtp_password_enc: "\\x" + enc.toString("hex"),
        smtp_from_name: "Gåsasteget",
        smtp_from_address: "no-reply@example.com",
      },
      error: null,
    });

    const config = await getTenantSmtpConfig("tenant-1");
    expect(config?.password).toBe("hunter2");
  });

  it("sends mail via nodemailer using the tenant's from address", async () => {
    mockSingle.mockResolvedValue({
      data: {
        smtp_host: "127.0.0.1",
        smtp_port: 54325,
        smtp_security: "none",
        smtp_user: null,
        smtp_password_enc: null,
        smtp_from_name: "Gåsasteget",
        smtp_from_address: "no-reply@example.com",
      },
      error: null,
    });

    await sendTenantEmail("tenant-1", {
      to: "user@example.com",
      subject: "Hej",
      html: "<p>Hej</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Gåsasteget" <no-reply@example.com>',
        to: "user@example.com",
        subject: "Hej",
      })
    );
  });

  it("throws when the tenant has no SMTP configuration", async () => {
    mockSingle.mockResolvedValue({ data: { smtp_host: null }, error: null });
    await expect(
      sendTenantEmail("tenant-1", { to: "a@b.com", subject: "x", html: "x" })
    ).rejects.toThrow();
  });
});
