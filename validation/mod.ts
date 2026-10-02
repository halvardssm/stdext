/**
 * The `@stdext/validation` package.
 *
 * Schema building and validation on top of the
 * {@link https://standardschema.dev | Standard Schema} and
 * {@link https://standardschema.dev/#json-schema | Standard JSON Schema}
 * specifications:
 *
 * - `./json_schema.ts` — builders (`string`, `number`, `object`, ...) that
 *   produce Standard Schema entities carrying their own JSON Schema
 *   representation
 * - `./validator.ts` — `validate`, `parse` and their async variants for
 *   any Standard Schema entity
 * - `./utils.ts` — type guards and helpers for working with Standard
 *   Schema values
 *
 * @example
 * ```ts
 * import { object, parse, string, validate } from "@stdext/validation";
 * import { assert, assertThrows } from "@std/assert";
 *
 * const person = object({
 *   properties: { name: string() },
 *   required: ["name"],
 * });
 *
 * const result = validate(person, { name: "Alice" });
 * assert(!("issues" in result));
 *
 * assertThrows(() => parse(person, {}));
 * ```
 *
 * @module
 */

export * from "./validator.ts";
export * from "./json_schema.ts";
export {
  getStandardJSONSchemaV1Input,
  getStandardJSONSchemaV1Output,
  isEmptyObject,
  isEmptyPlainObject,
  isObject,
  isStandardSchemaV1,
} from "./utils.ts";
