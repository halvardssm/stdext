import type { SqlBase } from "./core.ts";

/**
 * SqlConnectionOptions
 *
 * The options that will be used when connecting to the database.
 */
export interface SqlConnectionOptions {
  /**
   * Transforms the value that will be sent to the database
   */
  transformInput?: (value: unknown) => unknown;
  /**
   * Transforms the value received from the database
   */
  transformOutput?: (value: unknown) => unknown;
}

/**
 * SqlConnection
 *
 * This represents a connection to a database.
 * When a user wants a single connection to the database,
 * they should use a class implementing or using this interface.
 *
 * The class implementing this interface should be able to connect to the database,
 * and have the following constructor arguments (if more options are needed, extend the SqlConnectionOptions):
 *  - connectionUrl: string|URL
 *  - connectionOptions?: SqlConnectionOptions;
 */
export interface SqlConnection<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
> extends SqlBase, AsyncDisposable {
  /**
   * Connection URL
   */
  readonly connectionUrl: string;

  /**
   * Connection options
   */
  readonly connectionOptions: ConnectionOptions;

  /**
   * Whether the connection is connected to the database
   */
  get connected(): boolean;

  /**
   * Create a connection to the database
   */
  connect(): Promise<void>;

  /**
   * Close the connection to the database
   */
  close(): Promise<void>;
}
