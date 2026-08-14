import lib from "./ffi.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
} from "@std/assert";
import {
  SQLITE3_OK,
  SQLITE3_OPEN_CREATE,
  SQLITE3_OPEN_READWRITE,
} from "./constants.ts";

Deno.test("open and close database", () => {
  // Create a buffer for the database pointer
  const dbPtr = new BigUint64Array(1);

  // Open database
  const filename = new TextEncoder().encode(":memory:\0");
  const result = lib.sqlite3_open_v2(
    filename,
    dbPtr,
    SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE,
    null,
  );

  assertEquals(result, SQLITE3_OK, "Database should open successfully");
  assertNotEquals(dbPtr[0], 0n, "Database pointer should not be null");

  // Create pointer and close database
  const dbPointer = Deno.UnsafePointer.create(dbPtr[0]);
  const closeResult = lib.sqlite3_close_v2(dbPointer);
  assertEquals(closeResult, SQLITE3_OK, "Database should close successfully");
});

Deno.test("create table, insert and query rows", () => {
  // Create a buffer for the database pointer
  const dbPtr = new BigUint64Array(1);

  // Open database
  const filename = new TextEncoder().encode(":memory:\0");
  const openResult = lib.sqlite3_open_v2(
    filename,
    dbPtr,
    SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE,
    null,
  );

  assertEquals(openResult, SQLITE3_OK, "Database should open successfully");
  assertNotEquals(dbPtr[0], 0n, "Database pointer should not be null");

  const dbPointer = Deno.UnsafePointer.create(dbPtr[0]);

  // Create table
  const createTableSql = new TextEncoder().encode(
    "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)\0",
  );
  const createResult = lib.sqlite3_exec(
    dbPointer,
    createTableSql,
    null,
    null,
    null,
  );

  assertEquals(
    createResult,
    SQLITE3_OK,
    "Table should be created successfully",
  );

  // Insert rows
  const insertSql = new TextEncoder().encode(
    `INSERT INTO test (name, value) VALUES ('Alice', 100);
     INSERT INTO test (name, value) VALUES ('Bob', 200);
     INSERT INTO test (name, value) VALUES ('Charlie', 300);\0`,
  );

  const insertResult1 = lib.sqlite3_exec(
    dbPointer,
    insertSql,
    null,
    null,
    null,
  );

  assertEquals(
    insertResult1,
    SQLITE3_OK,
    "First row should be inserted successfully",
  );

  // Check that 3 rows were inserted
  const changes = lib.sqlite3_changes(dbPointer);
  assertEquals(changes, 1, "Should have 1 change from last insert");

  const totalChanges = lib.sqlite3_total_changes(dbPointer);
  assertEquals(totalChanges, 3, "Should have 3 total changes");

  // Query rows using prepare/step/finalize (alternative approach)
  const selectSql = new TextEncoder().encode(
    "SELECT id, name, value FROM test ORDER BY id\0",
  );
  const stmtPtr = new BigUint64Array(1);

  const prepareResult = lib.sqlite3_prepare_v2(
    dbPointer,
    selectSql,
    selectSql.byteLength,
    stmtPtr,
    null,
  );

  assertEquals(
    prepareResult,
    SQLITE3_OK,
    "Statement should be prepared successfully",
  );
  assert(stmtPtr[0] !== 0n, "Statement pointer should not be null");

  const stmtPointer = Deno.UnsafePointer.create(stmtPtr[0]);

  // Check column count
  const columnCount = lib.sqlite3_column_count(stmtPointer);
  assertEquals(columnCount, 3, "Should have 3 columns");

  // Step through results
  let rowCount = 0;
  let stepResult = lib.sqlite3_step(stmtPointer);

  const actual: { id: number; name: string; value: number }[] = [];

  while (stepResult === 100) { // SQLITE_ROW = 100
    rowCount++;

    // Extract column values
    const id = lib.sqlite3_column_int(stmtPointer, 0);
    const namePtr = lib.sqlite3_column_text(stmtPointer, 1);
    const value = lib.sqlite3_column_int(stmtPointer, 2);

    // Convert name pointer to string
    const name = namePtr ? Deno.UnsafePointerView.getCString(namePtr) : "NULL";

    actual.push({ id, name, value });

    stepResult = lib.sqlite3_step(stmtPointer);
  }

  assertEquals(rowCount, 3, "Should have retrieved 3 rows");
  assertEquals(stepResult, 101, "Should end with SQLITE_DONE (101)");

  const expected: typeof actual = [{ id: 1, name: "Alice", value: 100 }, {
    id: 2,
    name: "Bob",
    value: 200,
  }, { id: 3, name: "Charlie", value: 300 }];
  assertEquals(actual, expected);

  // Finalize statement
  const finalizeResult = lib.sqlite3_finalize(stmtPointer);
  assertEquals(
    finalizeResult,
    SQLITE3_OK,
    "Statement should be finalized successfully",
  );

  // Close database
  const closeResult = lib.sqlite3_close_v2(dbPointer);
  assertEquals(closeResult, SQLITE3_OK, "Database should close successfully");
});
