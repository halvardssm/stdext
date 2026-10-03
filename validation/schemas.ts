/**
 * Basic schemas built with {@linkcode createSchema}: {@linkcode string},
 * {@linkcode integer}, {@linkcode float}, {@linkcode number}, {@linkcode boolean},
 * and the wrappers {@linkcode nullable} and {@linkcode optional}.
 *
 * Every schema function takes an options argument. The options are
 * placeholders for now: they are accepted and ignored, so constraints (such as
 * a minimum length) can be added later without changing the signatures.
 *
 * @example
 * ```ts
 * import { nullable, optional, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const name = optional(nullable(string()));
 * // Schema<string | null | undefined, string | null | undefined, "optional">
 *
 * assertEquals(validate(name, "Alice"), { value: "Alice" });
 * assertEquals(validate(name, null), { value: null });
 * assertEquals(validate(name, undefined), { value: undefined });
 * assertEquals(validate(name, 1).issues?.length, 1);
 * ```
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  type CombinedSchemaV1,
  createSchema,
  type Issue,
  type Schema,
} from "./core.ts";

/** The JavaScript type of a value, with `null` and arrays told apart. */
function typeOf(value: unknown): string {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

/** The issue for a value that is not of the expected type. */
function typeIssue(expected: string, actual: unknown): { issues: Issue[] } {
  return {
    issues: [{
      kind: "type",
      message: `Expected ${expected}, received ${typeOf(actual)}`,
      expected,
      actual,
    }],
  };
}

/**
 * Options for {@linkcode string}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface StringOptions {}

/**
 * A string.
 *
 * @example
 * ```ts
 * import { string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = string();
 * // Schema<string, string, "string">
 *
 * assertEquals(validate(schema, "a"), { value: "a" });
 * assertEquals(validate(schema, 1).issues?.[0].message, "Expected a string, received number");
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting strings
 */
export function string(
  // deno-lint-ignore no-unused-vars
  options?: StringOptions,
): Schema<string, string, "string"> {
  return createSchema("string", {
    validate: (value) =>
      typeof value === "string" ? { value } : typeIssue("a string", value),
    jsonSchema: {
      input: () => ({ type: "string" }),
      output: () => ({ type: "string" }),
    },
  });
}

/**
 * Options for {@linkcode integer}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface IntOptions {}

/**
 * An integer: a number without a fractional part. `1`, `1.0` and `1e20` are
 * integers, `1.5`, `NaN` and `Infinity` are not.
 *
 * @example
 * ```ts
 * import { integer } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = integer();
 * // Schema<number, number, "integer">
 *
 * assertEquals(validate(schema, 1), { value: 1 });
 * assertEquals(validate(schema, 1.5).issues?.length, 1);
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting integers
 */
export function integer(
  // deno-lint-ignore no-unused-vars
  options?: IntOptions,
): Schema<number, number, "integer"> {
  return createSchema("integer", {
    validate: (value) =>
      typeof value === "number" && Number.isInteger(value)
        ? { value }
        : typeIssue("an integer", value),
    jsonSchema: {
      input: () => ({ type: "integer" }),
      output: () => ({ type: "integer" }),
    },
  });
}

/**
 * Options for {@linkcode float}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface FloatOptions {}

/**
 * A finite floating point number. Integers are floats too; `NaN` and
 * `Infinity` are not accepted.
 *
 * @example
 * ```ts
 * import { float } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = float();
 * // Schema<number, number, "float">
 *
 * assertEquals(validate(schema, 1.5), { value: 1.5 });
 * assertEquals(validate(schema, NaN).issues?.length, 1);
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting finite numbers
 */
export function float(
  // deno-lint-ignore no-unused-vars
  options?: FloatOptions,
): Schema<number, number, "float"> {
  return createSchema("float", {
    validate: (value) =>
      typeof value === "number" && Number.isFinite(value)
        ? { value }
        : typeIssue("a finite number", value),
    jsonSchema: {
      input: () => ({ type: "number" }),
      output: () => ({ type: "number" }),
    },
  });
}

/**
 * Options for {@linkcode number}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NumberOptions {}

/**
 * Any JavaScript number, including `NaN` and `Infinity`. Use {@linkcode float}
 * for finite numbers and {@linkcode integer} for integers.
 *
 * The JSON Schema is `{ type: "number" }`, which cannot express `NaN` or
 * `Infinity`.
 *
 * @example
 * ```ts
 * import { number } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = number();
 * // Schema<number, number, "number">
 *
 * assertEquals(validate(schema, 1.5), { value: 1.5 });
 * assertEquals(validate(schema, Infinity), { value: Infinity });
 * assertEquals(validate(schema, "1").issues?.length, 1);
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting numbers
 */
export function number(
  // deno-lint-ignore no-unused-vars
  options?: NumberOptions,
): Schema<number, number, "number"> {
  return createSchema("number", {
    validate: (value) =>
      typeof value === "number" ? { value } : typeIssue("a number", value),
    jsonSchema: {
      input: () => ({ type: "number" }),
      output: () => ({ type: "number" }),
    },
  });
}

/**
 * Options for {@linkcode boolean}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface BoolOptions {}

/**
 * A boolean.
 *
 * @example
 * ```ts
 * import { boolean } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = boolean();
 * // Schema<boolean, boolean, "boolean">
 *
 * assertEquals(validate(schema, false), { value: false });
 * assertEquals(validate(schema, 0).issues?.length, 1);
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting booleans
 */
export function boolean(
  // deno-lint-ignore no-unused-vars
  options?: BoolOptions,
): Schema<boolean, boolean, "boolean"> {
  return createSchema("boolean", {
    validate: (value) =>
      typeof value === "boolean" ? { value } : typeIssue("a boolean", value),
    jsonSchema: {
      input: () => ({ type: "boolean" }),
      output: () => ({ type: "boolean" }),
    },
  });
}

/**
 * Options for {@linkcode nullable}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NullableOptions {}

/**
 * Accepts `null` in addition to what `schema` accepts. Any other value is
 * validated by `schema`, which may be async.
 *
 * The JSON Schema is `{ anyOf: [<schema>, { type: "null" }] }`.
 *
 * @example
 * ```ts
 * import { nullable, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = nullable(string());
 * // Schema<string | null, string | null, "nullable">
 *
 * assertEquals(validate(schema, null), { value: null });
 * assertEquals(validate(schema, "a"), { value: "a" });
 * assertEquals(validate(schema, 1).issues?.length, 1);
 * assertEquals(
 *   schema["~standard"].jsonSchema.input({ target: "draft-2020-12" }),
 *   { anyOf: [{ type: "string" }, { type: "null" }] },
 * );
 * ```
 *
 * @param schema The schema for values that are not `null`
 * @param options Placeholder, not used yet
 * @returns A schema accepting `null` and what `schema` accepts
 */
export function nullable<TSchema extends CombinedSchemaV1>(
  schema: TSchema,
  // deno-lint-ignore no-unused-vars
  options?: NullableOptions,
): Schema<
  StandardSchemaV1.InferInput<TSchema> | null,
  StandardSchemaV1.InferOutput<TSchema> | null,
  "nullable"
> {
  // The nested schema is only known as `CombinedSchemaV1` inside, so the
  // result is restated in terms of its inferred input and output types.
  return createSchema("nullable", {
    validate: (value, validateOptions) =>
      value === null
        ? { value: null }
        : schema["~standard"].validate(value, validateOptions),
    jsonSchema: {
      input: (jsonOptions) => ({
        anyOf: [schema["~standard"].jsonSchema.input(jsonOptions), {
          type: "null",
        }],
      }),
      output: (jsonOptions) => ({
        anyOf: [schema["~standard"].jsonSchema.output(jsonOptions), {
          type: "null",
        }],
      }),
    },
  }) as unknown as Schema<
    StandardSchemaV1.InferInput<TSchema> | null,
    StandardSchemaV1.InferOutput<TSchema> | null,
    "nullable"
  >;
}

/**
 * Options for {@linkcode optional}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface OptionalOptions {}

/**
 * Accepts `undefined` in addition to what `schema` accepts. Any other value is
 * validated by `schema`, which may be async.
 *
 * JSON has no `undefined`, so the JSON Schema is the one of `schema`:
 * whether a property may be absent is expressed by the object that holds it
 * (its `required` list).
 *
 * @example
 * ```ts
 * import { optional, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = optional(string());
 * // Schema<string | undefined, string | undefined, "optional">
 *
 * assertEquals(validate(schema, undefined), { value: undefined });
 * assertEquals(validate(schema, "a"), { value: "a" });
 * assertEquals(validate(schema, 1).issues?.length, 1);
 * assertEquals(
 *   schema["~standard"].jsonSchema.input({ target: "draft-2020-12" }),
 *   { type: "string" },
 * );
 * ```
 *
 * @param schema The schema for values that are not `undefined`
 * @param options Placeholder, not used yet
 * @returns A schema accepting `undefined` and what `schema` accepts
 */
export function optional<TSchema extends CombinedSchemaV1>(
  schema: TSchema,
  // deno-lint-ignore no-unused-vars
  options?: OptionalOptions,
): Schema<
  StandardSchemaV1.InferInput<TSchema> | undefined,
  StandardSchemaV1.InferOutput<TSchema> | undefined,
  "optional"
> {
  // See `nullable` for why the result is restated.
  return createSchema("optional", {
    validate: (value, validateOptions) =>
      value === undefined
        ? { value: undefined }
        : schema["~standard"].validate(value, validateOptions),
    jsonSchema: {
      input: (jsonOptions) => schema["~standard"].jsonSchema.input(jsonOptions),
      output: (jsonOptions) =>
        schema["~standard"].jsonSchema.output(jsonOptions),
    },
  }) as unknown as Schema<
    StandardSchemaV1.InferInput<TSchema> | undefined,
    StandardSchemaV1.InferOutput<TSchema> | undefined,
    "optional"
  >;
}
