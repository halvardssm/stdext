// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * Scrypt options
 */
export interface ScryptOptions {
  /**
   * Logarithmic complexity
   *
   * Must be less than 64
   *
   * @default 17
   */
  logN?: number;
  /**
   * Block size
   *
   * Must be between 1 and 4294967295
   *
   * @default 8
   */
  blockSize?: number;
  /**
   * Parallelism
   *
   * Must be between 1 and 4294967295
   *
   * @default 1
   */
  parallelism?: number;
  /**
   * Key length
   *
   * Must be between 10 and 64
   *
   * @default 32
   */
  keyLenght?: number;
}

/**
 * Hash a password using Scrypt
 */
export function hash(data: string, options: ScryptOptions): string;

/**
 * Verify a password using Scrypt
 */
export function verify(
  data: string,
  hash: string,
  _options: ScryptOptions,
): boolean;
