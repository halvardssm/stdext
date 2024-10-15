import { AssertionError } from "@std/assert";
import { objectToStringEquals } from "./utils.ts";

/**
 * Checks if a value is a Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  if (!objectToStringEquals("Object", value)) {
    return false;
  }

  if (typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  if (Object.getOwnPropertySymbols(value).length > 0) {
    return false;
  }

  return true;
}

/**
 * Asserts that a value is a record
 */
export function assertIsRecord(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AssertionError(`Value is not a Record, was '${value}'`);
  }
}
