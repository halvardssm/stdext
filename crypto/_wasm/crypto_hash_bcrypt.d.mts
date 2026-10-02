// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * Bcrypt options
 */
export interface BcryptOptions {
  /**
   * Must be a number between 4 and 31
   *
   * @default 12
   */
  cost?: number;
}

/**
 * Hash a password using Bcrypt
 */
export function hash(password: string, options: BcryptOptions): string;

/**
 * Verify a password using Bcrypt
 *
 * Returns `false` for a wrong password and for a hash that cannot be
 * parsed; `bcrypt::verify` returns `Ok(false)` for the former and an
 * `Err` for the latter, so both collapse to `false` here.
 */
export function verify(
  password: string,
  hash: string,
  _options: BcryptOptions,
): boolean;
