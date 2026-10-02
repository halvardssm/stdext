import { assertThrows } from "@std/assert";
import {
  assertIsClient,
  assertIsConnectable,
  assertIsDriver,
  assertIsDriverable,
  assertIsEventable,
  assertIsPingable,
  assertIsPoolable,
  assertIsPoolClient,
  assertIsPreparable,
  assertIsPreparedStatement,
  assertIsQueryable,
  assertIsTransaction,
  assertIsTransactionable,
} from "./asserts.ts";

const asyncDispose = () => ({ [Symbol.asyncDispose]: () => {} });

const connectable = {
  ...asyncDispose(),
  connectionUrl: "test",
  connected: false,
  connect: () => {},
  close: () => {},
};

const preparedStatement = {
  ...asyncDispose(),
  sql: "SELECT 1",
  deallocated: false,
  deallocate: () => {},
  execute: () => {},
  query: () => {},
};

const transaction = {
  ...asyncDispose(),
  ...preparedStatement,
  prepare: () => {},
  beginTransaction: () => {},
  transaction: () => {},
  inTransaction: true,
  commitTransaction: () => {},
  rollbackTransaction: () => {},
  createSavepoint: () => {},
  releaseSavepoint: () => {},
};

const driver = {
  options: {},
  eventTarget: new EventTarget(),
  ...connectable,
  ping: () => {},
  ...preparedStatement,
  prepare: () => {},
  beginTransaction: () => {},
  transaction: () => {},
};

const poolClient = {
  ...asyncDispose(),
  driver,
  connected: true,
  disposed: false,
  release: () => {},
  remove: () => {},
  ping: () => {},
  ...preparedStatement,
  prepare: () => {},
  beginTransaction: () => {},
  transaction: () => {},
};

const client = {
  options: {},
  eventTarget: new EventTarget(),
  ...connectable,
  ping: () => {},
  ...preparedStatement,
  prepare: () => {},
  beginTransaction: () => {},
  transaction: () => {},
  acquire: () => {},
};

Deno.test("asserts", async (t) => {
  await t.step("positive", () => {
    assertIsConnectable(connectable);
    assertIsPingable(driver);
    assertIsQueryable(driver);
    assertIsPreparable(driver);
    assertIsTransactionable(driver);
    assertIsTransaction(transaction);
    assertIsPreparedStatement(preparedStatement);
    assertIsPoolable(client);
    assertIsPoolClient(poolClient);
    assertIsDriverable(poolClient);
    assertIsEventable(driver);
    assertIsDriver(driver);
    assertIsClient(client);
  });

  await t.step("negative", () => {
    assertThrows(() => assertIsConnectable({}));
    assertThrows(() => assertIsPingable({}));
    assertThrows(() => assertIsQueryable({}));
    assertThrows(() => assertIsPreparable({}));
    assertThrows(() => assertIsTransactionable({}));
    assertThrows(() => assertIsTransaction({}));
    assertThrows(() => assertIsPreparedStatement({}));
    assertThrows(() => assertIsPoolable({}));
    assertThrows(() => assertIsPoolClient({}));
    assertThrows(() => assertIsDriverable({}));
    assertThrows(() => assertIsEventable({}));
    assertThrows(() => assertIsDriver(connectable));
    assertThrows(() => assertIsClient(driver));
  });
});
