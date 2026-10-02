import { AssertionError } from "@std/assert";
import { objectToStringEquals } from "./utils.ts";

/**
 * Checks if a value is a `Record<string, unknown>`.
 *
 * Only plain objects pass: class instances fail (their `Object.prototype.toString`
 * tag differs), as do arrays, `null` and objects with symbol keys.
 *
 * @param value The value to check.
 * @returns `true` if the value is a plain object without symbol keys,
 * `false` otherwise.
 *
 * @example
 * ```ts
 * import { isRecord } from "@stdext/assert";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(isRecord({}));
 * assert(isRecord({ key: "value" }));
 * assertFalse(isRecord(null));
 * assertFalse(isRecord([]));
 * assertFalse(isRecord(new Date())); // not a plain object
 * ```
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
 * Asserts that a value is a `Record<string, unknown>`, narrowing the type
 * for the rest of the block.
 *
 * @param value The value to check.
 * @throws {AssertionError} If the value is not a plain object, or has
 * symbol keys.
 *
 * @example
 * ```ts
 * import { assertIsRecord } from "@stdext/assert";
 * import { assertThrows } from "@std/assert";
 *
 * assertIsRecord({ key: "value" });
 * assertThrows(() => assertIsRecord("not a record"));
 * ```
 */
export function assertIsRecord(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AssertionError(`Value is not a Record, was '${value}'`);
  }
}
