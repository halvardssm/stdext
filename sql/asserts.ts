import { assertExists, assertInstanceOf, AssertionError } from "@std/assert";
import {
  type SqlClient,
  type SqlClientPool,
  type SqlConnectable,
  type SqlConnection,
  SqlError,
  type SqlEventable,
  type SqlPoolClient,
  type SqlPreparedStatement,
  type SqlQueriable,
  type SqlTransaction,
  type SqlTransactionable,
} from "./mod.ts";

/**
 * Check if an object has a property
 */
function hasProperty<T>(obj: T, property: string | symbol | number): boolean {
  let currentProto = obj;

  while (currentProto !== null && currentProto !== undefined) {
    if (Object.hasOwn(currentProto, property)) {
      return true;
    }
    const descriptor = Object.getOwnPropertyDescriptor(currentProto, property);
    if (descriptor !== undefined) {
      return true;
    }
    currentProto = Object.getPrototypeOf(currentProto);
  }

  return false;
}

/**
 * Check if an object has properties
 */
export function hasProperties<T extends string | symbol>(
  value: unknown,
  properties: Array<T>,
): value is { [K in T]: unknown } {
  assertExists(value);

  const missing: Array<T> = [];

  for (const property of properties) {
    if (
      !hasProperty(value as { [K in T]: unknown }, property)
    ) {
      missing.push(property);
    }
  }

  return missing.length === 0;
}

/**
 * Check if an object has properties and throws if not
 */
export function assertHasProperties<T extends string | symbol>(
  value: unknown,
  properties: Array<T>,
): asserts value is { [K in T]: unknown } {
  assertExists(value);

  const missing: Array<T> = [];

  for (const property of properties) {
    if (
      !hasProperty(value as { [K in T]: unknown }, property)
    ) {
      missing.push(property);
    }
  }

  if (missing.length) {
    throw new AssertionError(
      `Object is missing properties: ${
        missing.map((e) => e.toString()).join(", ")
      }`,
    );
  }
}

/**
 * Check if an error is a SqlError
 */
export function isSqlError(err: unknown): err is SqlError {
  return err instanceof SqlError;
}

/**
 * Asserts that an error is a SqlError
 */
export function assertIsSqlError(err: unknown): asserts err is SqlError {
  assertInstanceOf(err, SqlError);
}

/**
 * Check if an object is an AsyncDisposable
 */
export function isAsyncDisposable(
  value: unknown,
): value is AsyncDisposable {
  return hasProperties(value, [Symbol.asyncDispose]);
}

/**
 * Asserts that an object is an AsyncDisposable
 */
export function assertIsAsyncDisposable(
  value: unknown,
): asserts value is AsyncDisposable {
  assertHasProperties(
    value,
    [
      Symbol.asyncDispose,
    ],
  );
}

/**
 * Check if an object is an SqlConnection
 */
export function isSqlConnection(
  value: unknown,
): value is SqlConnection {
  return isAsyncDisposable(value) && hasProperties(
    value,
    [
      "options",
      "connected",
      "connect",
      "close",
      "execute",
      "queryMany",
      "queryManyArray",
    ],
  );
}

/**
 * Asserts that an object is an SqlConnection
 */
export function assertIsSqlConnection(
  value: unknown,
): asserts value is SqlConnection {
  assertIsAsyncDisposable(value);
  assertHasProperties(
    value,
    [
      "options",
      "connected",
      "connect",
      "close",
      "execute",
      "queryMany",
      "queryManyArray",
    ],
  );
}

/**
 * Check if an object is an SqlConnectable
 */
export function isSqlConnectable(
  value: unknown,
): value is SqlConnectable {
  return isAsyncDisposable(value) && hasProperties(
    value,
    [
      "connection",
      "connected",
    ],
  ) && isSqlConnection(value.connection);
}

/**
 * Asserts that an object is an SqlConnectable
 */
export function assertIsSqlConnectable(
  value: unknown,
): asserts value is SqlConnectable {
  assertIsAsyncDisposable(value);
  assertHasProperties(
    value,
    [
      "connection",
      "connected",
    ],
  );
  assertIsSqlConnection(value.connection);
}

/**
 * Check if an object is an SqlPreparedStatement
 */
export function isSqlPreparedStatement(
  value: unknown,
): value is SqlPreparedStatement {
  return isSqlConnectable(value) && hasProperties(
    value,
    [
      "sql",
      "options",
      "execute",
      "query",
      "queryOne",
      "queryMany",
      "queryArray",
      "queryOneArray",
      "queryManyArray",
    ],
  );
}

/**
 * Asserts that an object is an SqlPreparedStatement
 */
export function assertIsSqlPreparedStatement(
  value: unknown,
): asserts value is SqlPreparedStatement {
  assertIsSqlConnectable(value);
  assertHasProperties(
    value,
    [
      "sql",
      "options",
      "execute",
      "query",
      "queryOne",
      "queryMany",
      "queryArray",
      "queryOneArray",
      "queryManyArray",
    ],
  );
}

/**
 * Check if an object is an SqlQueriable
 */
export function isSqlQueriable(
  value: unknown,
): value is SqlQueriable {
  return isSqlConnectable(value) && hasProperties(
    value,
    [
      "options",
      "execute",
      "query",
      "queryOne",
      "queryMany",
      "queryArray",
      "queryOneArray",
      "queryManyArray",
    ],
  );
}

/**
 * Asserts that an object is an SqlQueriable
 */
export function assertIsSqlQueriable(
  value: unknown,
): asserts value is SqlQueriable {
  assertIsSqlConnectable(value);
  assertHasProperties(
    value,
    [
      "options",
      "execute",
      "query",
      "queryOne",
      "queryMany",
      "queryArray",
      "queryOneArray",
      "queryManyArray",
    ],
  );
}

/**
 * Check if an object is an SqlTransaction
 */
export function isSqlPreparable(
  value: unknown,
): value is SqlQueriable {
  return isSqlQueriable(value) && hasProperties(
    value,
    [
      "prepare",
    ],
  );
}

/**
 * Asserts that an object is an SqlTransaction
 */
export function assertIsSqlPreparable(
  value: unknown,
): asserts value is SqlQueriable {
  assertIsSqlQueriable(value);
  assertHasProperties(
    value,
    [
      "prepare",
    ],
  );
}

/**
 * Check if an object is an SqlTransaction
 */
export function isSqlTransaction(
  value: unknown,
): value is SqlTransaction {
  return isSqlPreparable(value) && hasProperties(
    value,
    [
      "inTransaction",
      "commitTransaction",
      "rollbackTransaction",
      "createSavepoint",
      "releaseSavepoint",
    ],
  );
}

/**
 * Asserts that an object is an SqlTransaction
 */
export function assertIsSqlTransaction(
  value: unknown,
): asserts value is SqlTransaction {
  assertIsSqlPreparable(value);
  assertHasProperties(
    value,
    [
      "inTransaction",
      "commitTransaction",
      "rollbackTransaction",
      "createSavepoint",
      "releaseSavepoint",
    ],
  );
}

/**
 * Check if an object is an SqlTransactionable
 */
export function isSqlTransactionable(
  value: unknown,
): value is SqlTransactionable {
  return isSqlPreparable(value) && hasProperties(
    value,
    [
      "beginTransaction",
      "transaction",
    ],
  );
}

/**
 * Asserts that an object is an SqlTransactionable
 */
export function assertIsSqlTransactionable(
  value: unknown,
): asserts value is SqlTransactionable {
  assertIsSqlPreparable(value);
  assertHasProperties(
    value,
    [
      "beginTransaction",
      "transaction",
    ],
  );
}

/**
 * Check if an object is an SqlEventable
 */
export function isSqlEventable(
  value: unknown,
): value is SqlEventable {
  return hasProperties(value, ["eventTarget"]) &&
    value.eventTarget instanceof EventTarget;
}

/**
 * Asserts that an object is an SqlEventable
 */
export function assertIsSqlEventable(
  value: unknown,
): asserts value is SqlEventable {
  assertHasProperties(value, ["eventTarget"]);
  assertInstanceOf(value.eventTarget, EventTarget);
}

/**
 * Check if an object is an SqlClient
 */
export function isSqlClient(value: unknown): value is SqlClient {
  return isSqlConnection(value) && isSqlQueriable(value) &&
    isSqlTransactionable(value) && isSqlEventable(value) &&
    hasProperties(value, ["options"]);
}

/**
 * Asserts that an object is an SqlClient
 */
export function assertIsSqlClient(value: unknown): asserts value is SqlClient {
  assertIsSqlConnection(value);
  assertIsSqlQueriable(value);
  assertIsSqlTransactionable(value);
  assertIsSqlEventable(value);
  assertHasProperties(value, ["options"]);
}

/**
 * Check if an object is an SqlPoolClient
 */
export function isSqlPoolClient(
  value: unknown,
): value is SqlPoolClient {
  return isSqlConnectable(value) && isSqlTransactionable(value) &&
    hasProperties(value, [
      "options",
      "disposed",
      "release",
    ]);
}

/**
 * Asserts that an object is an SqlPoolClient
 */
export function assertIsSqlPoolClient(
  value: unknown,
): asserts value is SqlPoolClient {
  assertIsSqlConnectable(value);
  assertIsSqlTransactionable(value);
  assertHasProperties(value, [
    "options",
    "disposed",
    "release",
  ]);
}

/**
 * Check if an object is an SqlClientPool
 */
export function isSqlClientPool(
  value: unknown,
): value is SqlClientPool {
  return isSqlEventable(value) && isAsyncDisposable(value) &&
    hasProperties(value, [
      "connectionUrl",
      "options",
      "connected",
      "connect",
      "close",
      "deferredStack",
      "acquire",
    ]);
}

/**
 * Asserts that an object is an SqlClientPool
 */
export function assertIsSqlClientPool(
  value: unknown,
): asserts value is SqlClientPool {
  assertIsSqlEventable(value);
  assertIsAsyncDisposable(value);
  assertHasProperties(value, [
    "connectionUrl",
    "options",
    "connected",
    "connect",
    "close",
    "deferredStack",
    "acquire",
  ]);
}
