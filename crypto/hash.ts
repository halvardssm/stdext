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

export * from "./hash/mod.ts";
