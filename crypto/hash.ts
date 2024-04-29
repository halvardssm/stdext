/**
 * Utilities for data hashing.
 * @module
 *
 * ```ts
 * const hasher = new PasswordHash();
 * const hash = hasher.hash("password");
 * hasher.verify("password", hash));
 * ```
 */

export { Argon2 } from "./hash/argon2.ts";
