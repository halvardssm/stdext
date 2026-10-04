/**
 * Helpers shared by the tests: type level assertions, a validity check, issue
 * builders and an async schema.
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { createSchema } from "./core.ts";
import { validate } from "./utils.ts";

/** Type level equality, for use with {@linkcode assertType}. */
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

/** Fails to compile unless `T` is `true`. */
export function assertType<_T extends true>() {}

/** The input type of a schema. */
export type Input<S extends StandardSchemaV1> = StandardSchemaV1.InferInput<S>;

/** The output type of a schema. */
export type Output<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<
  S
>;

/** Whether the schema accepts the value. */
export const valid = (schema: StandardSchemaV1, value: unknown) =>
  !validate(schema, value).issues;

/**
 * An issue with the structured fields of `Issue`. Built by a function, so that
 * `assertEquals` does not reject the extra fields of a literal.
 */
export function issue(
  kind: string,
  message: string,
  expected: unknown,
  actual: unknown,
  path?: PropertyKey[],
) {
  return { kind, message, expected, actual, ...(path ? { path } : {}) };
}

/** The issue of a value that is not of the expected type. */
export function typeIssue(
  expected: string,
  actual: unknown,
  received: string,
  path?: PropertyKey[],
) {
  return issue(
    "type",
    `Expected ${expected}, received ${received}`,
    expected,
    actual,
    path,
  );
}

/** An async schema accepting strings. */
export const asyncString = createSchema("asyncString", {
  validate: (value) =>
    Promise.resolve(
      typeof value === "string"
        ? { value }
        : { issues: [{ message: "Expected a string" }] },
    ),
  jsonSchema: {
    input: () => ({ type: "string" }),
    output: () => ({ type: "string" }),
  },
});
