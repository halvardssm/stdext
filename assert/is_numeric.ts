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
export function assertIsNumeric(
  value: unknown,
  msg?: string,
): asserts value is number {
  if (!isNumeric(value)) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `Value is not a numeric, was '${value}'${msgSuffix}`;
    throw new AssertionError(message);
  }
}
