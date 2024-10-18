import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import { assertIsString, isString } from "./is_string.ts";

const VALID = [
  "",
  "asdf",
];

const INVALID = [
  1,
  undefined,
  null,
  {},
  [],
  [""],
  new String(),
];

Deno.test("isString > can detect strings", () => {
  for (const v of VALID) {
    assert(isString(v), `Value of '${v}' is not valid`);
  }
  for (const v of INVALID) {
    assertFalse(isString(v), `Value of '${v}' is not invalid`);
  }
});

Deno.test("assertIsString > can detect strings", () => {
  for (const v of VALID) {
    assertIsString(v);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertIsString(v),
      AssertionError,
      undefined,
      `Value of '${v}' did not throw`,
    );
  }
});
