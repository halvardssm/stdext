/**
 * Compares the `Object.prototype.toString` tag of the value against the
 * given name.
 *
 * Class instances have their constructor name as the tag, so this
 * distinguishes plain objects (`[object Object]`) from class instances
 * (`[object Date]`, ...) without walking the prototype chain.
 *
 * @param name The tag name to compare against, e.g. `"Object"`.
 * @param value The value to inspect.
 * @returns `true` if the value's tag is `[object name]`, `false` otherwise.
 *
 * @example
 * ```ts
 * import { objectToStringEquals } from "./utils.ts";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(objectToStringEquals("Object", {}));
 * assertFalse(objectToStringEquals("Object", new Date()));
 * assert(objectToStringEquals("Date", new Date()));
 * ```
 */
export function objectToStringEquals(name: string, value: unknown): boolean {
  const objectTag = `[object ${name}]`;
  return Object.prototype.toString.call(value) === objectTag;
}
