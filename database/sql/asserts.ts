import { AssertionError } from "@std/assert";
import type { Eventable } from "./events.ts";
import type {
  Client,
  Connectable,
  Connection,
  Dialect,
  Dialectable,
  Driver,
  DriverConnection,
  Pingable,
  Poolable,
  Preparable,
  PreparedStatement,
  Queryable,
  Transaction,
  Transactionable,
} from "./core.ts";

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function isAsyncDisposable(value: unknown): boolean {
  return isFn(value, Symbol.asyncDispose);
}

function isFn(value: unknown, ...keys: PropertyKey[]): boolean {
  return isObject(value) &&
    keys.every((key) => typeof value[key] === "function");
}

function isBool(value: unknown, key: PropertyKey): boolean {
  return isObject(value) && typeof value[key] === "boolean";
}

function assert(
  condition: boolean,
  value: unknown,
  type: string,
): asserts condition {
  if (!condition) {
    throw new AssertionError(`Value is not a ${type}: ${typeof value}`);
  }
}

// Driver level

/**
 * Check if a value is a {@linkcode Dialect}.
 *
 * @example
 * ```ts
 * import { isDialect } from "@stdext/database/sql";
 * import { assert } from "@std/assert";
 *
 * assert(isDialect({
 *   name: "sqlite",
 *   placeholder: () => "?",
 *   quoteIdentifier: (name: string) => `"${name}"`,
 * }));
 * ```
 */
export function isDialect(value: unknown): value is Dialect {
  return isObject(value) && typeof value.name === "string" &&
    isFn(value, "placeholder", "quoteIdentifier");
}

/**
 * Assert that a value is a {@linkcode Dialect}.
 */
export function assertIsDialect(value: unknown): asserts value is Dialect {
  assert(isDialect(value), value, "Dialect");
}

/**
 * Check if a value is a {@linkcode Driver}.
 */
export function isDriver(value: unknown): value is Driver {
  return isObject(value) && isDialect(value.dialect) &&
    isFn(value, "connect") &&
    (value.maxConnections === undefined ||
      typeof value.maxConnections === "number");
}

/**
 * Assert that a value is a {@linkcode Driver}.
 */
export function assertIsDriver(value: unknown): asserts value is Driver {
  assert(isDriver(value), value, "Driver");
}

/**
 * Check if a value is a {@linkcode DriverConnection}.
 */
export function isDriverConnection(value: unknown): value is DriverConnection {
  return isAsyncDisposable(value) && isBool(value, "closed") &&
    isFn(
      value,
      "close",
      "execute",
      "query",
      "executeScript",
      "begin",
      "ping",
    ) &&
    isObject(value) &&
    (value.prepare === undefined || isFn(value, "prepare"));
}

/**
 * Assert that a value is a {@linkcode DriverConnection}.
 */
export function assertIsDriverConnection(
  value: unknown,
): asserts value is DriverConnection {
  assert(isDriverConnection(value), value, "DriverConnection");
}

// Client level

/**
 * Check if a value is {@linkcode Connectable}.
 */
export function isConnectable(value: unknown): value is Connectable {
  return isAsyncDisposable(value) &&
    isFn(value, "connect", "close") &&
    isBool(value, "connected") &&
    isObject(value) &&
    (typeof value.connectionUrl === "string" ||
      value.connectionUrl instanceof URL);
}

/**
 * Assert that a value is {@linkcode Connectable}.
 */
export function assertIsConnectable(
  value: unknown,
): asserts value is Connectable {
  assert(isConnectable(value), value, "Connectable");
}

/**
 * Check if a value is {@linkcode Pingable}.
 */
export function isPingable(value: unknown): value is Pingable {
  return isFn(value, "ping");
}

/**
 * Assert that a value is {@linkcode Pingable}.
 */
export function assertIsPingable(value: unknown): asserts value is Pingable {
  assert(isPingable(value), value, "Pingable");
}

/**
 * Check if a value is {@linkcode Queryable}.
 *
 * @example
 * ```ts
 * import { isQueryable } from "@stdext/database/sql";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(isQueryable({ execute() {}, query() {}, executeScript() {} }));
 * assertFalse(isQueryable({ execute() {} }));
 * ```
 */
export function isQueryable(value: unknown): value is Queryable {
  return isFn(value, "execute", "query", "executeScript");
}

/**
 * Assert that a value is {@linkcode Queryable}.
 */
export function assertIsQueryable(value: unknown): asserts value is Queryable {
  assert(isQueryable(value), value, "Queryable");
}

/**
 * Check if a value is {@linkcode Preparable}.
 */
export function isPreparable(value: unknown): value is Preparable {
  return isFn(value, "prepare");
}

/**
 * Assert that a value is {@linkcode Preparable}.
 */
export function assertIsPreparable(
  value: unknown,
): asserts value is Preparable {
  assert(isPreparable(value), value, "Preparable");
}

/**
 * Check if a value is {@linkcode Transactionable}.
 */
export function isTransactionable(value: unknown): value is Transactionable {
  return isFn(value, "beginTransaction", "transaction");
}

/**
 * Assert that a value is {@linkcode Transactionable}.
 */
export function assertIsTransactionable(
  value: unknown,
): asserts value is Transactionable {
  assert(isTransactionable(value), value, "Transactionable");
}

/**
 * Check if a value is {@linkcode Dialectable}.
 */
export function isDialectable(value: unknown): value is Dialectable {
  return isObject(value) && isDialect(value.dialect);
}

/**
 * Assert that a value is {@linkcode Dialectable}.
 */
export function assertIsDialectable(
  value: unknown,
): asserts value is Dialectable {
  assert(isDialectable(value), value, "Dialectable");
}

/**
 * Check if a value is {@linkcode Eventable}.
 */
export function isEventable(value: unknown): value is Eventable {
  return isObject(value) && value.eventTarget instanceof EventTarget;
}

/**
 * Assert that a value is {@linkcode Eventable}.
 */
export function assertIsEventable(value: unknown): asserts value is Eventable {
  assert(isEventable(value), value, "Eventable");
}

/**
 * Check if a value is {@linkcode Poolable}.
 */
export function isPoolable(value: unknown): value is Poolable {
  return isFn(value, "acquire");
}

/**
 * Assert that a value is {@linkcode Poolable}.
 */
export function assertIsPoolable(value: unknown): asserts value is Poolable {
  assert(isPoolable(value), value, "Poolable");
}

/**
 * Check if a value is a {@linkcode Transaction}.
 */
export function isTransaction(value: unknown): value is Transaction {
  return isAsyncDisposable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isBool(value, "inTransaction") &&
    isFn(value, "commit", "rollback", "createSavepoint", "releaseSavepoint");
}

/**
 * Assert that a value is a {@linkcode Transaction}.
 */
export function assertIsTransaction(
  value: unknown,
): asserts value is Transaction {
  assert(isTransaction(value), value, "Transaction");
}

/**
 * Check if a value is a {@linkcode PreparedStatement}.
 */
export function isPreparedStatement(
  value: unknown,
): value is PreparedStatement {
  return isAsyncDisposable(value) &&
    isFn(value, "execute", "query", "deallocate") &&
    isObject(value) &&
    typeof value.sql === "string" &&
    isBool(value, "deallocated");
}

/**
 * Assert that a value is a {@linkcode PreparedStatement}.
 */
export function assertIsPreparedStatement(
  value: unknown,
): asserts value is PreparedStatement {
  assert(isPreparedStatement(value), value, "PreparedStatement");
}

/**
 * Check if a value is a {@linkcode Connection}.
 */
export function isConnection(value: unknown): value is Connection {
  return isAsyncDisposable(value) &&
    isPingable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isDialectable(value) &&
    isFn(value, "release", "remove") &&
    isBool(value, "released") &&
    isBool(value, "connected");
}

/**
 * Assert that a value is a {@linkcode Connection}.
 */
export function assertIsConnection(
  value: unknown,
): asserts value is Connection {
  assert(isConnection(value), value, "Connection");
}

/**
 * Check if a value is a {@linkcode Client}.
 */
export function isClient(value: unknown): value is Client {
  return isConnectable(value) &&
    isPingable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isPoolable(value) &&
    isDialectable(value) &&
    isEventable(value) &&
    isObject(value) &&
    isObject(value.options);
}

/**
 * Assert that a value is a {@linkcode Client}.
 */
export function assertIsClient(value: unknown): asserts value is Client {
  assert(isClient(value), value, "Client");
}
