/**
 * Schemas that are made of other schemas: the containers {@linkcode object},
 * {@linkcode array}, {@linkcode record} and {@linkcode tuple}, the
 * combinators {@linkcode anyOf}, {@linkcode oneOf}, {@linkcode allOf} and
 * {@linkcode not}, and {@linkcode lazy} for recursion.
 *
 * Every schema function takes an options argument. The options are
 * placeholders for now: they are accepted and ignored, so options can be added
 * later without changing the signatures.
 *
 * The schemas they nest may be sync or async. A composite stays synchronous
 * unless one of the nested schemas returns a promise.
 *
 * @example
 * ```ts
 * import { array, object } from "./composites.ts";
 * import { integer, optional, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const user = object({
 *   name: string(),
 *   age: optional(integer()),
 *   tags: array(string()),
 * });
 * // Schema<{ name: string; age?: number; tags: string[] }, ..., "object">
 *
 * assertEquals(validate(user, { name: "Alice", tags: ["a"] }), {
 *   value: { name: "Alice", tags: ["a"] },
 * });
 * assertEquals(validate(user, { name: "Alice", tags: [1] }).issues?.[0].path, [
 *   "tags",
 *   0,
 * ]);
 * ```
 *
 * @module
 */

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import {
  acceptsUndefined,
  chain,
  collect,
  type CombinedSchemaV1,
  createSchema,
  failure,
  isRecord,
  jsonSchemaOf,
  prefixIssues,
  type Schema,
  setOwn,
  typeIssue,
} from "./core.ts";
import { validateAsync } from "./utils.ts";

type Result = StandardSchemaV1.Result<unknown>;
type JSONOptions = StandardJSONSchemaV1.Options;

/** The result of a list of items: the values, or the issues prefixed by index. */
function itemsResult(results: Result[]): Result {
  const issues = results.flatMap((result, index) =>
    result.issues ? prefixIssues(index, result.issues) : []
  );
  return issues.length
    ? { issues }
    : { value: results.map((result) => (result as { value: unknown }).value) };
}

/** The enumerable own keys of an object: its string keys, then its symbols. */
function ownKeys(object: object): (string | symbol)[] {
  return [
    ...Object.keys(object),
    ...Object.getOwnPropertySymbols(object).filter((symbol) =>
      Object.prototype.propertyIsEnumerable.call(object, symbol)
    ),
  ];
}

/**
 * The result of the values of an object: a new object with the values, or the
 * issues prefixed by key. A key is left out when `include` says so.
 */
function keyedResult(
  keys: PropertyKey[],
  results: Result[],
  include: (key: PropertyKey, result: { value: unknown }) => boolean = () =>
    true,
): Result {
  const issues: StandardSchemaV1.Issue[] = [];
  const output: Record<PropertyKey, unknown> = {};
  keys.forEach((key, index) => {
    const result = results[index];
    if (result.issues) {
      issues.push(...prefixIssues(key, result.issues));
    } else if (include(key, result)) {
      setOwn(output, key, result.value);
    }
  });
  return issues.length ? { issues } : { value: output };
}

/**
 * Makes the properties that may be `undefined` optional (`name?: string`),
 * as in the types of {@linkcode object}.
 */
export type OptionalizeUndefined<T> =
  & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  }
  & {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
  } extends infer R ? { [K in keyof R]: R[K] } : never;

/**
 * Turns a union into an intersection, as in the type of {@linkcode allOf}.
 */
export type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;

// ---------------------------------------------------------------------------
// object
// ---------------------------------------------------------------------------

/**
 * Options for {@linkcode object}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface ObjectOptions {}

/** The input type of an object schema with these properties. */
export type ObjectInput<
  TProperties extends Record<PropertyKey, CombinedSchemaV1>,
> = OptionalizeUndefined<
  { [K in keyof TProperties]: StandardSchemaV1.InferInput<TProperties[K]> }
>;

/** The output type of an object schema with these properties. */
export type ObjectOutput<
  TProperties extends Record<PropertyKey, CombinedSchemaV1>,
> = OptionalizeUndefined<
  { [K in keyof TProperties]: StandardSchemaV1.InferOutput<TProperties[K]> }
>;

/**
 * An object with the given property schemas. Properties whose schema accepts
 * `undefined` (such as {@linkcode optional}) may be absent, and become optional
 * keys in the inferred type. Unknown keys are removed from the output.
 *
 * Only plain objects are accepted, not arrays, `null`, `Date` or `Map`. The
 * issue of a failing property has the property key in its `path`.
 *
 * Properties can have symbol keys: they are validated, kept in the output and
 * typed like any other. Only enumerable own keys of `properties` count.
 *
 * The JSON Schema is `{ type: "object", properties, required }`, where
 * `required` lists the properties that do not accept `undefined`. Symbol keys
 * cannot exist in JSON, so they are left out of both.
 *
 * @example
 * ```ts
 * import { object } from "./composites.ts";
 * import { optional, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = object({ name: string(), nickname: optional(string()) });
 * // Schema<{ name: string; nickname?: string | undefined }, ..., "object">
 *
 * assertEquals(validate(schema, { name: "Alice", extra: 1 }), {
 *   value: { name: "Alice" },
 * });
 * assertEquals(validate(schema, { name: 1 }).issues?.[0].path, ["name"]);
 *
 * // symbol keys work too
 * const id = Symbol("id");
 * const entity = object({ [id]: string() });
 * assertEquals(validate(entity, { [id]: "x" }), { value: { [id]: "x" } });
 * assertEquals(validate(entity, { [id]: 1 }).issues?.[0].path, [id]);
 * ```
 *
 * @template TProperties The schema of every property, by key
 * @param properties The schema of every property
 * @param options Placeholder, not used yet
 * @returns A schema accepting objects with those properties
 */
export function object<
  TProperties extends Record<PropertyKey, CombinedSchemaV1>,
>(
  properties: TProperties,
  // deno-lint-ignore no-unused-vars
  options?: ObjectOptions,
): Schema<ObjectInput<TProperties>, ObjectOutput<TProperties>, "object"> {
  const schemas: Record<PropertyKey, CombinedSchemaV1> = properties;
  const keys = ownKeys(properties);

  return createSchema("object", {
    validate: (value, validateOptions) => {
      if (!isRecord(value)) return typeIssue("an object", value);
      const source: Record<PropertyKey, unknown> = value;

      return chain(
        collect(
          keys.map((key) =>
            validateAsync(schemas[key], source[key], validateOptions)
          ),
        ),
        (results) =>
          keyedResult(
            keys,
            results,
            (key, result) =>
              Object.hasOwn(source, key) || result.value !== undefined,
          ),
      );
    },
    jsonSchema: jsonSchemaOf((convert) => {
      const jsonProperties: Record<string, unknown> = {};
      const required: string[] = [];
      // symbol keys cannot exist in JSON
      for (const key of keys) {
        if (typeof key === "symbol") continue;
        jsonProperties[key] = convert(schemas[key]);
        if (!acceptsUndefined(schemas[key])) required.push(key);
      }
      return {
        type: "object",
        ...(Object.keys(jsonProperties).length
          ? { properties: jsonProperties }
          : {}),
        ...(required.length ? { required } : {}),
      };
    }),
  }) as unknown as Schema<
    ObjectInput<TProperties>,
    ObjectOutput<TProperties>,
    "object"
  >;
}

// ---------------------------------------------------------------------------
// array
// ---------------------------------------------------------------------------

/**
 * Options for {@linkcode array}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface ArrayOptions {}

/**
 * An array whose items all match `item`. The issue of a failing item has its
 * index in the `path`.
 *
 * The JSON Schema is `{ type: "array", items }`.
 *
 * @example
 * ```ts
 * import { array } from "./composites.ts";
 * import { string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = array(string());
 * // Schema<string[], string[], "array">
 *
 * assertEquals(validate(schema, ["a", "b"]), { value: ["a", "b"] });
 * assertEquals(validate(schema, ["a", 1]).issues?.[0].path, [1]);
 * ```
 *
 * @template TItem The schema of the items
 * @param item The schema of every item
 * @param options Placeholder, not used yet
 * @returns A schema accepting arrays of items
 */
export function array<TItem extends CombinedSchemaV1>(
  item: TItem,
  // deno-lint-ignore no-unused-vars
  options?: ArrayOptions,
): Schema<
  StandardSchemaV1.InferInput<TItem>[],
  StandardSchemaV1.InferOutput<TItem>[],
  "array"
> {
  return createSchema("array", {
    validate: (value, validateOptions) => {
      if (!Array.isArray(value)) return typeIssue("an array", value);

      return chain(
        collect(
          Array.from(
            value,
            (entry) => validateAsync(item, entry, validateOptions),
          ),
        ),
        itemsResult,
      );
    },
    jsonSchema: jsonSchemaOf((convert) => ({
      type: "array",
      items: convert(item),
    })),
  }) as unknown as Schema<
    StandardSchemaV1.InferInput<TItem>[],
    StandardSchemaV1.InferOutput<TItem>[],
    "array"
  >;
}

// ---------------------------------------------------------------------------
// record
// ---------------------------------------------------------------------------

/**
 * Options for {@linkcode record}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface RecordOptions {}

/**
 * An object with any string keys, whose values all match `value`. The issue of
 * a failing value has its key in the `path`.
 *
 * The JSON Schema is `{ type: "object", additionalProperties }`.
 *
 * @example
 * ```ts
 * import { record } from "./composites.ts";
 * import { integer } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = record(integer());
 * // Schema<Record<string, number>, Record<string, number>, "record">
 *
 * assertEquals(validate(schema, { a: 1, b: 2 }), { value: { a: 1, b: 2 } });
 * assertEquals(validate(schema, { a: 1, b: "2" }).issues?.[0].path, ["b"]);
 * ```
 *
 * @template TValue The schema of the values
 * @param value The schema of every value
 * @param options Placeholder, not used yet
 * @returns A schema accepting objects with values of that schema
 */
export function record<TValue extends CombinedSchemaV1>(
  value: TValue,
  // deno-lint-ignore no-unused-vars
  options?: RecordOptions,
): Schema<
  Record<string, StandardSchemaV1.InferInput<TValue>>,
  Record<string, StandardSchemaV1.InferOutput<TValue>>,
  "record"
> {
  return createSchema("record", {
    validate: (input, validateOptions) => {
      if (!isRecord(input)) return typeIssue("an object", input);

      const keys = Object.keys(input);
      return chain(
        collect(
          keys.map((key) => validateAsync(value, input[key], validateOptions)),
        ),
        (results) => keyedResult(keys, results),
      );
    },
    jsonSchema: jsonSchemaOf((convert) => ({
      type: "object",
      additionalProperties: convert(value),
    })),
  }) as unknown as Schema<
    Record<string, StandardSchemaV1.InferInput<TValue>>,
    Record<string, StandardSchemaV1.InferOutput<TValue>>,
    "record"
  >;
}

// ---------------------------------------------------------------------------
// tuple
// ---------------------------------------------------------------------------

/**
 * Options for {@linkcode tuple}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface TupleOptions {}

/** The input type of a tuple schema with these items. */
export type TupleInput<TItems extends readonly CombinedSchemaV1[]> = {
  -readonly [K in keyof TItems]: StandardSchemaV1.InferInput<TItems[K]>;
};

/** The output type of a tuple schema with these items. */
export type TupleOutput<TItems extends readonly CombinedSchemaV1[]> = {
  -readonly [K in keyof TItems]: StandardSchemaV1.InferOutput<TItems[K]>;
};

/**
 * An array with exactly one item per schema, each matching the schema at its
 * position.
 *
 * The JSON Schema is `{ type: "array", prefixItems, minItems, maxItems }`.
 *
 * @example
 * ```ts
 * import { tuple } from "./composites.ts";
 * import { float, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = tuple([string(), float()]);
 * // Schema<[string, number], [string, number], "tuple">
 *
 * assertEquals(validate(schema, ["a", 1.5]), { value: ["a", 1.5] });
 * assertEquals(validate(schema, ["a"]).issues?.length, 1);
 * assertEquals(validate(schema, [1, 1.5]).issues?.[0].path, [0]);
 * ```
 *
 * @template TItems The schemas of the positions, as a tuple
 * @param items The schema of every position
 * @param options Placeholder, not used yet
 * @returns A schema accepting arrays of that shape
 */
export function tuple<const TItems extends readonly CombinedSchemaV1[]>(
  items: TItems,
  // deno-lint-ignore no-unused-vars
  options?: TupleOptions,
): Schema<TupleInput<TItems>, TupleOutput<TItems>, "tuple"> {
  return createSchema("tuple", {
    validate: (value, validateOptions) => {
      if (!Array.isArray(value)) return typeIssue("an array", value);
      if (value.length !== items.length) {
        return failure(
          "length",
          `Expected an array of ${items.length} items, received ${value.length}`,
          { expected: items.length, actual: value.length },
        );
      }

      return chain(
        collect(
          items.map((item, index) =>
            validateAsync(item, value[index], validateOptions)
          ),
        ),
        itemsResult,
      );
    },
    jsonSchema: jsonSchemaOf((convert) => ({
      type: "array",
      prefixItems: items.map((item) => convert(item)),
      minItems: items.length,
      maxItems: items.length,
    })),
  }) as unknown as Schema<
    TupleInput<TItems>,
    TupleOutput<TItems>,
    "tuple"
  >;
}

// ---------------------------------------------------------------------------
// anyOf, oneOf, allOf, not
// ---------------------------------------------------------------------------

/** The input type of the schemas, as a union. */
export type InputOf<TSchemas extends readonly CombinedSchemaV1[]> =
  StandardSchemaV1.InferInput<
    TSchemas[number]
  >;
/** The output type of the schemas, as a union. */
export type OutputOf<TSchemas extends readonly CombinedSchemaV1[]> =
  StandardSchemaV1.InferOutput<
    TSchemas[number]
  >;

/**
 * Options for {@linkcode anyOf}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface AnyOfOptions {}

/**
 * Tries the schemas in order; the first that accepts the value wins. When none
 * does, the issues of all of them are merged.
 *
 * The JSON Schema is `{ anyOf: [...] }`.
 *
 * @example
 * ```ts
 * import { anyOf } from "./composites.ts";
 * import { integer, literal, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = anyOf([integer(), literal("none")]);
 * // Schema<number | "none", number | "none", "anyOf">
 *
 * assertEquals(validate(schema, 1), { value: 1 });
 * assertEquals(validate(schema, "none"), { value: "none" });
 * assertEquals(validate(schema, "other").issues?.length, 2);
 * ```
 *
 * @template TSchemas The alternatives, as a tuple
 * @param schemas The alternatives
 * @param options Placeholder, not used yet
 * @returns A schema accepting what any of the schemas accepts
 */
export function anyOf<const TSchemas extends readonly CombinedSchemaV1[]>(
  schemas: TSchemas,
  // deno-lint-ignore no-unused-vars
  options?: AnyOfOptions,
): Schema<InputOf<TSchemas>, OutputOf<TSchemas>, "anyOf"> {
  return createSchema("anyOf", {
    validate: (value, validateOptions) => {
      const failures: StandardSchemaV1.Issue[] = [];

      const tryFrom = (start: number): Result | Promise<Result> => {
        for (let index = start; index < schemas.length; index++) {
          const result = validateAsync(schemas[index], value, validateOptions);
          if (result instanceof Promise) {
            return result.then((settled) => {
              if (!settled.issues) return settled;
              failures.push(...settled.issues);
              return tryFrom(index + 1);
            });
          }
          if (!result.issues) return result;
          failures.push(...result.issues);
        }
        return failures.length ? { issues: failures } : failure(
          "anyOf",
          "Expected input to match one of the schemas, but there are none",
        );
      };

      return tryFrom(0);
    },
    jsonSchema: jsonSchemaOf((convert) => ({
      anyOf: schemas.map((schema) => convert(schema)),
    })),
  }) as unknown as Schema<InputOf<TSchemas>, OutputOf<TSchemas>, "anyOf">;
}

/**
 * Options for {@linkcode oneOf}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface OneOfOptions {}

/**
 * Exactly one of the schemas must accept the value. When none does, the issues
 * of all of them are merged; when several do, one issue reports how many.
 *
 * The JSON Schema is `{ oneOf: [...] }`.
 *
 * @example
 * ```ts
 * import { oneOf } from "./composites.ts";
 * import { float, integer } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * // a number that is not an integer
 * const schema = oneOf([float(), integer()]);
 *
 * assertEquals(validate(schema, 1.5), { value: 1.5 });
 * assertEquals(validate(schema, 1).issues?.[0].message, "Expected input to match exactly one schema, matched 2");
 * ```
 *
 * @template TSchemas The alternatives, as a tuple
 * @param schemas The alternatives
 * @param options Placeholder, not used yet
 * @returns A schema accepting what exactly one of the schemas accepts
 */
export function oneOf<const TSchemas extends readonly CombinedSchemaV1[]>(
  schemas: TSchemas,
  // deno-lint-ignore no-unused-vars
  options?: OneOfOptions,
): Schema<InputOf<TSchemas>, OutputOf<TSchemas>, "oneOf"> {
  return createSchema("oneOf", {
    validate: (value, validateOptions) =>
      chain(
        collect(
          schemas.map((schema) =>
            validateAsync(schema, value, validateOptions)
          ),
        ),
        (results): Result => {
          const matches = results.filter((result) => !result.issues);
          if (matches.length === 1) return matches[0];
          if (matches.length === 0) {
            // every result failed
            const issues = (results as StandardSchemaV1.FailureResult[])
              .flatMap((result) => result.issues);
            return issues.length ? { issues } : failure(
              "oneOf",
              "Expected input to match exactly one schema, matched 0",
            );
          }
          return failure(
            "oneOf",
            `Expected input to match exactly one schema, matched ${matches.length}`,
            { expected: 1, actual: matches.length },
          );
        },
      ),
    jsonSchema: jsonSchemaOf((convert) => ({
      oneOf: schemas.map((schema) => convert(schema)),
    })),
  }) as unknown as Schema<InputOf<TSchemas>, OutputOf<TSchemas>, "oneOf">;
}

/**
 * Options for {@linkcode allOf}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface AllOfOptions {}

/**
 * Every schema must accept the value; each one validates the original value.
 * When all of them output objects, the outputs are merged; otherwise the
 * output of the last schema is used. The issues of all failing schemas are
 * merged.
 *
 * The JSON Schema is `{ allOf: [...] }`.
 *
 * @example
 * ```ts
 * import { allOf, object } from "./composites.ts";
 * import { integer, string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = allOf([object({ name: string() }), object({ age: integer() })]);
 * // Schema<{ name: string } & { age: number }, ..., "allOf">
 *
 * assertEquals(validate(schema, { name: "Alice", age: 30 }), {
 *   value: { name: "Alice", age: 30 },
 * });
 * assertEquals(validate(schema, { name: "Alice" }).issues?.[0].path, ["age"]);
 * ```
 *
 * @template TSchemas The schemas that must all match, as a tuple
 * @param schemas The schemas that must all match
 * @param options Placeholder, not used yet
 * @returns A schema accepting what all of the schemas accept
 */
export function allOf<const TSchemas extends readonly CombinedSchemaV1[]>(
  schemas: TSchemas,
  // deno-lint-ignore no-unused-vars
  options?: AllOfOptions,
): Schema<
  UnionToIntersection<InputOf<TSchemas>>,
  UnionToIntersection<OutputOf<TSchemas>>,
  "allOf"
> {
  return createSchema("allOf", {
    validate: (value, validateOptions) =>
      chain(
        collect(
          schemas.map((schema) =>
            validateAsync(schema, value, validateOptions)
          ),
        ),
        (results): Result => {
          const issues = results.flatMap((result) => result.issues ?? []);
          if (issues.length) return { issues };

          const values = results.map((result) =>
            (result as { value: unknown }).value
          );
          if (values.length === 0) return { value };
          return {
            value: values.every(isRecord)
              ? values.reduce<Record<string, unknown>>(
                (merged, part) => ({ ...merged, ...part }),
                {},
              )
              : values[values.length - 1],
          };
        },
      ),
    jsonSchema: jsonSchemaOf((convert) => ({
      allOf: schemas.map((schema) => convert(schema)),
    })),
  }) as unknown as Schema<
    UnionToIntersection<InputOf<TSchemas>>,
    UnionToIntersection<OutputOf<TSchemas>>,
    "allOf"
  >;
}

/**
 * Options for {@linkcode not}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface NotOptions {}

/**
 * Accepts a value only if `schema` rejects it. The value is passed through
 * unchanged.
 *
 * The JSON Schema is `{ not: <schema> }`.
 *
 * @example
 * ```ts
 * import { not } from "./composites.ts";
 * import { string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import { assertEquals } from "@std/assert";
 *
 * const schema = not(string());
 * // Schema<unknown, unknown, "not">
 *
 * assertEquals(validate(schema, 1), { value: 1 });
 * assertEquals(validate(schema, "a").issues?.[0].message, "Expected input not to match the schema");
 * ```
 *
 * @param schema The schema the value must not match
 * @param options Placeholder, not used yet
 * @returns A schema accepting what `schema` rejects
 */
export function not(
  schema: CombinedSchemaV1,
  // deno-lint-ignore no-unused-vars
  options?: NotOptions,
): Schema<unknown, unknown, "not"> {
  return createSchema("not", {
    validate: (value, validateOptions) =>
      chain(
        validateAsync(schema, value, validateOptions),
        (result): Result =>
          result.issues ? { value } : failure(
            "not",
            "Expected input not to match the schema",
            { actual: value },
          ),
      ),
    jsonSchema: jsonSchemaOf((convert) => ({
      not: convert(schema),
    })),
  });
}

// ---------------------------------------------------------------------------
// lazy
// ---------------------------------------------------------------------------

/**
 * Options for {@linkcode lazy}. Placeholder: no options yet.
 */
// deno-lint-ignore no-empty-interface
export interface LazyOptions {}

let lazyCount = 0;

/** The lazy schemas being converted, per conversion (per options object). */
const converting = new WeakMap<
  JSONOptions,
  Map<string, { referenced: boolean }>
>();

/**
 * Resolves a schema on first use, so that a schema can refer to itself or to a
 * schema defined later. TypeScript cannot infer a type that refers to itself,
 * so annotate the recursive schema.
 *
 * In JSON Schema, the point where a schema refers to itself becomes a `$ref`
 * to the `$anchor` of the lazy schema.
 *
 * @example
 * ```ts
 * import { array, lazy, object } from "./composites.ts";
 * import { string } from "./schemas.ts";
 * import { validate } from "./utils.ts";
 * import type { Schema } from "./core.ts";
 * import { assertEquals } from "@std/assert";
 *
 * interface Category {
 *   name: string;
 *   children: Category[];
 * }
 *
 * const category: Schema<Category> = object({
 *   name: string(),
 *   children: array(lazy(() => category)),
 * });
 *
 * const tree = { name: "a", children: [{ name: "b", children: [] }] };
 * assertEquals(validate(category, tree), { value: tree });
 * assertEquals(
 *   validate(category, { name: "a", children: [{ name: 1, children: [] }] })
 *     .issues?.[0].path,
 *   ["children", 0, "name"],
 * );
 * ```
 *
 * @template TSchema The schema that is resolved
 * @param getter Returns the schema; called once, on first use
 * @param options Placeholder, not used yet
 * @returns A schema delegating to the resolved one
 */
export function lazy<TSchema extends CombinedSchemaV1>(
  getter: () => TSchema,
  // deno-lint-ignore no-unused-vars
  options?: LazyOptions,
): Schema<
  StandardSchemaV1.InferInput<TSchema>,
  StandardSchemaV1.InferOutput<TSchema>,
  "lazy"
> {
  let resolved: TSchema | undefined;
  const resolve = () => resolved ??= getter();
  const anchor = `lazy${++lazyCount}`;

  return createSchema("lazy", {
    validate: (value, validateOptions) =>
      validateAsync(resolve(), value, validateOptions),
    jsonSchema: jsonSchemaOf((convert, { options: jsonOptions }) => {
      let active = converting.get(jsonOptions);
      if (!active) converting.set(jsonOptions, active = new Map());

      // met again while converting itself: refer to it instead of recursing
      const state = active.get(anchor);
      if (state) {
        state.referenced = true;
        return { $ref: `#${anchor}` };
      }

      const entry = { referenced: false };
      active.set(anchor, entry);
      try {
        const node = convert(resolve());
        return entry.referenced ? { ...node, $anchor: anchor } : node;
      } finally {
        active.delete(anchor);
      }
    }),
  }) as unknown as Schema<
    StandardSchemaV1.InferInput<TSchema>,
    StandardSchemaV1.InferOutput<TSchema>,
    "lazy"
  >;
}
