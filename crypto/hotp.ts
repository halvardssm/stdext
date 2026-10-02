import { decodeBase32 } from "@std/encoding";

/**
 * Converts a counter value to a big-endian byte buffer.
 *
 * @ignore
 */
export function counterToBuffer(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false);
  return new Uint8Array(buffer);
}

/**
 * Generates an HMAC-SHA1 hash of the key and data.
 *
 * @ignore
 */
export async function generateHmacSha1(
  key: BufferSource,
  data: BufferSource,
): Promise<Uint8Array> {
  const importedKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signedData = await crypto.subtle.sign(
    "HMAC",
    importedKey,
    data,
  );

  return new Uint8Array(signedData);
}

/**
 * Truncates an HMAC-SHA1 value to a numeric one-time password of the given
 * length, zero-padded, using the dynamic truncation of RFC 4226.
 *
 * @ignore
 */
export function truncate(value: Uint8Array, length: number): string {
  const offset = value[19] & 0xf;
  const code = (value[offset] & 0x7f) << 24 |
    (value[offset + 1] & 0xff) << 16 |
    (value[offset + 2] & 0xff) << 8 |
    (value[offset + 3] & 0xff);
  const digits = code % Math.pow(10, length);
  return digits.toString().padStart(length, "0");
}

/**
 * Generates a HMAC-based one-time password (HOTP) using the specified key
 * and counter, as defined in RFC 4226.
 *
 * @param key A secret key used to generate the HOTP. Can be a string in
 * base32 encoding or a `Uint8Array`.
 * @param counter A counter value used to generate the HOTP. Both sides
 * must agree on it; it should increment with each use.
 * @returns A 6-digit HOTP value.
 *
 * @example
 * ```ts
 * import { generateHotp } from "@stdext/crypto/hotp";
 * import { assertEquals } from "@std/assert";
 *
 * // Same key and counter always produce the same value.
 * assertEquals(await generateHotp("OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP", 0), "187492");
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4226 | RFC 4226: HOTP Algorithm}
 */
export async function generateHotp(
  key: string | Uint8Array,
  counter: number,
): Promise<string> {
  const parsedKey = typeof key === "string" ? decodeBase32(key) : key;
  const buffer = counterToBuffer(counter);

  const hmac = await generateHmacSha1(
    new Uint8Array(
      parsedKey.buffer as ArrayBuffer,
      parsedKey.byteOffset,
      parsedKey.byteLength,
    ) as BufferSource,
    buffer as BufferSource,
  );
  return truncate(hmac, 6);
}

/**
 * Verifies a HMAC-based one-time password (HOTP) using the specified key
 * and counter.
 *
 * The comparison is string-based and rejects mismatches (including
 * different lengths). For rate-limiting against brute force, callers
 * should throttle repeated failures.
 *
 * @param otp The one-time password to verify.
 * @param key A secret key used to generate the HOTP. Can be a string in
 * base32 encoding or a `Uint8Array`.
 * @param counter The counter value the password was generated with.
 * @returns `true` if the password matches, `false` otherwise.
 *
 * @example
 * ```ts
 * import { verifyHotp } from "@stdext/crypto/hotp";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(await verifyHotp("187492", "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP", 0));
 * assertFalse(await verifyHotp("000000", "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP", 0));
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4226 | RFC 4226: HOTP Algorithm}
 */
export async function verifyHotp(
  otp: string,
  key: string | Uint8Array,
  counter: number,
): Promise<boolean> {
  return otp === await generateHotp(key, counter);
}
