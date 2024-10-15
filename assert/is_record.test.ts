import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import { assertIsRecord, isRecord } from "./is_record.ts";

const VALID = [
  {},
  { a: 1 },
  { 1: "a" },
];

const INVALID = [
  { [Symbol.dispose]: "" },
  "",
  1,
  undefined,
  null,
  [],
  [""],
  new Map(),
];

Deno.test("isRecord > can detect records", () => {
  for (const v of VALID) {
    assert(isRecord(v), `Value of '${v}' is not valid`);
  }
  for (const v of INVALID) {
    assertFalse(isRecord(v), `Value of '${v}' is not invalid`);
  }
});

Deno.test("assertIsRecord > can detect records", () => {
  for (const v of VALID) {
    assertIsRecord(v);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertIsRecord(v),
      AssertionError,
      undefined,
      `Value of '${v}' did not throw`,
    );
  }
});
