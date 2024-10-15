import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import { assertIsNumber, isNumber } from "./is_number.ts";

const VALID = [
  0,
  1,
  1.123,
  1_123_12_3,
  -1,
  -1_1234,
  -1.123,
  NaN,
];

const INVALID = [
  "",
  "asdf",
  undefined,
  null,
  {},
  [],
  [""],
  new Number(),
];

Deno.test("isNumber > can detect numbers", () => {
  for (const v of VALID) {
    assert(isNumber(v), `Value of '${v}' is not valid`);
  }
  for (const v of INVALID) {
    assertFalse(isNumber(v), `Value of '${v}' is not invalid`);
  }
});

Deno.test("assertIsNumber > can detect numbers", () => {
  for (const v of VALID) {
    assertIsNumber(v);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertIsNumber(v),
      AssertionError,
      undefined,
      `Value of '${v}' did not throw`,
    );
  }
});
