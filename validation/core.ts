/**
 * The core of `@stdext/validation`: {@linkcode createSchema}, the factory that
 * builds a schema which is both a
 * {@link https://standardschema.dev | Standard Schema} and a
 * {@link https://standardschema.dev/#json-schema | Standard JSON Schema},
 * and the types around it.
 *
 * A schema is a frozen object with a `kind` and a `~standard` property that
 * holds `validate` and the JSON Schema converters. Because it implements the
 * standards, it works with any consumer of them, and schemas can be nested by
 * calling one schema's `validate` from another's.
 *
 * @example
 * ```ts
 * import { createSchema } from "@stdext/validation/core";
 * import { assertEquals } from "@std/assert";
 *
 * const port = createSchema("port", {
 *   validate: (value) =>
 *     Number.isInteger(value) && (value as number) > 0
 *       ? { value: value as number }
 *       : { issues: [{ message: "Expected a positive integer" }] },
 *   jsonSchema: {
 *     input: () => ({ type: "integer", minimum: 1 }),
 *     output: () => ({ type: "integer", minimum: 1 }),
 *   },
 * });
 * // Schema<number, number, "port">
 *
 * assertEquals(port["~standard"].validate(8080), { value: 8080 });
 * assertEquals(
 *   port["~standard"].jsonSchema.input({ target: "draft-2020-12" }),
 *   { type: "integer", minimum: 1 },
 * );
 * ```
 *
 * @module
 */

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

/**
 * Creates a schema: the factory schema constructors (`string()`, `object()`,
 * ...) are built on.
 *
 * Nothing is validated here; `options.validate` does the work and
 * `options.jsonSchema` describes the schema for JSON Schema consumers. To nest
 * schemas, call another schema's `validate` from yours, taking care of results
 * that may be promises.
 *
 * The types are inferred from the options:
 *
 * - the output type from the `{ value }` results `validate` returns (also
 *   when it is async, and keeping literal types),
 * - the input type from `types`, and otherwise the same as the output type
 *   (the common symmetric case),
 * - the kind as a literal type.
 *
 * Only `{ value }` results contribute to the output type, so a validator can
 * return `{ issues }` freely. Read the inferred types of a schema with
 * `StandardSchemaV1.InferInput` and `StandardSchemaV1.InferOutput`.
 *
 * @example
 * ```ts
 * import { createSchema } from "@stdext/validation/core";
 * import { assertEquals } from "@std/assert";
 *
 * const string = createSchema("string", {
 *   validate: (value) =>
 *     typeof value === "string"
 *       ? { value }
 *       : { issues: [{ message: "Expected a string" }] },
 *   jsonSchema: {
 *     input: () => ({ type: "string" }),
 *     output: () => ({ type: "string" }),
 *   },
 * });
 * // Schema<string, string, "string">
 *
 * assertEquals(string.kind, "string");
 * assertEquals(string["~standard"].validate("a"), { value: "a" });
 * ```
 *
 * @template TResult What `validate` returns, inferred from the options
 * @template TInput The input type, inferred from `options.types`
 * @template TKind The literal type of `kind`
 * @param kind The runtime node type, e.g. `"string"`.
 * @param options How the schema validates and exports to JSON Schema.
 * @returns A new immutable schema.
 */
export function createSchema<
  const TResult extends ValidateResult,
  TInput = InferValidateOutput<TResult>,
  const TKind extends string = string,
>(
  kind: TKind,
  options: CreateSchemaOptions<TInput, TResult>,
): Schema<TInput, InferValidateOutput<TResult>, TKind> {
  // The output type is derived from what `validate` returns, so the cast only
  // restates the type in terms the standard understands.
  const schema = {
    kind,
    "~standard": {
      version: 1,
      vendor: "@stdext/validation",
      ...options,
    },
  } as Schema<TInput, InferValidateOutput<TResult>, TKind>;

  return Object.freeze(schema);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Combined properties of {@linkcode StandardSchemaV1} and
 * {@linkcode StandardJSONSchemaV1}.
 *
 * @template Input - The input type of the schema
 * @template Output - The output type of the schema
 */
export interface CombinedPropsV1<Input = unknown, Output = Input>
  extends
    StandardSchemaV1.Props<Input, Output>,
    StandardJSONSchemaV1.Props<Input, Output> {}

/**
 * A schema that implements both {@linkcode StandardSchemaV1} and
 * {@linkcode StandardJSONSchemaV1}.
 *
 * @template Input - The input type of the schema
 * @template Output - The output type of the schema
 */
export interface CombinedSchemaV1<Input = unknown, Output = Input>
  extends StandardSchemaV1<Input, Output>, StandardJSONSchemaV1<Input, Output> {
  /** The properties of both standards. */
  readonly "~standard": CombinedPropsV1<Input, Output>;
}

/**
 * A Standard Schema issue plus additive structured metadata for form
 * libraries and i18n. A plain Standard Schema issue is still valid wherever
 * issues are expected.
 */
export interface Issue extends StandardSchemaV1.Issue {
  /** Machine-readable kind: `"type"`, `"minLength"`, `"custom"`, ... */
  kind: string;
  /** What was expected, for form libraries and i18n. */
  expected?: unknown;
  /** What was received, for form libraries and i18n. */
  actual?: unknown;
}

/**
 * The result of validating a value: the standard shape, either
 * `{ value }` or `{ issues }`.
 */
export type Result<T> = StandardSchemaV1.Result<T>;

/**
 * A schema, as returned by {@linkcode createSchema}. It is both a Standard
 * Schema (so `validate`, `parse` and any other consumer works unchanged) and a
 * Standard JSON Schema (its `~standard.jsonSchema` converters give the JSON
 * Schema). Schemas are immutable.
 *
 * @template Input - The input type of the schema
 * @template Output - The output type of the schema
 * @template Kind - The literal type of `kind`
 */
export interface Schema<
  Input = unknown,
  Output = Input,
  Kind extends string = string,
> extends CombinedSchemaV1<Input, Output> {
  /** The runtime node type, e.g. `"string"` or `"port"`. */
  readonly kind: Kind;
}

/**
 * What a `validate` function returns: a result, or a promise of one. A schema
 * whose `validate` returns a promise is async.
 */
export type ValidateResult =
  | StandardSchemaV1.Result<unknown>
  | Promise<StandardSchemaV1.Result<unknown>>;

/**
 * The output type of a schema whose `validate` returns `TResult`: the `value`
 * of its success results (promises are awaited).
 *
 * Inferring from the whole result (instead of `Result<Output>`) matters: when
 * a validator returns `{ value }` or `{ issues }`, TypeScript gives the failing
 * branch an implicit `value?: undefined`, which would add `undefined` to a
 * type inferred directly.
 */
export type InferValidateOutput<TResult> = Extract<
  Awaited<TResult>,
  { readonly value: unknown }
> extends infer TSuccess
  ? TSuccess extends { readonly value: infer TValue } ? TValue : never
  : never;

/**
 * Options for {@linkcode createSchema}: the `~standard` props of the schema
 * (`validate`, `jsonSchema` and optionally `types`), except that `validate` is
 * typed by what it returns.
 *
 * `validate` returns `Result` instead of `Result<Output>` on purpose: the
 * output type is then inferred from it, see {@linkcode InferValidateOutput}.
 * Writing `Result<InferValidateOutput<Result>>` here would hide `Result` from
 * inference, because it only appears inside a conditional type.
 *
 * @template Input - The input type of the schema
 * @template Result - What `validate` returns
 */
export interface CreateSchemaOptions<
  Input = unknown,
  Result extends ValidateResult = ValidateResult,
> extends
  Pick<
    CombinedPropsV1<Input, InferValidateOutput<Result>>,
    "jsonSchema" | "types"
  > {
  /**
   * Validates a value, sync or async. The output type is inferred from the
   * `{ value }` results it returns.
   */
  validate: (
    value: unknown,
    options?: StandardSchemaV1.Options | undefined,
  ) => Result;
}
