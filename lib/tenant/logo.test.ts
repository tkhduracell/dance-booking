import { describe, expect, it } from "vitest";
import { hasValidMagicBytes, LOGO_MAX_BYTES, LOGO_MIME_EXT } from "./logo";

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_SIG = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

describe("hasValidMagicBytes", () => {
  it("accepts a real PNG signature", () => {
    expect(hasValidMagicBytes(new Uint8Array(PNG_SIG), "image/png")).toBe(true);
  });

  it("accepts a real WebP (RIFF/WEBP) signature", () => {
    expect(hasValidMagicBytes(new Uint8Array(WEBP_SIG), "image/webp")).toBe(true);
  });

  it("rejects bytes that don't match the declared PNG mime", () => {
    expect(hasValidMagicBytes(new Uint8Array(WEBP_SIG), "image/png")).toBe(false);
  });

  it("rejects bytes that don't match the declared WebP mime", () => {
    expect(hasValidMagicBytes(new Uint8Array(PNG_SIG), "image/webp")).toBe(false);
  });

  it("rejects an SVG masquerading as PNG (spoofed extension/mime, no magic bytes)", () => {
    const svg = new TextEncoder().encode("<svg onload=alert(1)>");
    expect(hasValidMagicBytes(svg, "image/png")).toBe(false);
  });

  it("rejects unsupported mime types outright", () => {
    expect(hasValidMagicBytes(new Uint8Array(PNG_SIG), "image/svg+xml")).toBe(false);
  });

  it("rejects too-short buffers", () => {
    expect(hasValidMagicBytes(new Uint8Array([0x89, 0x50]), "image/png")).toBe(false);
  });
});

describe("LOGO_MAX_BYTES / LOGO_MIME_EXT", () => {
  it("caps size at 1MB", () => {
    expect(LOGO_MAX_BYTES).toBe(1024 * 1024);
  });

  it("only allows png/webp", () => {
    expect(LOGO_MIME_EXT["image/png"]).toBe("png");
    expect(LOGO_MIME_EXT["image/webp"]).toBe("webp");
    expect(LOGO_MIME_EXT["image/svg+xml"]).toBeUndefined();
  });
});
