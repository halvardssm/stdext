import { assertInstanceOf, AssertionError } from "@std/assert";
import type {
  Driver,
  DriverConnectable,
  DriverInternalOptions,
} from "./driver.ts";
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
import {
  assertObjectHasPropertiesDeep,
  isString,
  objectHasProperties,
  objectHasPropertiesDeep,
} from "@stdext/assert";

/**
 * Check if a value is a connectionUrl
 */
export function isConnectionUrl(value: unknown): value is string | URL {
  return isString(value) || value instanceof URL;
}

/**
 * Assert that a value is a connectionUrl
 */
export function assertIsConnectionUrl(
  value: unknown,
): asserts value is string | URL {
  if (!isConnectionUrl(value)) {
    throw new AssertionError(
      `The given value is not a valid connection url, must be 'string' or 'URL', but was '${value}'`,
    );
  }
}

/**
 * Check if a value is driver options
 */
export function isDriverOptions<
  T extends DriverInternalOptions = DriverInternalOptions,
>(value: unknown, otherKeys: string[] = []): value is T {
  const driverOptionsKeys = ["connectionOptions", "queryOptions", ...otherKeys];

  return objectHasProperties(value, driverOptionsKeys);
}

/**
 * Assert that a value is driver options
 */
export function assertIsDriverOptions<
  T extends DriverInternalOptions = DriverInternalOptions,
>(
  value: unknown,
  otherKeys: string[] = [],
): asserts value is T {
  const driverOptionsKeys = ["connectionOptions", "queryOptions", ...otherKeys];

  if (!isDriverOptions(value, otherKeys)) {
    throw new AssertionError(
      `The given value is not valid driver options, must contain the following keys ${
        driverOptionsKeys.map(String).join(",")
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
  return objectHasPropertiesDeep(value, [Symbol.asyncDispose]);
}

/**
 * Asserts that an object is an AsyncDisposable
 */
export function assertIsAsyncDisposable(
  value: unknown,
): asserts value is AsyncDisposable {
  assertObjectHasPropertiesDeep(
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
  return isAsyncDisposable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isAsyncDisposable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isDriverConnectable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isDriverConnectable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isQueriable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isPreparable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return isPreparable(value) && objectHasPropertiesDeep(
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
  assertObjectHasPropertiesDeep(
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
  return objectHasPropertiesDeep(value, ["eventTarget"]) &&
    value.eventTarget instanceof EventTarget;
}

/**
 * Asserts that an object is an Eventable
 */
export function assertIsEventable(
  value: unknown,
): asserts value is Eventable {
  assertObjectHasPropertiesDeep(value, ["eventTarget"]);
  assertInstanceOf(value.eventTarget, EventTarget);
}

/**
 * Check if an object is an Client
 */
export function isClient(value: unknown): value is Client {
  return isDriver(value) && isQueriable(value) &&
    isTransactionable(value) && isEventable(value) &&
    objectHasPropertiesDeep(value, ["options"]);
}

/**
 * Asserts that an object is an Client
 */
export function assertIsClient(value: unknown): asserts value is Client {
  isDriverConnectable(value);
  assertIsQueriable(value);
  assertIsTransactionable(value);
  assertIsEventable(value);
  assertObjectHasPropertiesDeep(value, ["options"]);
}

/**
 * Check if an object is an PoolClient
 */
export function isPoolClient(
  value: unknown,
): value is PoolClient {
  return isDriverConnectable(value) && isTransactionable(value) &&
    objectHasPropertiesDeep(value, [
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
  assertObjectHasPropertiesDeep(value, [
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
    objectHasPropertiesDeep(value, [
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
  assertObjectHasPropertiesDeep(value, [
    "connectionUrl",
    "options",
    "connected",
    "connect",
    "close",
    "deferredStack",
    "acquire",
  ]);
}
