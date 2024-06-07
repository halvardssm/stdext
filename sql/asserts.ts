import { assertExists, assertInstanceOf, AssertionError } from "@std/assert";
import {
  SqlClient,
  SqlClientPool,
  SqlClientQueriable,
  SqlConnectableBase,
  SqlConnection,
  SqlError,
  SqlEventable,
  SqlPoolClient,
  SqlPreparedStatement,
  SqlQueriable,
  SqlTransaction,
} from "./mod.ts";
import { DeferredStack } from "../collections/deferred_stack.ts";

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
 * Check if an object has properties, and returns the properties that are missing
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
 * Check if an error is a SqlError
 */
export function assertIsSqlError(err: unknown): asserts err is SqlError {
  assertInstanceOf(err, SqlError);
}

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

export function assertIsSqlConnection(
  value: unknown,
): asserts value is SqlConnection {
  assertIsAsyncDisposable(value);
  assertHasProperties(
    value,
    [
      "connectionUrl",
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

export function assertIsSqlConnectableBase(
  value: unknown,
): asserts value is SqlConnectableBase {
  assertHasProperties(
    value,
    [
      "connection",
      "connected",
    ],
  );
  assertIsSqlConnection(value.connection);
}

export function assertIsSqlPreparedStatement(
  value: unknown,
): asserts value is SqlPreparedStatement {
  assertIsSqlConnectableBase(value);
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

export function assertIsSqlQueriable(
  value: unknown,
): asserts value is SqlQueriable {
  assertIsSqlConnectableBase(value);
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

export function assertIsSqlTransaction(
  value: unknown,
): asserts value is SqlTransaction {
  assertIsSqlQueriable(value);
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

export function assertIsSqlClientQueriable(
  value: unknown,
): asserts value is SqlClientQueriable {
  assertIsSqlQueriable(value);
  assertHasProperties(
    value,
    [
      "prepare",
      "beginTransaction",
      "transaction",
    ],
  );
}

export function assertIsSqlEventable(
  value: unknown,
): asserts value is SqlEventable {
  assertHasProperties(value, ["eventTarget"]);
  assertInstanceOf(value.eventTarget, EventTarget);
}

export function assertIsSqlClient(value: unknown): asserts value is SqlClient {
  assertIsSqlConnection(value);
  assertIsSqlQueriable(value);
  assertIsSqlClientQueriable(value);
  assertIsSqlEventable(value);
  assertHasProperties(value, ["options"]);
}

export function assertIsSqlPoolClient(
  value: unknown,
): asserts value is SqlPoolClient {
  assertIsSqlConnectableBase(value);
  assertIsSqlClientQueriable(value);
  assertHasProperties(value, [
    "options",
    "disposed",
    "release",
  ]);
}

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
  assertInstanceOf(value.deferredStack, DeferredStack);
}
