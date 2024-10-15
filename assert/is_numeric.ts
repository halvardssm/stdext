import { AssertionError } from "@std/assert";
import { isNumber } from "./is_number.ts";

/**
 * Checks if a value is a number and not NaN
 */
export function isNumeric(value: unknown): value is number {
  return isNumber(value) && !Number.isNaN(value);
}

/**
 * Asserts that a value is a number and not NaN
 */
export function assertIsNumeric(value: unknown): asserts value is number {
  if (!isNumeric(value)) {
    throw new AssertionError(`Value is not a numeric, was '${value}'`);
  }
}
