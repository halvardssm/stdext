/**
 * SqlError
 *
 * Base SQLx Error
 */
export class SqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
