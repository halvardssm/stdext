/**
 * The `@stdext/validation` package: schemas that implement both
 * {@link https://standardschema.dev | Standard Schema} and
 * {@link https://standardschema.dev/#json-schema | Standard JSON Schema}.
 *
 * - {@linkcode createSchema} builds a schema from a `validate` function and
 *   its JSON Schema. The input type, output type and kind are inferred.
 * - A schema works with any consumer of either standard (validators, form
 *   libraries, OpenAPI generators) and can be nested in other schemas.
 * - `validate` may be async: a schema whose `validate` returns a promise is
 *   async.
 * - Ready-made schemas cover the basics: `string`, `integer`, `float`,
 *   `number`, `boolean`, `symbol`, `null_`, `literal`, `enumerator`,
 *   `instanceOf`, `unknown`, `never`, `nullable`, `optional` and `nullish`, and the ones made of other schemas:
 *   `object`, `array`, `record`, `tuple`, `anyOf`, `oneOf`, `allOf`, `not` and
 *   `lazy`.
 *
 * @example
 * ```ts
 * import { createSchema } from "@stdext/validation";
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
 * assertEquals(string["~standard"].validate("a"), { value: "a" });
 * assertEquals(string["~standard"].validate(1), {
 *   issues: [{ message: "Expected a string" }],
 * });
 * ```
 *
 * @module
 */

export * from "./core.ts";
export * from "./schemas.ts";
export * from "./composites.ts";
export * from "./utils.ts";
