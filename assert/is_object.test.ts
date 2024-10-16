import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import { assertIsObject, isObject } from "./is_object.ts";

const VALID = [
  {},
  { a: 1 },
  { 1: "a" },
  { [Symbol.dispose]: "" },
];

const INVALID = [
  "",
  1,
  undefined,
  null,
  [],
  [""],
  new Map(),
];

Deno.test("isObject > can detect records", () => {
  for (const v of VALID) {
    assert(isObject(v), `Value of '${v}' is not valid`);
  }
  for (const v of INVALID) {
    assertFalse(isObject(v), `Value of '${v}' is not invalid`);
  }
});

Deno.test("assertIsObject > can detect records", () => {
  for (const v of VALID) {
    assertIsObject(v);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertIsObject(v),
      AssertionError,
      undefined,
      `Value of '${v}' did not throw`,
    );
  }
});
