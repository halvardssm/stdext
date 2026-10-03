/**
 * Primitive schema constructors: `string()`, `number()`, `literal()`, ...
 * Each is a thin wrapper around {@linkcode createSchema} with a type check
 * as step 0. Add constraints by piping keyword actions onto them.
 *
 * @module
 */

import { checkConst, checkEnum } from "../keywords.ts";
import { stringify } from "../utils.ts";
import { fail, typeCheck } from "./actions.ts";
import { createSchema } from "./schema.ts";
import type { Action, Schema } from "./types.ts";

/**
 * Options shared by the primitive constructors.
 */
export interface PrimitiveOptions {
  /** Override the message of the type check. */
  message?: string;
}

/**
 * A string.
 *
 * @param options Constructor options.
 * @returns A schema accepting strings.
 *
 * @example
 * ```ts
 * import { minLength, pipe, string } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const name = pipe(string(), minLength(2));
 * assertEquals(validate(name, "ab"), { value: "ab" });
 * ```
 */
export function string(options?: PrimitiveOptions): Schema<string, string> {
  return createSchema("string", [
    typeCheck((v): v is string => typeof v === "string", "string"),
  ], options);
}

/**
 * A finite number.
 *
 * @param options Constructor options.
 * @returns A schema accepting finite numbers.
 */
export function number(options?: PrimitiveOptions): Schema<number, number> {
  return createSchema("number", [
    typeCheck(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
      "number",
    ),
  ], options);
}

/**
 * A safe integer.
 *
 * @param options Constructor options.
 * @returns A schema accepting safe integers.
 */
export function integer(options?: PrimitiveOptions): Schema<number, number> {
  return createSchema("integer", [
    typeCheck((v): v is number => Number.isSafeInteger(v), "integer"),
  ], options);
}

/**
 * A boolean.
 *
 * @param options Constructor options.
 * @returns A schema accepting booleans.
 */
export function boolean(
  options?: PrimitiveOptions,
): Schema<boolean, boolean> {
  return createSchema("boolean", [
    typeCheck((v): v is boolean => typeof v === "boolean", "boolean"),
  ], options);
}

/**
 * The `null` value.
 *
 * @param options Constructor options.
 * @returns A schema accepting only `null`.
 */
export function null_(options?: PrimitiveOptions): Schema<null, null> {
  return createSchema("null", [
    typeCheck((v): v is null => v === null, "null"),
  ], options);
}

/**
 * A valid `Date` instance. Pipe a `transform` for an asymmetric schema.
 *
 * @param options Constructor options.
 * @returns A schema accepting valid dates.
 *
 * @example
 * ```ts
 * import { date, pipe, transform } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const iso = pipe(date(), transform((d) => d.toISOString()));
 * assertEquals(validate(iso, new Date(0)), { value: "1970-01-01T00:00:00.000Z" });
 * ```
 */
export function date(options?: PrimitiveOptions): Schema<Date, Date> {
  return createSchema("date", [
    typeCheck(
      (v): v is Date => v instanceof Date && !Number.isNaN(v.getTime()),
      "date",
    ),
  ], options);
}

/**
 * Accepts any value (JSON Schema `true`).
 *
 * @returns A schema accepting everything.
 */
export function unknown(): Schema<unknown, unknown> {
  return createSchema("unknown", []);
}

/**
 * Rejects every value (JSON Schema `false`).
 *
 * @returns A schema that always fails.
 */
export function never(): Schema<never, never> {
  const action: Action<unknown, never> = {
    kind: "never",
    run: (value) =>
      fail(
        `Schema defines the property as false, this will always fail: ${
          stringify(value)
        }`,
        { kind: "never", actual: value },
      ),
  };
  return createSchema("never", [action]);
}

type Primitive = string | number | boolean | null;

/**
 * Exactly one value (JSON Schema `const`; named `const_` because `const`
 * is reserved).
 *
 * @param value The allowed value.
 * @param options Constructor options.
 * @returns A schema accepting only that value.
 *
 * @example
 * ```ts
 * import { const_ } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(validate(const_("a"), "a"), { value: "a" });
 * ```
 */
export function const_<const T extends Primitive>(
  value: T,
  options?: PrimitiveOptions,
): Schema<T, T> {
  const action: Action<unknown, T> = {
    kind: "const",
    run: (v) => {
      const issue = checkConst(v, value);
      return issue ? fail(issue.message, issue) : v as T;
    },
  };
  return createSchema("const", [action], { ...options, def: { value } });
}

/**
 * One of several values (JSON Schema `enum`).
 *
 * @param values The allowed values.
 * @param options Constructor options.
 * @returns A schema accepting only those values.
 */
export function enum_<const T extends readonly Primitive[]>(
  values: T,
  options?: PrimitiveOptions,
): Schema<T[number], T[number]> {
  const action: Action<unknown, T[number]> = {
    kind: "enum",
    run: (v) => {
      const issue = checkEnum(v, values);
      return issue ? fail(issue.message, issue) : v as T[number];
    },
  };
  return createSchema("enum", [action], { ...options, def: { values } });
}
