import { assertThrows } from "@std/assert";
import {
  assertIsClient,
  assertIsConnectable,
  assertIsConnection,
  assertIsDialect,
  assertIsDialectable,
  assertIsDriver,
  assertIsDriverConnection,
  assertIsEventable,
  assertIsPingable,
  assertIsPoolable,
  assertIsPreparable,
  assertIsPreparedStatement,
  assertIsQueryable,
  assertIsTransaction,
  assertIsTransactionable,
} from "./asserts.ts";

const asyncDispose = () => ({ [Symbol.asyncDispose]: () => {} });
const fn = () => {};

const dialect = {
  name: "test",
  placeholder: () => "?",
  quoteIdentifier: (name: string) => `"${name}"`,
};

const driver = { dialect, connect: fn };

const driverConnection = {
  ...asyncDispose(),
  closed: false,
  close: fn,
  execute: fn,
  query: fn,
  executeScript: fn,
  begin: fn,
  ping: fn,
};

const queryable = { execute: fn, query: fn, executeScript: fn };

const preparedStatement = {
  ...asyncDispose(),
  sql: "SELECT 1",
  deallocated: false,
  deallocate: fn,
  execute: fn,
  query: fn,
};

const transaction = {
  ...asyncDispose(),
  ...queryable,
  prepare: fn,
  beginTransaction: fn,
  transaction: fn,
  inTransaction: true,
  commit: fn,
  rollback: fn,
  createSavepoint: fn,
  releaseSavepoint: fn,
};

const connection = {
  ...asyncDispose(),
  ...queryable,
  dialect,
  connected: true,
  released: false,
  release: fn,
  remove: fn,
  ping: fn,
  prepare: fn,
  beginTransaction: fn,
  transaction: fn,
};

const client = {
  ...asyncDispose(),
  ...queryable,
  options: {},
  dialect,
  eventTarget: new EventTarget(),
  connectionUrl: "test://",
  connected: false,
  connect: fn,
  close: fn,
  ping: fn,
  prepare: fn,
  beginTransaction: fn,
  transaction: fn,
  acquire: fn,
};

Deno.test("asserts", async (t) => {
  await t.step("positive", () => {
    assertIsDialect(dialect);
    assertIsDriver(driver);
    assertIsDriver({ ...driver, maxConnections: 1 });
    assertIsDriverConnection(driverConnection);
    assertIsDriverConnection({ ...driverConnection, prepare: fn });
    assertIsConnectable(client);
    assertIsPingable(client);
    assertIsQueryable(queryable);
    assertIsPreparable(client);
    assertIsTransactionable(client);
    assertIsDialectable(client);
    assertIsEventable(client);
    assertIsPoolable(client);
    assertIsTransaction(transaction);
    assertIsPreparedStatement(preparedStatement);
    assertIsConnection(connection);
    assertIsClient(client);
  });

  await t.step("negative", () => {
    assertThrows(() => assertIsDialect({ name: "test" }));
    assertThrows(() => assertIsDriver({ connect: fn }));
    assertThrows(() => assertIsDriver({ ...driver, maxConnections: "1" }));
    assertThrows(() => assertIsDriverConnection(queryable));
    assertThrows(() =>
      assertIsDriverConnection({ ...driverConnection, prepare: 1 })
    );
    assertThrows(() => assertIsConnectable({}));
    assertThrows(() => assertIsPingable({}));
    assertThrows(() => assertIsQueryable({ execute: fn, query: fn }));
    assertThrows(() => assertIsPreparable({}));
    assertThrows(() => assertIsTransactionable({}));
    assertThrows(() => assertIsDialectable({}));
    assertThrows(() => assertIsEventable({}));
    assertThrows(() => assertIsPoolable({}));
    assertThrows(() => assertIsTransaction(queryable));
    assertThrows(() => assertIsPreparedStatement({}));
    assertThrows(() => assertIsConnection(client));
    assertThrows(() => assertIsClient(connection));
  });
});
