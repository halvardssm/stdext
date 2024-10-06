import { assertExists, assertInstanceOf, AssertionError } from "@std/assert";
import type { Driver, DriverConnectable } from "./driver.ts";
import type { Client } from "./client.ts";
import type {
  PreparedStatement,
  Queriable,
  Transaction,
  Transactionable,
} from "./core.ts";
import type { Eventable } from "./events.ts";
import type { ClientPool, PoolClient } from "./pool.ts";
import { SqlError } from "./errors.ts";

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
 * Check if an object is a Driver
 */
export function isDriver(
  value: unknown,
): value is Driver {
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
 * Asserts that an object is a Driver
 */
export function assertIsDriver(
  value: unknown,
): asserts value is Driver {
  assertIsAsyncDisposable(value);
  assertHasProperties(
    value,
    [
      "options",
      "connected",
      "connect",
      "close",
      "ping",
      "query",
    ],
  );
}

/**
 * Check if an object is an DriverConnectable
 */
export function isDriverConnectable(
  value: unknown,
): value is DriverConnectable {
  return isAsyncDisposable(value) && hasProperties(
    value,
    [
      "connection",
      "connected",
    ],
  ) && isDriver(value.connection);
}

/**
 * Asserts that an object is an DriverConnectable
 */
export function assertIsDriverConnectable(
  value: unknown,
): asserts value is DriverConnectable {
  assertIsAsyncDisposable(value);
  assertHasProperties(
    value,
    [
      "connection",
      "connected",
    ],
  );
  assertIsDriver(value.connection);
}

/**
 * Check if an object is an PreparedStatement
 */
export function isPreparedStatement(
  value: unknown,
): value is PreparedStatement {
  return isDriverConnectable(value) && hasProperties(
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
 * Asserts that an object is an PreparedStatement
 */
export function assertIsPreparedStatement(
  value: unknown,
): asserts value is PreparedStatement {
  assertIsDriverConnectable(value);
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
 * Check if an object is an Queriable
 */
export function isQueriable(
  value: unknown,
): value is Queriable {
  return isDriverConnectable(value) && hasProperties(
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
 * Asserts that an object is an Queriable
 */
export function assertIsQueriable(
  value: unknown,
): asserts value is Queriable {
  assertIsDriverConnectable(value);
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
 * Check if an object is an Transaction
 */
export function isPreparable(
  value: unknown,
): value is Queriable {
  return isQueriable(value) && hasProperties(
    value,
    [
      "prepare",
    ],
  );
}

/**
 * Asserts that an object is an Transaction
 */
export function assertIsPreparable(
  value: unknown,
): asserts value is Queriable {
  assertIsQueriable(value);
  assertHasProperties(
    value,
    [
      "prepare",
    ],
  );
}

/**
 * Check if an object is an Transaction
 */
export function isTransaction(
  value: unknown,
): value is Transaction {
  return isPreparable(value) && hasProperties(
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
 * Asserts that an object is an Transaction
 */
export function assertIsTransaction(
  value: unknown,
): asserts value is Transaction {
  assertIsPreparable(value);
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
 * Check if an object is an Transactionable
 */
export function isTransactionable(
  value: unknown,
): value is Transactionable {
  return isPreparable(value) && hasProperties(
    value,
    [
      "beginTransaction",
      "transaction",
    ],
  );
}

/**
 * Asserts that an object is an Transactionable
 */
export function assertIsTransactionable(
  value: unknown,
): asserts value is Transactionable {
  assertIsPreparable(value);
  assertHasProperties(
    value,
    [
      "beginTransaction",
      "transaction",
    ],
  );
}

/**
 * Check if an object is an Eventable
 */
export function isEventable(
  value: unknown,
): value is Eventable {
  return hasProperties(value, ["eventTarget"]) &&
    value.eventTarget instanceof EventTarget;
}

/**
 * Asserts that an object is an Eventable
 */
export function assertIsEventable(
  value: unknown,
): asserts value is Eventable {
  assertHasProperties(value, ["eventTarget"]);
  assertInstanceOf(value.eventTarget, EventTarget);
}

/**
 * Check if an object is an Client
 */
export function isClient(value: unknown): value is Client {
  return isDriver(value) && isQueriable(value) &&
    isTransactionable(value) && isEventable(value) &&
    hasProperties(value, ["options"]);
}

/**
 * Asserts that an object is an Client
 */
export function assertIsClient(value: unknown): asserts value is Client {
  isDriverConnectable(value);
  assertIsQueriable(value);
  assertIsTransactionable(value);
  assertIsEventable(value);
  assertHasProperties(value, ["options"]);
}

/**
 * Check if an object is an PoolClient
 */
export function isPoolClient(
  value: unknown,
): value is PoolClient {
  return isDriverConnectable(value) && isTransactionable(value) &&
    hasProperties(value, [
      "options",
      "disposed",
      "release",
    ]);
}

/**
 * Asserts that an object is an PoolClient
 */
export function assertIsPoolClient(
  value: unknown,
): asserts value is PoolClient {
  assertIsDriverConnectable(value);
  assertIsTransactionable(value);
  assertHasProperties(value, [
    "options",
    "disposed",
    "release",
  ]);
}

/**
 * Check if an object is an ClientPool
 */
export function isClientPool(
  value: unknown,
): value is ClientPool {
  return isEventable(value) && isAsyncDisposable(value) &&
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
 * Asserts that an object is an ClientPool
 */
export function assertIsClientPool(
  value: unknown,
): asserts value is ClientPool {
  assertIsEventable(value);
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
