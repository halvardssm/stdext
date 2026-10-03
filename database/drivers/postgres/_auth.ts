import { concat } from "@std/bytes/concat";
import { crypto } from "@std/crypto";

const encoder = new TextEncoder();

async function md5Hex(data: Uint8Array<ArrayBuffer>): Promise<string> {
  return new Uint8Array(await crypto.subtle.digest("MD5", data)).toHex();
}

/**
 * The password message for `md5` authentication:
 * `"md5" + md5(md5(password + user) + salt)`.
 */
export async function md5Password(
  user: string,
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const inner = await md5Hex(encoder.encode(password + user));
  return "md5" +
    await md5Hex(concat([encoder.encode(inner), salt]));
}
