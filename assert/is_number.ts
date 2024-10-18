import { AssertionError } from "@std/assert";

/**
 * Checks if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * Asserts that a value is a number
 */
export function assertIsNumber(
  value: unknown,
  msg?: string,
): asserts value is number {
  if (!isNumber(value)) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `Value is not a number, was '${value}'${msgSuffix}`;
    throw new AssertionError(message);
  }
}
