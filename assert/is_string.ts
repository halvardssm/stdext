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
export function assertIsString(
  value: unknown,
  msg?: string,
): asserts value is string {
  if (!isString(value)) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `Value is not a string, was '${value}'${msgSuffix}`;
    throw new AssertionError(message);
  }
}
