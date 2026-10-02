/**
 * DatabaseError
 *
 * The base error class for all database errors thrown by a compliant driver.
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * ConnectionError
 *
 * Thrown when a connection to the database could not be established, was
 * closed, or is not alive.
 */
export class ConnectionError extends DatabaseError {}

/**
 * QueryError
 *
 * Thrown when a query or statement could not be executed, for example due to
 * a syntax error, or when using a deallocated prepared statement.
 */
export class QueryError extends DatabaseError {}

/**
 * TransactionError
 *
 * Thrown when a transaction operation fails, or when a committed, rolled back
 * or otherwise inactive transaction is used.
 */
export class TransactionError extends DatabaseError {}
