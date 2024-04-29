import { PasswordHash } from "./shared.ts";
import {
  instantiate,
  type StdextArgon2,
  type StdextArgon2Options,
} from "./_wasm/lib/deno_stdext_crypto_hash_wasm_argon2.generated.mjs";

const argon2 = instantiate();

/**
 * Argon2 options
 */
export type Argon2Options = StdextArgon2Options;

/**
 * Argon2 password hashing
 *
 * ```
 * const hasher = new PasswordHash();
 * const hash = hasher.hash("password");
 * hasher.verify("password", hash));
 * ```
 */
export class Argon2 implements PasswordHash {
  #hasher: StdextArgon2;
  constructor(options: Argon2Options = {}) {
    this.#hasher = new argon2.StdextArgon2(options);
  }

  hash(password: string): string {
    return this.#hasher.hash(password);
  }
  verify(password: string, hash: string): boolean {
    return this.#hasher.verify(password, hash);
  }
}
