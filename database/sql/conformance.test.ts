import { MemoryDriver, memorySql } from "../drivers/_internal_memory/mod.ts";
import { SqlClient } from "./client.ts";
import { testClient, testDriver } from "./testing.ts";

// The conformance suites are tested against an in-memory reference driver,
// with the standard client on top of it.

Deno.test("Driver conformance", async (t) => {
  await testDriver(t, new MemoryDriver(), "memory://", memorySql);
});

Deno.test("Driver conformance without prepared statements", async (t) => {
  await testDriver(
    t,
    new MemoryDriver({ prepare: false }),
    "memory://",
    memorySql,
  );
});

Deno.test("Client conformance", async (t) => {
  const driver = new MemoryDriver();
  await testClient(
    t,
    (options) => new SqlClient(driver, "memory://", options),
    memorySql,
  );
});

Deno.test("Client conformance without prepared statements", async (t) => {
  const driver = new MemoryDriver({ prepare: false });
  await testClient(
    t,
    (options) => new SqlClient(driver, "memory://", options),
    memorySql,
  );
});

Deno.test("Client conformance with a single connection", async (t) => {
  const driver = new MemoryDriver({ maxConnections: 1 });
  await testClient(
    t,
    (options) => new SqlClient(driver, "memory://", options),
    memorySql,
  );
});
