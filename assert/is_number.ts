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
export function assertIsNumber(value: unknown): asserts value is number {
  if (!isNumber(value)) {
    throw new AssertionError(`Value is not a number, was '${value}'`);
  }
}
