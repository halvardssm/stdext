import type { SqlBase } from "./core.ts";
import { VERSION } from "./meta.ts";

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

/**
 * SqlDeferredError
 *
 * Error that is thrown by DeferredStack
 */
export class SqlDeferredError extends SqlError {
}

/**
 * Check if an error is a SqlError
 */
export function isSqlError(err: unknown): err is SqlError {
  return err instanceof SqlError;
}
