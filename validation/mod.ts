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
 * - `@stdext/validation/core` exports the same, for libraries that build their
 *   own schemas on top.
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
export * from "./utils.ts";
