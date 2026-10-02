/**
 * Scrypt password hashing, backed by WebAssembly.
 *
 * This module re-exports the generated wasm bindings; the public surface
 * is {@linkcode hash} and {@linkcode verify}, taking and returning PHC
 * strings. Prefer the algorithm-agnostic versions in
 * `@stdext/crypto/hash` unless you need scrypt-specific options.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash/scrypt";
 * import { assert } from "@std/assert";
 *
 * const h = hash("password", {});
 * assert(verify("password", h, {}));
 * ```
 *
 * @module
 */

export * from "../_wasm/crypto_hash_scrypt.mjs";
