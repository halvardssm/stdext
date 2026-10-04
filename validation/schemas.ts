/**
 * Basic schemas built with {@linkcode createSchema}: {@linkcode string},
 * {@linkcode integer}, {@linkcode float}, {@linkcode number},
 * {@linkcode boolean}, {@linkcode symbol}, {@linkcode func}, {@linkcode null_},
 * {@linkcode literal}, {@linkcode enumerator}, {@linkcode instanceOf},
 * {@linkcode unknown} and {@linkcode never}, and the wrappers {@linkcode nullable}, {@linkcode optional} and
 * {@linkcode nullish}.
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
  failure,
  jsonSchemaOf,
  type Schema,
  typeIssue,
  typeOf,
} from "./core.ts";
import { stringify, validateAsync } from "./utils.ts";

/** A value in a message: strings are quoted, so `"1"` and `1` differ. */
function show(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : stringify(value);
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
    jsonSchema: jsonSchemaOf(() => ({ type: "string" })),
  });
}

/**
 * Options for {@linkcode integer}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface IntegerOptions {}

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
  options?: IntegerOptions,
): Schema<number, number, "integer"> {
  return createSchema("integer", {
    validate: (value) =>
      typeof value === "number" && Number.isInteger(value)
        ? { value }
        : typeIssue("an integer", value),
    jsonSchema: jsonSchemaOf(() => ({ type: "integer" })),
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
    jsonSchema: jsonSchemaOf(() => ({ type: "number" })),
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
    jsonSchema: jsonSchemaOf(() => ({ type: "number" })),
  });
}

/**
 * Options for {@linkcode boolean}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface BooleanOptions {}

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
  options?: BooleanOptions,
): Schema<boolean, boolean, "boolean"> {
  return createSchema("boolean", {
    validate: (value) =>
      typeof value === "boolean" ? { value } : typeIssue("a boolean", value),
    jsonSchema: jsonSchemaOf(() => ({ type: "boolean" })),
  });
}

/**
 * The schema behind {@linkcode nullable}, {@linkcode optional} and
 * {@linkcode nullish}: values for which `isExtra` is true are accepted as they
 * are, every other value is validated by `schema`.
 *
 * With `addsNull` the JSON Schema is `{ anyOf: [<schema>, { type: "null" }] }`,
 * otherwise it is the one of `schema`: JSON has no `undefined`, so whether a
 * property may be absent is expressed by the object that holds it.
 */
function wrap<TSchema extends CombinedSchemaV1, TExtra, TKind extends string>(
  kind: TKind,
  schema: TSchema,
  isExtra: (value: unknown) => value is TExtra,
  addsNull: boolean,
): Schema<
  StandardSchemaV1.InferInput<TSchema> | TExtra,
  StandardSchemaV1.InferOutput<TSchema> | TExtra,
  TKind
> {
  // The nested schema is only known as `CombinedSchemaV1` inside, so the
  // result is restated in terms of its inferred input and output types.
  return createSchema(kind, {
    validate: (value, validateOptions) =>
      isExtra(value)
        ? { value }
        : validateAsync(schema, value, validateOptions),
    jsonSchema: jsonSchemaOf((convert) =>
      addsNull
        ? { anyOf: [convert(schema), { type: "null" }] }
        : convert(schema)
    ),
  }) as unknown as Schema<
    StandardSchemaV1.InferInput<TSchema> | TExtra,
    StandardSchemaV1.InferOutput<TSchema> | TExtra,
    TKind
  >;
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
 * @template TSchema The schema for the values that are not `null`
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
  return wrap(
    "nullable",
    schema,
    (value): value is null => value === null,
    true,
  );
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
 * @template TSchema The schema for the values that are not `undefined`
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
  return wrap(
    "optional",
    schema,
    (value): value is undefined => value === undefined,
    false,
  );
}

/**
 * Options for {@linkcode null_}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NullOptions {}

/**
 * The value `null`. Named `null_` because `null` is a reserved word. To accept
 * `null` in addition to something else, use {@linkcode nullable}.
 *
 * @example
 * ```ts
 * import { null_ } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = null_();
 * // Schema<null, null, "null">
 *
 * assertEquals(validate(schema, null), { value: null });
 * assertEquals(validate(schema, undefined).issues?.length, 1);
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting only `null`
 */
export function null_(
  // deno-lint-ignore no-unused-vars
  options?: NullOptions,
): Schema<null, null, "null"> {
  return createSchema("null", {
    validate: (value) => value === null ? { value } : typeIssue("null", value),
    jsonSchema: jsonSchemaOf(() => ({ type: "null" })),
  });
}

/**
 * Options for {@linkcode literal}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface LiteralOptions {}

/**
 * Exactly one value, compared with `===`. The type is the literal type of the
 * value, so `literal("admin")` is a schema of `"admin"`.
 *
 * The JSON Schema is `{ const: value }`.
 *
 * @example
 * ```ts
 * import { literal } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = literal("admin");
 * // Schema<"admin", "admin", "literal">
 *
 * assertEquals(validate(schema, "admin"), { value: "admin" });
 * assertEquals(validate(schema, "user").issues?.[0].message, 'Expected "admin", received "user"');
 * ```
 *
 * @template T The literal type of the value
 * @param literalValue The only accepted value
 * @param options Placeholder, not used yet
 * @returns A schema accepting only that value
 */
export function literal<const T extends string | number | boolean | null>(
  literalValue: T,
  // deno-lint-ignore no-unused-vars
  options?: LiteralOptions,
): Schema<T, T, "literal"> {
  return createSchema("literal", {
    validate: (value) =>
      value === literalValue ? { value: literalValue } : failure(
        "literal",
        `Expected ${show(literalValue)}, received ${show(value)}`,
        { expected: literalValue, actual: value },
      ),
    jsonSchema: jsonSchemaOf(() => ({ const: literalValue })),
  }) as unknown as Schema<T, T, "literal">;
}

/**
 * Options for {@linkcode enumerator}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface EnumeratorOptions {}

/**
 * One of several values, compared with `===`. The type is the union of the
 * values, so `enumerator(["a", "b"])` is a schema of `"a" | "b"`.
 *
 * The JSON Schema is `{ enum: values }`.
 *
 * @example
 * ```ts
 * import { enumerator } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = enumerator(["on", "off"]);
 * // Schema<"on" | "off", "on" | "off", "enumerator">
 *
 * assertEquals(validate(schema, "on"), { value: "on" });
 * assertEquals(validate(schema, "dim").issues?.[0].message, 'Expected one of ["on","off"], received "dim"');
 * ```
 *
 * @template T The tuple of accepted values
 * @param values The accepted values
 * @param options Placeholder, not used yet
 * @returns A schema accepting only those values
 */
export function enumerator<
  const T extends readonly (string | number | boolean | null)[],
>(
  values: T,
  // deno-lint-ignore no-unused-vars
  options?: EnumeratorOptions,
): Schema<T[number], T[number], "enumerator"> {
  return createSchema("enumerator", {
    validate: (value) =>
      values.some((accepted) => accepted === value)
        ? { value: value as T[number] }
        : failure(
          "enumerator",
          `Expected one of ${JSON.stringify(values)}, received ${show(value)}`,
          { expected: values, actual: value },
        ),
    jsonSchema: jsonSchemaOf(() => ({ enum: [...values] })),
  });
}

/**
 * Options for {@linkcode unknown}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface UnknownOptions {}

/**
 * Any value. The JSON Schema is `{}`, which accepts everything.
 *
 * @example
 * ```ts
 * import { unknown } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = unknown();
 * // Schema<unknown, unknown, "unknown">
 *
 * assertEquals(validate(schema, { any: "thing" }), { value: { any: "thing" } });
 * assertEquals(validate(schema, undefined), { value: undefined });
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting every value
 */
export function unknown(
  // deno-lint-ignore no-unused-vars
  options?: UnknownOptions,
): Schema<unknown, unknown, "unknown"> {
  return createSchema("unknown", {
    validate: (value) => ({ value }),
    jsonSchema: jsonSchemaOf(() => ({})),
  });
}

/**
 * Options for {@linkcode never}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NeverOptions {}

/**
 * No value: every value is rejected. The JSON Schema is `{ not: {} }`, which
 * rejects everything.
 *
 * @example
 * ```ts
 * import { never } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = never();
 * // Schema<never, never, "never">
 *
 * assertEquals(validate(schema, 1).issues?.[0].message, "Expected no value, received number");
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema rejecting every value
 */
export function never(
  // deno-lint-ignore no-unused-vars
  options?: NeverOptions,
): Schema<never, never, "never"> {
  return createSchema("never", {
    validate: (value) => typeIssue("no value", value),
    jsonSchema: jsonSchemaOf(() => ({ not: {} })),
  });
}

/**
 * Options for {@linkcode nullish}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NullishOptions {}

/**
 * Accepts `null` and `undefined` in addition to what `schema` accepts: the
 * same as `nullable(optional(schema))`.
 *
 * The JSON Schema is `{ anyOf: [<schema>, { type: "null" }] }`.
 *
 * @example
 * ```ts
 * import { nullish, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = nullish(string());
 * // Schema<string | null | undefined, string | null | undefined, "nullish">
 *
 * assertEquals(validate(schema, null), { value: null });
 * assertEquals(validate(schema, undefined), { value: undefined });
 * assertEquals(validate(schema, "a"), { value: "a" });
 * ```
 *
 * @template TSchema The schema for the values that are neither `null` nor `undefined`
 * @param schema The schema for values that are neither `null` nor `undefined`
 * @param options Placeholder, not used yet
 * @returns A schema accepting `null`, `undefined` and what `schema` accepts
 */
export function nullish<TSchema extends CombinedSchemaV1>(
  schema: TSchema,
  // deno-lint-ignore no-unused-vars
  options?: NullishOptions,
): Schema<
  StandardSchemaV1.InferInput<TSchema> | null | undefined,
  StandardSchemaV1.InferOutput<TSchema> | null | undefined,
  "nullish"
> {
  return wrap(
    "nullish",
    schema,
    (value): value is null | undefined => value === null || value === undefined,
    true,
  );
}

/**
 * Options for {@linkcode symbol}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface SymbolOptions {}

/**
 * A symbol, such as `Symbol("id")` or `Symbol.iterator`.
 *
 * Symbols do not exist in JSON, so the JSON Schema is `{}`, which accepts
 * everything.
 *
 * @example
 * ```ts
 * import { symbol } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = symbol();
 * // Schema<symbol, symbol, "symbol">
 *
 * assertEquals(validate(schema, Symbol.iterator), { value: Symbol.iterator });
 * assertEquals(validate(schema, "id").issues?.[0].message, "Expected a symbol, received string");
 * ```
 *
 * @param options Placeholder, not used yet
 * @returns A schema accepting symbols
 */
export function symbol(
  // deno-lint-ignore no-unused-vars
  options?: SymbolOptions,
): Schema<symbol, symbol, "symbol"> {
  return createSchema("symbol", {
    validate: (value) =>
      typeof value === "symbol" ? { value } : typeIssue("a symbol", value),
    jsonSchema: jsonSchemaOf(() => ({})),
  });
}

/**
 * Options for {@linkcode instanceOf}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface InstanceOfOptions {}

/** A class, including abstract classes and built-ins such as `Date`. */
// deno-lint-ignore no-explicit-any
export type Class = abstract new (...args: any[]) => any;

/** The name of the class of a value, or its type for non-objects. */
function receivedType(value: unknown): string {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.getPrototypeOf(value)?.constructor?.name || "object"
    : typeOf(value);
}

/**
 * An instance of a class, checked with `instanceof`: instances of subclasses
 * are accepted too. Works for your own classes and for built-ins such as
 * `Date`, `Map` or `Uint8Array`.
 *
 * Classes do not exist in JSON, so the JSON Schema is `{}`, which accepts
 * everything.
 *
 * @example
 * ```ts
 * import { instanceOf } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * class Point {
 *   constructor(readonly x: number, readonly y: number) {}
 * }
 *
 * const schema = instanceOf(Point);
 * // Schema<Point, Point, "instanceOf">
 *
 * const point = new Point(1, 2);
 * assertEquals(validate(schema, point), { value: point });
 * assertEquals(
 *   validate(schema, { x: 1, y: 2 }).issues?.[0].message,
 *   "Expected an instance of Point, received Object",
 * );
 * ```
 *
 * @template TClass The class
 * @param constructor The class
 * @param options Placeholder, not used yet
 * @returns A schema accepting instances of the class
 */
export function instanceOf<TClass extends Class>(
  constructor: TClass,
  // deno-lint-ignore no-unused-vars
  options?: InstanceOfOptions,
): Schema<InstanceType<TClass>, InstanceType<TClass>, "instanceOf"> {
  return createSchema("instanceOf", {
    validate: (value) =>
      value instanceof constructor
        ? { value: value as InstanceType<TClass> }
        : failure(
          "instanceOf",
          `Expected an instance of ${
            constructor.name || "the class"
          }, received ${receivedType(value)}`,
          { expected: constructor, actual: value },
        ),
    jsonSchema: jsonSchemaOf(() => ({})),
  });
}

/**
 * Options for {@linkcode func}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface FuncOptions {}

/** Any function. */
// deno-lint-ignore no-explicit-any
export type AnyFunction = (...args: any[]) => any;

/**
 * A function: anything `typeof` reports as `"function"`, including classes and
 * async functions. Only that it is a function is checked, never its
 * parameters or its result. Named `func` because `function` is a reserved
 * word.
 *
 * The type parameter sets the type of the function, so a method of an
 * interface can be described precisely: `func<(index: number) => string>()`.
 *
 * Functions do not exist in JSON, so the JSON Schema is `{}`, which accepts
 * everything.
 *
 * @example
 * ```ts
 * import { func } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = func();
 * // Schema<AnyFunction, AnyFunction, "function">
 *
 * const fn = () => 1;
 * assertEquals(validate(schema, fn), { value: fn });
 * assertEquals(validate(schema, "fn").issues?.[0].message, "Expected a function, received string");
 *
 * const placeholder = func<(index: number) => string>();
 * // Schema<(index: number) => string, (index: number) => string, "function">
 * assertEquals(validate(placeholder, (index: number) => `$${index}`).issues, undefined);
 * ```
 *
 * @template TFunction The type of the function
 * @param options Placeholder, not used yet
 * @returns A schema accepting functions
 */
export function func<TFunction extends AnyFunction = AnyFunction>(
  // deno-lint-ignore no-unused-vars
  options?: FuncOptions,
): Schema<TFunction, TFunction, "function"> {
  return createSchema("function", {
    validate: (value) =>
      typeof value === "function"
        ? { value: value as TFunction }
        : typeIssue("a function", value),
    jsonSchema: jsonSchemaOf(() => ({})),
  });
}
