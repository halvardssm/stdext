/**
 * Structural combinators: `object`, `array`, `union`, `intersection`,
 * `optional`, `lazy`, ... Each accepts any Standard Schema (fluent, a JSON
 * Schema builder, Zod, Valibot, ArkType, ...) wherever a schema is expected.
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { missingPropertyIssue } from "../keywords.ts";
import { concatPathToIssues, failureResult, isObject } from "../utils.ts";
import { refine, typeCheck } from "./actions.ts";
import { createSchema, isPromise } from "./schema.ts";
import { unknown as unknownSchema } from "./primitives.ts";
import type {
  Issue,
  MaybeAsyncResult,
  Result,
  Schema,
  SchemaInput,
  SchemaOutput,
} from "./types.ts";

// deno-lint-ignore no-explicit-any
type AnySchema = StandardSchemaV1<any, any>;
type Run = (value: unknown) => MaybeAsyncResult<unknown>;

/** Build a Standard Schema from a validate function (an internal step). */
function step(validate: Run): StandardSchemaV1 {
  return {
    "~standard": { version: 1, vendor: "@stdext/validation", validate },
  };
}

function runSchema(
  schema: AnySchema,
  value: unknown,
): MaybeAsyncResult<unknown> {
  return schema["~standard"].validate(value) as MaybeAsyncResult<unknown>;
}

/** Await a list of possibly pending results only if one of them is pending. */
function collect<T>(items: readonly (T | Promise<T>)[]): T[] | Promise<T[]> {
  return items.some(isPromise) ? Promise.all(items) : items as T[];
}

function then<T, R>(
  value: T | Promise<T>,
  fn: (value: T) => R | Promise<R>,
): R | Promise<R> {
  return isPromise<T>(value) ? value.then(fn) : fn(value);
}

function setOwn(target: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function issue(
  kind: string,
  message: string,
  extra: { path?: PropertyKey[]; expected?: unknown; actual?: unknown } = {},
): Issue {
  return { kind, message, ...extra };
}

type Simplify<T> = { [K in keyof T]: T[K] };
type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];
type OptionalizeUndefined<T> = Simplify<
  & { [K in Exclude<keyof T, OptionalKeys<T>>]: T[K] }
  & { [K in OptionalKeys<T>]?: T[K] }
>;
type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;

/** The input type of an object with these entries. */
export type ObjectInput<TEntries extends Record<string, AnySchema>> =
  OptionalizeUndefined<{ [K in keyof TEntries]: SchemaInput<TEntries[K]> }>;

/** The output type of an object with these entries. */
export type ObjectOutput<TEntries extends Record<string, AnySchema>> =
  OptionalizeUndefined<{ [K in keyof TEntries]: SchemaOutput<TEntries[K]> }>;

/**
 * Options for {@linkcode object}.
 */
export interface ObjectOptions {
  /** Object-level refinement, e.g. cross-field checks. */
  // deno-lint-ignore no-explicit-any
  check?: (value: any) => boolean;
  /** Message of the failing `check`. */
  checkMessage?: string;
  /** Message of the type check. */
  message?: string;
  /**
   * Keys that must be present even if their schema accepts `undefined`.
   * Used by `fromJsonSchema` for `required` keys without a property schema.
   */
  required?: readonly string[];
}

/**
 * An object schema with `strict()` and `rest()` modes.
 */
export interface ObjectSchema<TEntries extends Record<string, AnySchema>>
  extends Schema<ObjectInput<TEntries>, ObjectOutput<TEntries>> {
  readonly kind: "object";
  /** The property schemas. */
  readonly entries: TEntries;
  /**
   * The `additionalProperties` keyword. `false` rejects unknown keys, `true`
   * keeps them, a schema keeps them and validates their values. Without it
   * unknown keys are stripped from the output.
   */
  additionalProperties(value: false): ObjectSchema<TEntries>;
  additionalProperties(value: true): Schema<
    ObjectInput<TEntries> & Record<string, unknown>,
    ObjectOutput<TEntries> & Record<string, unknown>
  >;
  additionalProperties<R extends AnySchema>(
    value: R,
  ): Schema<
    ObjectInput<TEntries> & Record<string, SchemaInput<R>>,
    ObjectOutput<TEntries> & Record<string, SchemaOutput<R>>
  >;
}

type ObjectMode = "strip" | "strict" | "rest";

interface ObjectConfig {
  mode: ObjectMode;
  rest?: AnySchema;
  options?: ObjectOptions;
}

function buildObject<TEntries extends Record<string, AnySchema>>(
  entries: TEntries,
  config: ObjectConfig,
): ObjectSchema<TEntries> {
  const { mode, options } = config;
  const keys = Object.keys(entries);

  const validate: Run = (input) => {
    const source = input as Record<string, unknown>;
    const results = collect(
      keys.map((key) => runSchema(entries[key], source[key])),
    );

    return then(results, (entryResults) => {
      const issues: Issue[] = [];
      const output: Record<string, unknown> = {};

      keys.forEach((key, i) => {
        const result = entryResults[i] as Result<unknown>;
        if (result.issues) {
          issues.push(
            ...concatPathToIssues([key], result.issues) as unknown as Issue[],
          );
        } else if (Object.hasOwn(source, key) || result.value !== undefined) {
          setOwn(output, key, result.value);
        }
      });

      for (const key of options?.required ?? []) {
        if (
          !Object.hasOwn(source, key) &&
          !issues.some((i) => i.path?.[0] === key)
        ) {
          const missing = missingPropertyIssue(key);
          issues.push({ ...missing, path: [key] });
        }
      }

      const extraKeys = Object.keys(source).filter((k) =>
        !Object.hasOwn(entries, k)
      );

      if (mode === "strict") {
        for (const key of extraKeys) {
          issues.push(
            issue("unrecognized_key", `Unrecognized key: ${key}`, {
              path: [key],
              actual: source[key],
            }),
          );
        }
      }

      if (mode !== "rest" || !config.rest) {
        return issues.length ? { issues } : { value: output };
      }

      const rest = config.rest;
      return then(
        collect(extraKeys.map((key) => runSchema(rest, source[key]))),
        (restResults) => {
          extraKeys.forEach((key, i) => {
            const result = restResults[i] as Result<unknown>;
            if (result.issues) {
              issues.push(
                ...concatPathToIssues(
                  [key],
                  result.issues,
                ) as unknown as Issue[],
              );
            } else {
              setOwn(output, key, result.value);
            }
          });
          return issues.length ? { issues } : { value: output };
        },
      );
    });
  };

  const steps: Parameters<typeof createSchema>[1][number][] = [
    typeCheck(isObject as (v: unknown) => v is object, "object"),
    step(validate),
  ];
  if (options?.check) {
    steps.push(refine(options.check, "check", options.checkMessage));
  }

  return createSchema("object", steps, {
    message: options?.message,
    def: {
      baseSteps: 2,
      entries,
      mode,
      rest: config.rest,
      required: options?.required,
    },
    extend: (schema) =>
      Object.assign(schema, {
        entries,
        additionalProperties: (value: AnySchema | boolean) =>
          value === false
            ? buildObject(entries, { ...config, mode: "strict" })
            : buildObject(entries, {
              ...config,
              mode: "rest",
              rest: value === true ? unknownSchema() : value,
            }),
      }),
  }) as unknown as ObjectSchema<TEntries>;
}

/**
 * An object with the given entry schemas. Unknown keys are stripped from the
 * output; use `.additionalProperties(false)` to reject them or
 * `.additionalProperties(schema)` to keep and validate them.
 * An entry whose schema accepts `undefined` (e.g. {@linkcode optional}) may be
 * absent.
 *
 * @param entries The schema of each property.
 * @param options Constructor options.
 * @returns An object schema.
 *
 * @example
 * ```ts
 * import { number, object, optional, string } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const user = object({ name: string(), age: optional(number()) });
 * assertEquals(validate(user, { name: "Ann" }), { value: { name: "Ann" } });
 * ```
 */
export function object<TEntries extends Record<string, AnySchema>>(
  entries: TEntries,
  options?: ObjectOptions,
): ObjectSchema<TEntries> {
  return buildObject(entries, { mode: "strip", options });
}

/**
 * An array whose items all match `item`.
 *
 * @param item The schema of each item.
 * @returns An array schema.
 *
 * @example
 * ```ts
 * import { array, minItems, pipe, string } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const tags = pipe(array(string()), minItems(1));
 * assertEquals(validate(tags, ["a"]), { value: ["a"] });
 * ```
 */
export function array<TItem extends AnySchema>(
  item: TItem,
): Schema<SchemaInput<TItem>[], SchemaOutput<TItem>[]> {
  const validate: Run = (input) =>
    then(
      collect(
        Array.from(input as unknown[], (value) => runSchema(item, value)),
      ),
      (results) => {
        const issues: Issue[] = [];
        const output: unknown[] = [];
        results.forEach((result, i) => {
          if (result.issues) {
            issues.push(
              ...concatPathToIssues([i], result.issues) as unknown as Issue[],
            );
          } else {
            output.push(result.value);
          }
        });
        return issues.length ? { issues } : { value: output };
      },
    );

  return createSchema("array", [
    typeCheck((v): v is unknown[] => Array.isArray(v), "array"),
    step(validate),
  ], { def: { baseSteps: 2, item } });
}

/**
 * An object whose values all match `value` (JSON Schema
 * `additionalProperties`).
 *
 * @param value The schema of each value.
 * @returns A record schema.
 */
export function record<TValue extends AnySchema>(
  value: TValue,
): Schema<
  Record<string, SchemaInput<TValue>>,
  Record<string, SchemaOutput<TValue>>
> {
  const validate: Run = (input) => {
    const source = input as Record<string, unknown>;
    const keys = Object.keys(source);
    return then(
      collect(keys.map((key) => runSchema(value, source[key]))),
      (results) => {
        const issues: Issue[] = [];
        const output: Record<string, unknown> = {};
        keys.forEach((key, i) => {
          const result = results[i] as Result<unknown>;
          if (result.issues) {
            issues.push(
              ...concatPathToIssues([key], result.issues) as unknown as Issue[],
            );
          } else {
            setOwn(output, key, result.value);
          }
        });
        return issues.length ? { issues } : { value: output };
      },
    );
  };

  return createSchema("record", [
    typeCheck(isObject as (v: unknown) => v is object, "object"),
    step(validate),
  ], { def: { baseSteps: 2, value } });
}

/** Try each option in order; first success wins (S6). */
function firstValid(
  options: readonly AnySchema[],
  value: unknown,
): MaybeAsyncResult<unknown> {
  const failures: Issue[] = [];
  const tryFrom = (i: number): MaybeAsyncResult<unknown> => {
    for (; i < options.length; i++) {
      const result = runSchema(options[i], value);
      if (isPromise<Result<unknown>>(result)) {
        const at = i;
        return result.then((res) => {
          if (!res.issues) return res;
          failures.push(...res.issues as unknown as Issue[]);
          return tryFrom(at + 1);
        });
      }
      if (!result.issues) return result;
      failures.push(...result.issues as unknown as Issue[]);
    }
    return failures.length ? { issues: failures } : failureResult(
      "Expected input to match one of the anyOf options, but there are none",
      undefined,
      { kind: "anyOf", actual: value },
    );
  };
  return tryFrom(0);
}

/**
 * Any of the options; the first that validates wins (JSON Schema `anyOf`).
 * When none match, the issues of all options are merged.
 *
 * @param options The alternatives.
 * @returns A union schema.
 *
 * @example
 * ```ts
 * import { const_, number, anyOf } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const id = anyOf([number(), const_("none")]);
 * assertEquals(validate(id, "none"), { value: "none" });
 * ```
 */
export function anyOf<const TOptions extends readonly AnySchema[]>(
  options: TOptions,
): Schema<
  SchemaInput<TOptions[number]>,
  SchemaOutput<TOptions[number]>
> {
  return createSchema("anyOf", [step((value) => firstValid(options, value))], {
    def: { baseSteps: 1, options },
  });
}

/**
 * Exactly one of the options must validate (JSON Schema `oneOf`).
 *
 * @param options The alternatives.
 * @returns A schema accepting values matching exactly one option.
 */
export function oneOf<const TOptions extends readonly AnySchema[]>(
  options: TOptions,
): Schema<
  SchemaInput<TOptions[number]>,
  SchemaOutput<TOptions[number]>
> {
  const validate: Run = (value) =>
    then(
      collect(options.map((option) => runSchema(option, value))),
      (results) => {
        const valid = results.filter((r) => !(r as Result<unknown>).issues);
        if (valid.length === 1) return valid[0] as Result<unknown>;
        if (valid.length === 0) {
          return {
            issues: results.flatMap((r) => (r as { issues: Issue[] }).issues),
          };
        }
        return failureResult(
          `Expected input to match exactly one of ${options.length} options, matched ${valid.length}`,
          undefined,
          { kind: "oneOf", expected: 1, actual: valid.length },
        );
      },
    );
  return createSchema("oneOf", [step(validate)], {
    def: { baseSteps: 1, options },
  });
}

/** The values a discriminant entry accepts, or `undefined` if not literal. */
function discriminantValues(
  option: AnySchema,
  discriminant: string,
): readonly unknown[] | undefined {
  const entry = (option as Schema).def?.entries as
    | Record<string, Schema>
    | undefined;
  const schema = entry?.[discriminant];
  if (schema?.kind === "const") return [schema.def.value];
  if (schema?.kind === "enum") return schema.def.values as unknown[];
}

/**
 * A union of object schemas told apart by a `const_` property. Only the
 * matching option runs, which is faster and yields better errors. When the
 * discriminant is absent it behaves like {@linkcode anyOf}. Exported as
 * `oneOf` in JSON Schema.
 *
 * @param discriminant The property holding a `const_` or `enum`.
 * @param options Object schemas, each with that property.
 * @returns A discriminated union schema.
 *
 * @example
 * ```ts
 * import {
 *   discriminatedOneOf,
 *   const_,
 *   number,
 *   object,
 *   string,
 * } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * const shape = discriminatedOneOf("type", [
 *   object({ type: const_("circle"), r: number() }),
 *   object({ type: const_("label"), text: string() }),
 * ]);
 * assertEquals(validate(shape, { type: "label", text: "a" }).issues, undefined);
 * ```
 */
export function discriminatedOneOf<
  const TDiscriminant extends string,
  const TOptions extends readonly ObjectSchema<Record<string, AnySchema>>[],
>(
  discriminant: TDiscriminant,
  options: TOptions,
): Schema<
  SchemaInput<TOptions[number]>,
  SchemaOutput<TOptions[number]>
> {
  const map = new Map<unknown, AnySchema>();
  for (const option of options) {
    const values = discriminantValues(option, discriminant);
    if (!values) {
      throw new TypeError(
        `Every option must be an object schema with a const_ or enum "${discriminant}" property`,
      );
    }
    for (const value of values) map.set(value, option);
  }

  const validate: Run = (value) => {
    const source = value as Record<string, unknown>;
    if (!Object.hasOwn(source, discriminant)) {
      return firstValid(options, value);
    }
    const option = map.get(source[discriminant]);
    if (!option) {
      return {
        issues: [
          issue(
            "discriminator",
            `Expected "${discriminant}" to be one of ${
              JSON.stringify([...map.keys()])
            }`,
            {
              path: [discriminant],
              expected: [...map.keys()],
              actual: source[discriminant],
            },
          ),
        ],
      };
    }
    return runSchema(option, value);
  };

  return createSchema("discriminatedOneOf", [
    typeCheck(isObject as (v: unknown) => v is object, "object"),
    step(validate),
  ], { def: { baseSteps: 2, discriminant, options } });
}

function mergeOutputs(outputs: unknown[]): unknown {
  if (outputs.every((o) => isObject(o))) {
    return outputs.reduce<Record<string, unknown>>(
      (acc, o) => ({ ...acc, ...(o as Record<string, unknown>) }),
      {},
    );
  }
  return outputs[outputs.length - 1];
}

/**
 * Every option must validate (JSON Schema `allOf`). Each option sees the
 * original value; object outputs are merged.
 *
 * @param options The schemas to satisfy.
 * @returns An intersection schema.
 */
export function allOf<const TOptions extends readonly AnySchema[]>(
  options: TOptions,
): Schema<
  UnionToIntersection<SchemaInput<TOptions[number]>>,
  UnionToIntersection<SchemaOutput<TOptions[number]>>
> {
  const validate: Run = (value) =>
    then(
      collect(options.map((option) => runSchema(option, value))),
      (results) => {
        const failed = results.filter((r) => (r as Result<unknown>).issues);
        if (failed.length) {
          return {
            issues: failed.flatMap((r) => (r as { issues: Issue[] }).issues),
          };
        }
        return {
          value: options.length
            ? mergeOutputs(results.map((r) => (r as { value: unknown }).value))
            : value,
        };
      },
    );
  return createSchema("allOf", [step(validate)], {
    def: { baseSteps: 1, options },
  });
}

/**
 * Valid only if `inner` does NOT validate (JSON Schema `not`).
 *
 * @param inner The schema the value must not match.
 * @returns A schema accepting everything `inner` rejects.
 */
export function not<T extends AnySchema>(inner: T): Schema<unknown, unknown> {
  return createSchema("not", [
    step((value) =>
      then(
        runSchema(inner, value),
        (result) =>
          result.issues ? { value } : failureResult(
            "Expected input not to match the schema",
            undefined,
            { kind: "not", actual: value },
          ),
      )
    ),
  ], { def: { baseSteps: 1, inner } });
}

/**
 * Accepts `undefined`. With a `defaultValue`, `undefined` is replaced by the
 * default, which then flows through the inner schema (and its transforms).
 *
 * @param inner The schema for defined values.
 * @param defaultValue Value used instead of `undefined`.
 * @returns An optional schema.
 *
 * @example
 * ```ts
 * import { optional, string } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(validate(optional(string(), "x"), undefined), { value: "x" });
 * ```
 */
export function optional<T extends AnySchema>(
  inner: T,
): Schema<SchemaInput<T> | undefined, SchemaOutput<T> | undefined>;
export function optional<T extends AnySchema>(
  inner: T,
  defaultValue: SchemaOutput<T>,
): Schema<SchemaInput<T> | undefined, SchemaOutput<T>>;
export function optional(
  inner: AnySchema,
  defaultValue?: unknown,
): Schema<unknown, unknown> {
  return createSchema("optional", [
    step((value) => {
      if (value !== undefined) return runSchema(inner, value);
      return defaultValue === undefined
        ? { value: undefined }
        : runSchema(inner, defaultValue);
    }),
  ], { def: { baseSteps: 1, inner, default: defaultValue } });
}

/**
 * Accepts `null` in addition to what `inner` accepts.
 *
 * @param inner The schema for non-null values.
 * @returns A nullable schema.
 */
export function nullable<T extends AnySchema>(
  inner: T,
): Schema<SchemaInput<T> | null, SchemaOutput<T> | null> {
  return createSchema("nullable", [
    step((value) => value === null ? { value: null } : runSchema(inner, value)),
  ], { def: { baseSteps: 1, inner } });
}

/**
 * Defer resolving a schema, for recursive and mutually recursive schemas.
 * TypeScript needs an explicit type annotation on the recursive constant.
 *
 * @param getter Returns the schema; called once, on first use.
 * @returns A schema delegating to the resolved one.
 *
 * @example
 * ```ts
 * import {
 *   array,
 *   lazy,
 *   object,
 *   type Schema,
 *   string,
 * } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assert } from "@std/assert";
 *
 * interface Node {
 *   name: string;
 *   children: Node[];
 * }
 * const node: Schema<Node> = object({
 *   name: string(),
 *   children: array(lazy(() => node)),
 * });
 * assert(!validate(node, { name: "a", children: [{ name: "b", children: [] }] }).issues);
 * ```
 */
export function lazy<T extends AnySchema>(
  getter: () => T,
): Schema<SchemaInput<T>, SchemaOutput<T>> {
  let resolved: T | undefined;
  const resolve = () => resolved ??= getter();
  return createSchema("lazy", [step((value) => runSchema(resolve(), value))], {
    def: { baseSteps: 1, getter: resolve },
  });
}
