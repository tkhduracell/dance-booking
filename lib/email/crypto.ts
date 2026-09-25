import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * F9-R11: server-only AES-256-GCM encryption for SMTP passwords.
 * SMTP_ENC_KEY must be a 32-byte key, base64-encoded. Never import this
 * file from client code; never log its inputs/outputs.
 */
function getKey(): Buffer {
  const raw = process.env.SMTP_ENC_KEY;
  if (!raw) {
    throw new Error("SMTP_ENC_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SMTP_ENC_KEY must decode to 32 bytes (AES-256)");
  }
  return key;
}

/** Encrypts plaintext into a single Buffer: iv(12) || authTag(16) || ciphertext. */
export function encryptSecret(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** Decrypts a Buffer produced by encryptSecret. */
export function decryptSecret(blob: Buffer): string {
  const key = getKey();
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}
