import { AssertionError } from "@std/assert";

/**
 * Checks if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Asserts that a value is a string
 */
export function assertIsString(value: unknown): asserts value is string {
  if (!isString(value)) {
    throw new AssertionError(`Value is not a string, was '${value}'`);
  }
}
