/** F9-R6: tenant logo validation shared by the upload action and its tests.
 * PNG/WebP only — SVG deliberately unsupported (stored-XSS risk via inline
 * <script>/on* attrs) — ≤1MB, magic-byte-verified (not just declared MIME). */

export const LOGO_MAX_BYTES = 1024 * 1024;

export const LOGO_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
};

/** Verify the file's magic bytes match its declared MIME type. `file.type`
 * alone is client-supplied and not trustworthy. */
export function hasValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/png") {
    const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return PNG_SIG.every((b, i) => bytes[i] === b);
  }
  if (mimeType === "image/webp") {
    // "RIFF" .... "WEBP"
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}
