import { encodeBase32 } from "@std/encoding";

/** Generates a secret key of the specified length.
 *
 * @param length how many bytes the secret key should be.
 * @returns a secret as a byte array
 */
export function generateSecretBytes(length: number = 20): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

/** Generates a secret key of the specified length in selected encoding
 *
 * @param length how many characters the secret key should be.
 * @returns a secret string
 */
export function generateSecret(
  length: number = 20,
): string {
  const buffer = generateSecretBytes(Math.max(6, length));

  const encoded = encodeBase32(buffer);

  return encoded.replaceAll("=", "").slice(-length);
}
