/**
 * Utilities for data hashing.
 *
 * `hash` and `verify` functions are provided to hash and verify data using the specified algorithm.
 * The algorithm can be specified using the name of the algorithm or the algorithm object,
 * similar to the SubtleCrypto interfaces. The algorithm object allows to specify aditional algorithm options, and if not provided will use the default values.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash";
 * const h = hash("argon2", "password");
 * verify("argon2", "password", h);
 *
 * // OR
 *
 * import { hash, verify, AlgorithmName } from "@stdext/crypto/hash";
 * const h = hash(AlgorithmName.Argon2, "password");
 * verify(AlgorithmName.Argon2, "password", h);
 *
 * // OR
 *
 * import { hash, verify } from "@stdext/crypto/hash";
 * const h = hash({ name: "argon2", algorithm: "argon2i" }, "password");
 * verify({ name: AlgorithmName.Argon2, algorithm: "argon2i" }, "password", h);
 * ```
 *
 * @module
 */

import { argon2, bcrypt } from "./hash/mod.ts";

/**
 * The names of the hashing algorithms supported by this module.
 */
export const AlgorithmName = {
  Argon2: "argon2",
  Bcrypt: "bcrypt",
} as const;
export type AlgorithmName = typeof AlgorithmName[keyof typeof AlgorithmName];

/**
 * Hashing algorithms supported by this module with their options.
 */
export type Algorithm =
  | ({
    name: typeof AlgorithmName.Argon2;
  } & argon2.Argon2Options)
  | ({
    name: typeof AlgorithmName.Bcrypt;
  } & bcrypt.BcryptOptions);

/**
 * Allows to specify the hashing algorithm and its options, or just the algorithm name.
 */
export type AlgorithmIdentifier = Algorithm["name"] | Algorithm;

/**
 * Converts the algorithm identifier to the algorithm object.
 */
function getAlgorithm(algorithm: AlgorithmIdentifier): Algorithm {
  if (typeof algorithm === "string") {
    return { name: algorithm };
  } else {
    return algorithm;
  }
}

/**
 * Hashes the data using the specified algorithm.
 *
 * Using the name of the algorithm only, will use the default options.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash";
 * const h = hash({ name: "argon2", algorithm: "argon2i" }, "password")
 * verify({ name: "argon2", algorithm: "argon2i" }, "password", h);
 * ```
 */
export function hash(algorithm: AlgorithmIdentifier, data: string): string {
  const algo = getAlgorithm(algorithm);

  switch (algo.name) {
    case AlgorithmName.Argon2:
      return argon2.hash(data, algo);
    case AlgorithmName.Bcrypt:
      return bcrypt.hash(data, algo);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

/**
 * Verifies the hash against the data using the specified algorithm.
 *
 * Using the name of the algorithm only, will use the default options.
 *
 * ```ts
 * import { hash, verify } from "@stdext/crypto/hash";
 * const h = hash({ name: "argon2", algorithm: "argon2i" }, "password")
 * verify({ name: "argon2", algorithm: "argon2i" }, "password", h);
 * ```
 */
export function verify(
  algorithm: AlgorithmIdentifier,
  data: string,
  hash: string,
): boolean {
  const algo = getAlgorithm(algorithm);

  switch (algo.name) {
    case AlgorithmName.Argon2: {
      return argon2.verify(data, hash, algo);
    }
    case AlgorithmName.Bcrypt:
      return bcrypt.verify(data, hash, algo);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}
