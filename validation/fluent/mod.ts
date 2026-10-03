/**
 * Fluent, pipe-based validation in the style of valibot and zod/mini.
 *
 * A schema is a Standard Schema plus a sequence of small actions appended
 * with `pipe()`. Input and output types may differ (transforms), any
 * Standard Schema can be mixed in wherever a schema is expected, and
 * everything built from core types, keyword actions and combinators exports
 * losslessly to JSON Schema draft 2020-12 with {@linkcode toJSONSchema}.
 *
 * @example
 * ```ts
 * import {
 *   const_,
 *   pattern,
 *   object,
 *   optional,
 *   pipe,
 *   string,
 *   toJSONSchema,
 *   transform,
 *   anyOf,
 *   validate,
 * } from "@stdext/validation/fluent";
 * import { RFC5321_EMAIL } from "@stdext/validation/utils";
 * import { assertEquals } from "@std/assert";
 *
 * const User = object({
 *   email: pipe(string(), pattern(RFC5321_EMAIL), transform((s) => s.toLowerCase())),
 *   role: anyOf([const_("admin"), const_("user")]),
 *   nickname: optional(string()),
 * });
 *
 * assertEquals(validate(User, { email: "A@B.CO", role: "user" }), {
 *   value: { email: "a@b.co", role: "user" },
 * });
 * assertEquals(toJSONSchema(User).type, "object");
 * ```
 *
 * @module
 */

export * from "./types.ts";
export * from "./schema.ts";
export * from "./actions.ts";
export * from "./primitives.ts";
export * from "./combinators.ts";
export * from "./to_json_schema.ts";
export * from "./from_json_schema.ts";

export {
  concatPathToIssues,
  failureResult,
  isStandardSchemaV1,
} from "../utils.ts";
export { parse, parseAsync, validate, validateAsync } from "../validator.ts";
