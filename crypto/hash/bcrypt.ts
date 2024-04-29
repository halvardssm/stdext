import { PasswordHash } from "./shared.ts";
import {
  instantiate,
  type StdextBcrypt,
  type StdextBcryptOptions,
} from "./_wasm/lib/deno_stdext_crypto_hash_wasm_bcrypt.generated.mjs";

const bcrypt = instantiate();

/**
 * Bcrypt options
 */
export type BcryptOptions = StdextBcryptOptions;

/**
 * Bcrypt password hashing
 *
 * ```
 * const hasher = new PasswordHash();
 * const hash = hasher.hash("password");
 * hasher.verify("password", hash));
 * ```
 */
export class Bcrypt implements PasswordHash {
  #hasher: StdextBcrypt;
  constructor(options: BcryptOptions = {}) {
    this.#hasher = new bcrypt.StdextBcrypt(options);
  }

  hash(password: string): string {
    return this.#hasher.hash(password);
  }
  verify(password: string, hash: string): boolean {
    return this.#hasher.verify(password, hash);
  }
}
