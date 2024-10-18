import { AssertionError } from "@std/assert";
import { isObject } from "./is_object.ts";

/**
 * Checks if a value is a Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
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
  msg?: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `Value is not a Record, was '${value}'${msgSuffix}`;
    throw new AssertionError(message);
  }
}
