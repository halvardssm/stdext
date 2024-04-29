/**
 * General interface for password hashes.
 *
 * ```
 * const hasher = new PasswordHash();
 * const hash = hasher.hash("password");
 * hasher.verify("password", hash));
 * ```
 */
export interface PasswordHash {
  /**
   * Hashes the password.
   */
  hash(password: string): string;
  /**
   * Verifies the password against the hash.
   */
  verify(password: string, hash: string): boolean;
}
