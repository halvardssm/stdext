import { encodeBase32 } from "@std/encoding";

/**
 * Generates a cryptographically random secret key.
 *
 * The bytes come from {@linkcode crypto.getRandomValues}, so the result is
 * suitable for use as an HMAC key (e.g. for HOTP/TOTP).
 *
 * @param length How many bytes the secret key should be.
 * @returns A secret as a byte array.
 *
 * @example
 * ```ts
 * import { generateSecretBytes } from "@stdext/crypto/utils";
 * import { assert } from "@std/assert";
 *
 * const secret = generateSecretBytes(20);
 * assert(secret.length === 20);
 * ```
 */
export function generateSecretBytes(length: number = 20): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Generates a cryptographically random secret key in base32 encoding, as
 * used by HOTP/TOTP applications.
 *
 * At least `max(6, length)` random bytes are generated, base32-encoded
 * (padding stripped), and the last `length` characters are returned.
 *
 * Note: `@std/encoding`'s `decodeBase32` only accepts strings whose
 * length is a multiple of 8. The default length of `20` does not satisfy
 * that — use a multiple of 8, e.g. `32`, if the secret must round-trip
 * through base32 decoding (as the HOTP/TOTP generators do).
 *
 * @param length How many characters the secret key should be. Defaults
 * to `20`.
 * @returns A secret as a base32 string without padding.
 *
 * @example
 * ```ts
 * import { generateSecret } from "@stdext/crypto/utils";
 * import { generateTotp } from "@stdext/crypto/totp";
 * import { assert } from "@std/assert";
 *
 * // A length that is a multiple of 8 round-trips through base32.
 * const secret = generateSecret(32);
 * assert(secret.length === 32);
 *
 * // Use it as a TOTP key:
 * const otp = await generateTotp(secret);
 * assert(otp.length === 6);
 * ```
 */
export function generateSecret(
  length: number = 20,
): string {
  const buffer = generateSecretBytes(Math.max(6, length));

  const encoded = encodeBase32(buffer);

  return encoded.replaceAll("=", "").slice(-length);
}
