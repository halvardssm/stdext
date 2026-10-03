import { assert, assertFalse, AssertionError, assertThrows } from "@std/assert";
import {
  assertObjectHasProperties,
  assertObjectHasPropertiesDeep,
  objectHasProperties,
  objectHasPropertiesDeep,
} from "./object_has_properties.ts";

const VALID: Array<[object, Array<PropertyKey>]> = [
  [{ [Symbol.for("test")]: 0 }, [Symbol.for("test")]],
  [{ 1: 0 }, [1]],
  [{ 0: 0 }, [0]],
  [{ "": 0 }, [""]],
  [{ "test": 0 }, ["test"]],
];

const INVALID: Array<[object, Array<PropertyKey>]> = [
  [{}, [Symbol.for("test")]],
  [{ [Symbol.for("test2")]: 0 }, [Symbol.for("test")]],
  [{}, [1]],
  [{}, [""]],
  [{}, ["test"]],
];

class NestedClass extends (class {
  get test() {
    return "test";
  }
}) {}
const nestedClass = new NestedClass();

const INVALID_NOT_DEEP: Array<[object, Array<PropertyKey>]> = [
  ...INVALID,
  [nestedClass, ["test"]],
];
const VALID_DEEP: Array<[object, Array<PropertyKey>]> = [
  ...VALID,
  [nestedClass, ["test"]],
];

Deno.test("objectHasProperties > can detect all property keys", () => {
  for (const v of VALID) {
    assert(
      objectHasProperties(v[0], v[1]),
      `Value of '${JSON.stringify(v)}' is not valid`,
    );
  }
  for (const v of INVALID_NOT_DEEP) {
    assertFalse(
      objectHasProperties(v[0], v[1]),
      `Value of '${JSON.stringify(v)}' is not invalid`,
    );
  }
});

Deno.test("assertObjectHasProperties > can detect all property keys", () => {
  for (const v of VALID) {
    assertObjectHasProperties(v[0], v[1]);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertObjectHasProperties(v[0], v[1]),
      AssertionError,
    );
  }
});

Deno.test("objectHasPropertiesDeep > can detect all property keys", () => {
  for (const v of VALID_DEEP) {
    assert(
      objectHasPropertiesDeep(v[0], v[1]),
      `Value of '${JSON.stringify(v)}' is not valid`,
    );
  }
  for (const v of INVALID) {
    assertFalse(
      objectHasPropertiesDeep(v[0], v[1]),
      `Value of '${JSON.stringify(v)}' is not invalid`,
    );
  }
});

Deno.test("assertObjectHasPropertiesDeep > can detect all property keys", () => {
  for (const v of VALID) {
    assertObjectHasPropertiesDeep(v[0], v[1]);
  }
  for (const v of INVALID) {
    assertThrows(
      () => assertObjectHasPropertiesDeep(v[0], v[1]),
      AssertionError,
    );
  }
});
