import { generateHotp } from "./hotp.ts";

/**
 * Generates a time-based one-time password (TOTP) from a key and a point in
 * time, as defined in RFC 6238.
 *
 * The counter for the underlying HOTP is derived from the time step: with
 * `t0` as the epoch and `t` the timestamp, it is
 * `Math.floor((t - t0) / 30000)` — 30 second steps.
 *
 * @param key A secret key used to generate the TOTP. Can be a string in
 * base32 encoding or a `Uint8Array`.
 * @param t0 The initial time to use for the counter, as a Unix timestamp in
 * milliseconds. Defaults to `0`.
 * @param t The time to generate the password for, as a Unix timestamp in
 * milliseconds. Defaults to `Date.now()`.
 * @returns A 6-digit TOTP value.
 *
 * @example
 * ```ts
 * import { generateTotp } from "@stdext/crypto/totp";
 * import { assertEquals } from "@std/assert";
 *
 * // Same key and time always produce the same value.
 * assertEquals(await generateTotp("OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP", 0, 1704067200000), "342743");
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6238 | RFC 6238: TOTP Algorithm}
 */
export function generateTotp(
  key: string | Uint8Array,
  t0: number = 0,
  t: number = Date.now(),
): Promise<string> {
  const counter = Math.floor((t - t0) / 30000);
  return generateHotp(key, counter);
}

/**
 * Verifies a time-based one-time password (TOTP) from a key and a point in
 * time.
 *
 * The comparison is string-based and rejects mismatches (including
 * different lengths). For rate-limiting against brute force, callers
 * should throttle repeated failures and allow for clock drift (e.g. by
 * accepting the value for the previous and next time steps).
 *
 * @param otp The one-time password to verify.
 * @param key A secret key used to generate the TOTP. Can be a string in
 * base32 encoding or a `Uint8Array`.
 * @param t0 The initial time to use for the counter, as a Unix timestamp in
 * milliseconds. Defaults to `0`.
 * @param t The time the password was generated for, as a Unix timestamp in
 * milliseconds. Defaults to `Date.now()`.
 * @returns `true` if the password matches, `false` otherwise.
 *
 * @example
 * ```ts
 * import { verifyTotp } from "@stdext/crypto/totp";
 * import { assert, assertFalse } from "@std/assert";
 *
 * const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";
 * const t = 1704067200000;
 *
 * assert(await verifyTotp("342743", secret, 0, t));
 * assertFalse(await verifyTotp("000000", secret, 0, t));
 * ```
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6238 | RFC 6238: TOTP Algorithm}
 */
export async function verifyTotp(
  otp: string,
  key: string | Uint8Array,
  t0: number = 0,
  t: number = Date.now(),
): Promise<boolean> {
  return otp === await generateTotp(key, t0, t);
}
