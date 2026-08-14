// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * Argon2 algorithms
 */
export type Argon2Algorithm = "argon2d" | "argon2i" | "argon2id";
/**
 * Argon2 options
 */
export interface Argon2Options {
  /**
   * The Argon2 algorithm to use
   *
   * @default "argon2id"
   */
  algorithm?: Argon2Algorithm;
  /**
   * Memory cost
   *
   * @default 19456
   */
  memoryCost?: number;
  /**
   * Time cost
   *
   * @default 2
   */
  timeCost?: number;
  /**
   * Parallelism
   *
   * @default 1
   */
  parallelism?: number;
  /**
   * Output length, will default to 32usize
   */
  outputLength?: number;
}

/**
 * Hash a password using Argon2
 */
export function hash(data: string, options: Argon2Options): string;

/**
 * Verify a password using Argon2
 */
export function verify(
  data: string,
  hash: string,
  options: Argon2Options,
): boolean;
