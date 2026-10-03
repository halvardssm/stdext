import { testClientIntegration, testDriverIntegration } from "./testing.ts";
import {
  MemoryClient,
  MemoryDriver,
  memorySql,
} from "../drivers/core/_memory_driver.ts";

// The conformance suite is tested against an in-memory reference driver built
// on the core driver classes.

Deno.test("Driver conformance", async (t) => {
  await testDriverIntegration(t, MemoryDriver, ["memory://"], memorySql);
});

Deno.test("Client conformance", async (t) => {
  await testClientIntegration(
    t,
    MemoryClient,
    ["memory://", { poolOptions: { maxSize: 2 } }],
    memorySql,
  );
});

Deno.test("Client conformance with a single connection", async (t) => {
  await testClientIntegration(t, MemoryClient, ["memory://"], memorySql);
});
