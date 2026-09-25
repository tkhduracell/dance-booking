import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto";

describe("SMTP secret encryption (F9-R11)", () => {
  beforeAll(() => {
    process.env.SMTP_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("round-trips a plaintext password", () => {
    const enc = encryptSecret("s3cret-pass");
    expect(decryptSecret(enc)).toBe("s3cret-pass");
  });

  it("produces different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a.equals(b)).toBe(false);
  });

  it("throws if SMTP_ENC_KEY is missing", () => {
    const prev = process.env.SMTP_ENC_KEY;
    delete process.env.SMTP_ENC_KEY;
    expect(() => encryptSecret("x")).toThrow();
    process.env.SMTP_ENC_KEY = prev;
  });
});
