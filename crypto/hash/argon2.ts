/**
 * Argon2 password hashing, backed by WebAssembly.
 *
 * This module re-exports the generated wasm bindings; the public surface
 * is {@linkcode hash} and {@linkcode verify}, taking and returning PHC
 * strings. Prefer the algorithm-agnostic versions in
 * `@stdext/crypto/hash` unless you need argon2-specific options.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash/argon2";
 * import { assert } from "@std/assert";
 *
 * const h = hash("password", {});
 * assert(verify("password", h, {}));
 * ```
 *
 * @module
 */

export * from "../_wasm/crypto_hash_argon2.mjs";
