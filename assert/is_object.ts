import { AssertionError } from "@std/assert";
import { objectToStringEquals } from "./utils.ts";

/**
 * Checks if a value is an object
 */
export function isObject(value: unknown): value is object {
  if (!objectToStringEquals("Object", value)) {
    return false;
  }

  return true;
}

/**
 * Asserts that a value is an object
 */
export function assertIsObject(
  value: unknown,
  msg?: string,
): asserts value is object {
  if (!isObject(value)) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `Value is not a object, was '${value}'${msgSuffix}`;
    throw new AssertionError(message);
  }
}
