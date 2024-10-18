import { generateHotp } from "./hotp.ts";

/** Generate a TOTP value from a key and a time.
 *
 * @param key a secret key used to generate the HOTP. Can be a string in base32 encoding or a Uint8Array.
 * @param t0 the initial time to use for the counter.
 * @returns the TOTP value.
 */
export function generateTotp(
  key: string | Uint8Array,
  t0: number = 0,
  t: number = Date.now(),
): Promise<string> {
  const counter = Math.floor((t - t0) / 30000);
  return generateHotp(key, counter);
}

/** Verifies a TOTP value from a key and a time.
 *
 * @param otp the one-time password to verify.
 * @param key a secret key used to generate the HOTP. Can be a string in base32 encoding or a Uint8Array.
 * @param t0 the initial time to use for the counter.
 */
export async function verifyTotp(
  otp: string,
  key: string | Uint8Array,
  t0: number = 0,
  t: number = Date.now(),
): Promise<boolean> {
  return otp === await generateTotp(key, t0, t);
}
