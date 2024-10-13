import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import { assertIsNumeric, isNumeric } from "./is_numeric.ts";

const VALID = [
  0,
  1,
  1.123,
  1_123_12_3,
  -1,
  -1_1234,
  -1.123,
];

const INVALID = [
  NaN,
  "",
  "asdf",
  undefined,
  null,
  {},
  [],
  [""],
  new Number(),
];

Deno.test("isNumeric > can detect numerics", () => {
  for (const v of VALID) {
    assert(isNumeric(v), `Value of '${v}' is not valid`);
  }
  for (const v of INVALID) {
    assertFalse(isNumeric(v), `Value of '${v}' is not invalid`);
  }
});

Deno.test("assertIsNumeric > can detect numerics", () => {
  for (const v of VALID) {
    assertIsNumeric(v);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertIsNumeric(v),
      AssertionError,
      undefined,
      `Value of '${v}' did not throw`,
    );
  }
});
