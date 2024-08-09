import { decodeBase32 } from "@std/encoding";

/** Converts a counter value to a DataView.
 *
 * @ignore
 */
export function counterToBuffer(counter: number): DataView {
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setBigUint64(0, BigInt(counter), false);
  return buffer;
}

/** Generates a HMAC-SHA1 hash of the specified key and counter.
 *
 * @ignore
 */
export async function generateHmacSha1(
  key: Uint8Array,
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

/** Truncates the HMAC value to a 6-digit HOTP value.
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

/** Generates a HMAC-based one-time password (HOTP) using the specified key and counter.
 *
 * @param key a secret key used to generate the HOTP. Can be a string in base32 encoding or a Uint8Array.
 * @param counter a counter value used to generate the HOTP.
 * @returns a 6-digit HOTP value.
 */
export async function generateHotp(
  key: string | Uint8Array,
  counter: number,
): Promise<string> {
  const parsedKey = typeof key === "string" ? decodeBase32(key) : key;
  const buffer = counterToBuffer(counter);

  const hmac = await generateHmacSha1(parsedKey, buffer);
  return truncate(hmac, 6);
}

/** Verifies a HMAC-based one-time password (HOTP) using the specified key and counter.
 *
 * @param otp the one-time password to verify.
 * @param key a secret key used to generate the HOTP. Can be a string in base32 encoding or a Uint8Array.
 * @param counter a counter value used to generate the HOTP.
 */
export async function verifyHotp(
  otp: string,
  key: string | Uint8Array,
  counter: number,
): Promise<boolean> {
  return otp === await generateHotp(key, counter);
}
