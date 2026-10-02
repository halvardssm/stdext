/**
 * Bcrypt password hashing, backed by WebAssembly.
 *
 * This module re-exports the generated wasm bindings; the public surface
 * is {@linkcode hash} and {@linkcode verify}, taking and returning PHC
 * strings. Prefer the algorithm-agnostic versions in
 * `@stdext/crypto/hash` unless you need bcrypt-specific options.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash/bcrypt";
 * import { assert } from "@std/assert";
 *
 * const h = hash("password", {});
 * assert(verify("password", h, {}));
 * ```
 *
 * @module
 */

export * from "../_wasm/crypto_hash_bcrypt.mjs";
