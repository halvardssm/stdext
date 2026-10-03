import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import {
  ConnectionError,
  QueryError,
  TransactionError,
} from "../../sql/mod.ts";
import { testDriverIntegration } from "../../sql/testing.ts";
import { FAILING_URL, MemoryDriver, memorySql } from "./_memory_driver.ts";
import { onStatementDeallocate, onTransactionEnd, resetDriver } from "./mod.ts";

Deno.test("BaseDriver conformance", async (t) => {
  await testDriverIntegration(t, MemoryDriver, ["memory://"], memorySql);
});

Deno.test("BaseDriver", async (t) => {
  await t.step("merges the constructor query options", async () => {
    await using driver = new MemoryDriver("memory://", {
      queryOptions: {
        transformOutput: (value) => `${value}!`,
      },
    });
    await driver.connect();
    const ctx = await driver.query(memorySql.parameterQuery, ["a"], {
      transformInput: (value) => `${value}b`,
    });
    assertEquals(await ctx.toValues(), [["ab!"]]);
  });

  await t.step("wraps errors and dispatches error events", async () => {
    await using driver = new MemoryDriver("memory://");
    const errors: unknown[] = [];
    driver.eventTarget.addEventListener(
      "error",
      (event) =>
        errors.push((event as CustomEvent<{ error: unknown }>).detail.error),
    );
    await driver.connect();
    const error = await assertRejects(
      () => driver.query("SELEC"),
      QueryError,
      "Syntax error",
    );
    assertInstanceOf(error.cause, Error);
    await assertRejects(() => driver.execute("SELEC"), QueryError);
    // Each error is dispatched once.
    assertEquals(errors.length, 2);
    assertEquals(errors[0], error);
  });

  await t.step("rejects a failed connect with a ConnectionError", async () => {
    const driver = new MemoryDriver(FAILING_URL);
    const error = await assertRejects(() => driver.connect(), ConnectionError);
    assertEquals(error.message, "Connection refused");
    assertFalse(driver.connected);
  });

  await t.step("tracks the active transaction", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    assertFalse(driver.inTransaction);
    const tx = await driver.beginTransaction();
    assert(driver.inTransaction);
    // Transactions on the driver nest in the active transaction.
    const nested = await driver.beginTransaction();
    assertEquals(driver.statements.at(-1), "SAVEPOINT sp_1");
    await nested.commitTransaction();
    await tx.commitTransaction();
    assertFalse(driver.inTransaction);
  });

  await t.step("closing invalidates the transaction", async () => {
    const driver = new MemoryDriver("memory://");
    await driver.connect();
    const tx = await driver.beginTransaction();
    const nested = await tx.beginTransaction();
    await driver.close();
    assertFalse(tx.inTransaction);
    assertFalse(nested.inTransaction);
    assertFalse(driver.inTransaction);
  });

  await t.step("validates savepoint names", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    await using tx = await driver.beginTransaction();
    await tx.createSavepoint("a");
    await tx.createSavepoint("b");
    // Releasing a savepoint also releases the ones created after it.
    await tx.releaseSavepoint("a");
    await assertRejects(() => tx.releaseSavepoint(), TransactionError);
    await assertRejects(() => tx.createSavepoint("a b"), TransactionError);
    await assertRejects(
      () => tx.releaseSavepoint("a; DROP TABLE users"),
      TransactionError,
    );
  });

  await t.step("rolls back a nested transaction to its savepoint", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    await using tx = await driver.beginTransaction();
    const nested = await tx.beginTransaction();
    await nested.rollbackTransaction();
    assertEquals(driver.statements.slice(-2), [
      "ROLLBACK TO SAVEPOINT sp_1",
      "RELEASE SAVEPOINT sp_1",
    ]);
  });

  await t.step("deallocating after closing is a no-op", async () => {
    const driver = new MemoryDriver("memory://");
    await driver.connect();
    const stmt = await driver.prepare(memorySql.query);
    await driver.close();
    await stmt.deallocate();
    assert(stmt.deallocated);
  });
});

Deno.test("hooks", async (t) => {
  await t.step("onTransactionEnd runs after commit and rollback", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    const calls: string[] = [];
    const committed = await driver.beginTransaction();
    onTransactionEnd(committed, () => {
      calls.push("first");
    });
    onTransactionEnd(committed, () => {
      calls.push("second");
    });
    await committed.commitTransaction();
    assertEquals(calls, ["first", "second"]);

    const rolledBack = await driver.beginTransaction();
    onTransactionEnd(rolledBack, () => {
      calls.push("rollback");
    });
    await rolledBack.rollbackTransaction();
    assertEquals(calls, ["first", "second", "rollback"]);
  });

  await t.step("onStatementDeallocate runs once", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    let calls = 0;
    const stmt = await driver.prepare(memorySql.query);
    onStatementDeallocate(stmt, () => {
      calls++;
    });
    await stmt.deallocate();
    await stmt.deallocate();
    assertEquals(calls, 1);
  });

  await t.step("resetDriver rolls back the active transaction", async () => {
    await using driver = new MemoryDriver("memory://");
    await driver.connect();
    await resetDriver(driver);
    const tx = await driver.beginTransaction();
    await resetDriver(driver);
    assertFalse(tx.inTransaction);
    assertEquals(driver.statements.at(-1), "ROLLBACK");
  });
});
