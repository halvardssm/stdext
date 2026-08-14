import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Extracts the input type of a Standard Schema.
 *
 * Reads the schema's `~standard.types` field (set by the schema builders in
 * `./json_schema.ts`), falling back to the `StandardSchemaV1<Input, Output>`
 * type parameters, and finally to `unknown`. Schemas built by this package
 * always set `~standard.types`, so this resolves to the correct input type for
 * them; for foreign schemas that do not set `types` the result is `unknown`
 * (matching the spec's own `InferInput`).
 *
 * @template S - The schema type
 *
 * @example
 * ```typescript
 * const s = string();
 * type In = InferInput<typeof s>; // string
 * ```
 */
export type InferInput<S> =
  // Prefer the explicitly declared `~standard.types` when available...
  S extends { "~standard": { types?: { input: infer I } } } ? I
    // ...otherwise derive from the StandardSchemaV1<Input, Output> parameters.
    : S extends StandardSchemaV1<infer I, infer _O> ? I
    : unknown;

/**
 * Extracts the output type of a Standard Schema.
 *
 * Reads the schema's `~standard.types` field (set by the schema builders in
 * `./json_schema.ts`), falling back to the `StandardSchemaV1<Input, Output>`
 * type parameters, and finally to `unknown`. Schemas built by this package
 * always set `~standard.types`, so this resolves to the correct output type for
 * them; for foreign schemas that do not set `types` the result is `unknown`
 * (matching the spec's own `InferOutput`).
 *
 * @template S - The schema type
 *
 * @example
 * ```typescript
 * const s = string();
 * type Out = InferOutput<typeof s>; // string
 * ```
 */
export type InferOutput<S> = S extends
  { "~standard": { types?: { output: infer O } } } ? O
  : S extends StandardSchemaV1<infer _I, infer O> ? O
  : unknown;

/**
 * Resolves the output type of a {@link SchemaObject} member of an array or
 * object schema, where the member may be a schema or a literal `boolean`
 * (JSON Schema's `true`/`false` shorthand).
 *
 * - A `false` member always fails, contributing `never`.
 * - A `true` member accepts anything, contributing `unknown`.
 * - A schema member contributes its inferred output type.
 *
 * @template S - The member schema or boolean
 *
 * @example
 * ```typescript
 * type A = InferMemberOutput<typeof mySchema>;
 * ```
 */
export type InferMemberOutput<S> = S extends false ? never
  : S extends true ? unknown
  : InferOutput<S>;

/**
 * Maps a record of member schemas (e.g. an object's `properties`) to a record
 * of their inferred output types.
 *
 * @template T - The record of member schemas
 *
 * @example
 * ```typescript
 * const props = { name: string(), age: number() };
 * type Out = InferMemberOutputRecord<typeof props>;
 * // { name: string, age: number }
 * ```
 */
export type InferMemberOutputRecord<T> = {
  [K in keyof T]: InferMemberOutput<T[K]>;
};

/**
 * Resolves the index-signature contribution of an object schema's
 * `additionalProperties` option, mirroring JSON Schema 2020-12 semantics:
 *
 * - `false` disallows extra properties (no index signature).
 * - `true` or absent allows any extra property (`unknown`).
 * - a schema allows extra properties validated against it (its output type).
 *
 * @template AdditionalProperties - The `additionalProperties` option value
 */
export type InferObjectAdditionalIndex<AdditionalProperties> =
  // `false` disallows extra properties (a `never` index signature forbids
  // any undeclared key). Any other value (`true`, a schema, or absent) allows
  // extra properties; the index is typed `unknown` to avoid unsound conflicts
  // with declared properties of a different type (the `additionalProperties`
  // schema still validates extras at runtime).
  AdditionalProperties extends false ? { [key: string]: never }
    : { [key: string]: unknown };

/**
 * Extracts the union of required property keys from a `required` tuple.
 *
 * @template Required - The readonly `required` string tuple
 */
export type InferObjectRequiredKeys<
  Required extends ReadonlyArray<string>,
> = Required[number];

/**
 * Builds the output type of an `object` schema from its `properties`,
 * `required`, and `additionalProperties`.
 *
 * - Keys listed in `required` are required; the remaining declared keys are
 *   optional.
 * - `additionalProperties` controls extra (undeclared) keys: `false` removes
 *   the index signature, a schema types the extra values, and `true`/absent
 *   allows `unknown` extra values.
 *
 * `required` must be captured as a `const` tuple on the builder (see
 * `object()`) so the literal keys are preserved rather than widened to
 * `string[]`.
 *
 * @template Properties - The `properties` record
 * @template Required - The readonly `required` string tuple
 * @template AdditionalProperties - The `additionalProperties` option value
 *
 * @example
 * ```typescript
 * type Out = InferObjectOutput<
 *   { name: StringSchema; age: NumberSchema },
 *   ["name"],
 *   false
 * >;
 * // { name: string; age?: number }
 * ```
 */
export type InferObjectOutput<
  Properties,
  Required extends ReadonlyArray<string> = [],
  AdditionalProperties = undefined,
> =
  & {
    [
      K in keyof Properties as K extends InferObjectRequiredKeys<Required> ? K
        : never
    ]: InferMemberOutput<Properties[K]>;
  }
  & {
    [
      K in keyof Properties as K extends InferObjectRequiredKeys<Required>
        ? never
        : K
    ]?: InferMemberOutput<Properties[K]>;
  }
  & InferObjectAdditionalIndex<AdditionalProperties>;

/**
 * Maps a readonly tuple of schemas (e.g. an array's `prefixItems`) to a tuple
 * of their inferred output types, preserving element order and count.
 *
 * @template T - The readonly tuple of member schemas
 *
 * @example
 * ```typescript
 * type T = InferArrayTuple<readonly [StringSchema, NumberSchema]>;
 * // readonly [string, number]
 * ```
 */
export type InferArrayTuple<T extends ReadonlyArray<unknown>> = {
  [K in keyof T]: InferMemberOutput<T[K]>;
};

/**
 * Resolves the variadic "rest" element type of an array schema from its
 * `items`, `unevaluatedItems`, or `contains` option (in that order of
 * precedence), mirroring JSON Schema 2020-12 evaluation. Returns `never` when
 * none of these are present.
 *
 * @template Options - The array options
 */
export type InferArrayRest<Options> = Options extends { items: infer Items }
  ? InferMemberOutput<Items>
  : Options extends { unevaluatedItems: infer Unevaluated } ? InferMemberOutput<
      Unevaluated
    >
  : Options extends { contains: infer Contains } ? InferMemberOutput<Contains>
  : never;

/**
 * Whether an array schema declares any variadic rest element source
 * (`items`, `unevaluatedItems`, or `contains`).
 *
 * @template Options - The array options
 */
export type InferArrayHasRest<Options> = Options extends { items: infer _Items }
  ? true
  : Options extends { unevaluatedItems: infer _Unevaluated } ? true
  : Options extends { contains: infer _Contains } ? true
  : false;

/**
 * Builds the output type of an `array` schema.
 *
 * - When `prefixItems` is present, the leading elements form a fixed tuple.
 *   If a variadic rest source (`items`/`unevaluatedItems`/`contains`) is also
 *   present, it is appended as a variadic tail; otherwise the tuple is exact.
 * - When only a rest source is present, the result is `Rest[]`.
 * - Otherwise the result is `unknown[]`.
 *
 * @template Prefix - The readonly `prefixItems` tuple, or `undefined`
 * @template Options - The array options (carrying the rest element sources)
 *
 * @example
 * ```typescript
 * type A = InferArrayOutput<readonly [StringSchema, NumberSchema], {}>;
 * // [string, number]
 * type B = InferArrayOutput<readonly [StringSchema], { items: NumberSchema }>;
 * // [string, ...number[]]
 * ```
 */
export type InferArrayOutput<
  Prefix extends ReadonlyArray<unknown> | undefined,
  Options,
> = Prefix extends ReadonlyArray<unknown>
  ? InferArrayHasRest<Options> extends true
    ? [...InferArrayTuple<Prefix>, ...InferArrayRest<Options>[]]
  : [...InferArrayTuple<Prefix>]
  : InferArrayHasRest<Options> extends true ? InferArrayRest<Options>[]
  : unknown[];

/**
 * Infers the output type of a `combination` schema from its `allOf`, `anyOf`
 * and `oneOf` members. The resulting type is the union of every member output.
 * When no members are present the result is `unknown`.
 *
 * @template AllOf - The readonly array of `allOf` member schemas
 * @template AnyOf - The readonly array of `anyOf` member schemas
 * @template OneOf - The readonly array of `oneOf` member schemas
 */
export type InferCombinationOutput<
  AllOf extends ReadonlyArray<unknown> | undefined,
  AnyOf extends ReadonlyArray<unknown> | undefined,
  OneOf extends ReadonlyArray<unknown> | undefined,
> = [
  | (AllOf extends ReadonlyArray<infer A> ? InferMemberOutput<A> : never)
  | (AnyOf extends ReadonlyArray<infer B> ? InferMemberOutput<B> : never)
  | (OneOf extends ReadonlyArray<infer C> ? InferMemberOutput<C> : never),
][0] extends infer R ? [R] extends [never] ? unknown : R : unknown;
