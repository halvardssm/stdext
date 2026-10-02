import { AssertionError } from "@std/assert";
import type { Eventable } from "./events.ts";
import type {
  Client,
  Connectable,
  Driver,
  Driverable,
  Pingable,
  Poolable,
  PoolClient,
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
  return isObject(value) &&
    typeof value[Symbol.asyncDispose] === "function";
}

function isFn(value: unknown, key: PropertyKey): boolean {
  return isObject(value) && typeof value[key] === "function";
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

/**
 * Check if a value is {@linkcode Connectable}
 */
export function isConnectable(value: unknown): value is Connectable {
  return isAsyncDisposable(value) &&
    isFn(value, "connect") &&
    isFn(value, "close") &&
    isBool(value, "connected") &&
    isObject(value) &&
    (typeof value["connectionUrl"] === "string" ||
      value["connectionUrl"] instanceof URL);
}

/**
 * Assert that a value is {@linkcode Connectable}
 */
export function assertIsConnectable(
  value: unknown,
): asserts value is Connectable {
  assert(isConnectable(value), value, "Connectable");
}

/**
 * Check if a value is {@linkcode Pingable}
 */
export function isPingable(value: unknown): value is Pingable {
  return isFn(value, "ping");
}

/**
 * Assert that a value is {@linkcode Pingable}
 */
export function assertIsPingable(value: unknown): asserts value is Pingable {
  assert(isPingable(value), value, "Pingable");
}

/**
 * Check if a value is {@linkcode Queryable}
 */
export function isQueryable(value: unknown): value is Queryable {
  return isFn(value, "execute") && isFn(value, "query");
}

/**
 * Assert that a value is {@linkcode Queryable}
 */
export function assertIsQueryable(value: unknown): asserts value is Queryable {
  assert(isQueryable(value), value, "Queryable");
}

/**
 * Check if a value is {@linkcode Preparable}
 */
export function isPreparable(value: unknown): value is Preparable {
  return isFn(value, "prepare");
}

/**
 * Assert that a value is {@linkcode Preparable}
 */
export function assertIsPreparable(
  value: unknown,
): asserts value is Preparable {
  assert(isPreparable(value), value, "Preparable");
}

/**
 * Check if a value is {@linkcode Transactionable}
 */
export function isTransactionable(value: unknown): value is Transactionable {
  return isFn(value, "beginTransaction") && isFn(value, "transaction");
}

/**
 * Assert that a value is {@linkcode Transactionable}
 */
export function assertIsTransactionable(
  value: unknown,
): asserts value is Transactionable {
  assert(isTransactionable(value), value, "Transactionable");
}

/**
 * Check if a value is a {@linkcode Transaction}
 */
export function isTransaction(value: unknown): value is Transaction {
  return isAsyncDisposable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isBool(value, "inTransaction") &&
    isFn(value, "commitTransaction") &&
    isFn(value, "rollbackTransaction") &&
    isFn(value, "createSavepoint") &&
    isFn(value, "releaseSavepoint");
}

/**
 * Assert that a value is a {@linkcode Transaction}
 */
export function assertIsTransaction(
  value: unknown,
): asserts value is Transaction {
  assert(isTransaction(value), value, "Transaction");
}

/**
 * Check if a value is a {@linkcode PreparedStatement}
 */
export function isPreparedStatement(
  value: unknown,
): value is PreparedStatement {
  return isAsyncDisposable(value) &&
    isFn(value, "execute") &&
    isFn(value, "query") &&
    isFn(value, "deallocate") &&
    isObject(value) &&
    typeof value["sql"] === "string" &&
    isBool(value, "deallocated");
}

/**
 * Assert that a value is a {@linkcode PreparedStatement}
 */
export function assertIsPreparedStatement(
  value: unknown,
): asserts value is PreparedStatement {
  assert(isPreparedStatement(value), value, "PreparedStatement");
}

/**
 * Check if a value is a {@linkcode Poolable}
 */
export function isPoolable(value: unknown): value is Poolable {
  return isFn(value, "acquire");
}

/**
 * Assert that a value is a {@linkcode Poolable}
 */
export function assertIsPoolable(value: unknown): asserts value is Poolable {
  assert(isPoolable(value), value, "Poolable");
}

/**
 * Check if a value is a {@linkcode PoolClient}
 */
export function isPoolClient(value: unknown): value is PoolClient {
  return isAsyncDisposable(value) &&
    isPingable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isFn(value, "release") &&
    isFn(value, "remove") &&
    isBool(value, "disposed") &&
    isBool(value, "connected");
}

/**
 * Assert that a value is a {@linkcode PoolClient}
 */
export function assertIsPoolClient(
  value: unknown,
): asserts value is PoolClient {
  assert(isPoolClient(value), value, "PoolClient");
}

/**
 * Check if a value is {@linkcode Driverable}
 */
export function isDriverable(value: unknown): value is Driverable {
  return isObject(value) && value["driver"] !== undefined;
}

/**
 * Assert that a value is {@linkcode Driverable}
 */
export function assertIsDriverable(
  value: unknown,
): asserts value is Driverable {
  assert(isDriverable(value), value, "Driverable");
}

/**
 * Check if a value is {@linkcode Eventable}
 */
export function isEventable(value: unknown): value is Eventable {
  return isObject(value) && value["eventTarget"] instanceof EventTarget;
}

/**
 * Assert that a value is {@linkcode Eventable}
 */
export function assertIsEventable(value: unknown): asserts value is Eventable {
  assert(isEventable(value), value, "Eventable");
}

/**
 * Check if a value is a {@linkcode Driver}
 */
export function isDriver(value: unknown): value is Driver {
  return isConnectable(value) &&
    isPingable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isEventable(value) &&
    isObject(value) &&
    isObject(value["options"]);
}

/**
 * Assert that a value is a {@linkcode Driver}
 */
export function assertIsDriver(value: unknown): asserts value is Driver {
  assert(isDriver(value), value, "Driver");
}

/**
 * Check if a value is a {@linkcode Client}
 */
export function isClient(value: unknown): value is Client {
  return isConnectable(value) &&
    isPingable(value) &&
    isQueryable(value) &&
    isPreparable(value) &&
    isTransactionable(value) &&
    isPoolable(value) &&
    isEventable(value) &&
    isObject(value) &&
    isObject(value["options"]);
}

/**
 * Assert that a value is a {@linkcode Client}
 */
export function assertIsClient(value: unknown): asserts value is Client {
  assert(isClient(value), value, "Client");
}

/**
 * Assert that constructor arguments follow the standard signature of
 * `(connectionUrl: string | URL, options?: object)`.
 *
 * @param args the constructor arguments
 */
export function assertConstructorSignature(args: unknown[]): void {
  if (args.length > 2) {
    throw new AssertionError(
      "Number of constructor arguments has to be max 2: (connectionUrl, options?)",
    );
  }
  const [connectionUrl, options] = args;
  if (
    typeof connectionUrl !== "string" && !(connectionUrl instanceof URL)
  ) {
    throw new AssertionError(
      "First constructor argument must be a string or URL",
    );
  }
  if (
    options !== undefined && (typeof options !== "object" || options === null)
  ) {
    throw new AssertionError(
      "Second constructor argument must be an options object or undefined",
    );
  }
}
