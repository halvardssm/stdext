# @stdext/validation

Schemas that implement both [Standard Schema](https://standardschema.dev/) and
[Standard JSON Schema](https://standardschema.dev/#json-schema), and a small,
fully typed factory to build them.

- A schema works with any consumer of either standard: validators, form
  libraries, OpenAPI generators.
- `createSchema` infers the input type, output type and kind from the options.
- Schemas nest by calling one schema's `validate` from another's, sync or async.
- It uses `@stdext/validation` as vendor identifier.
- The package root and `@stdext/validation/core` export the same API.

## Helper functions

`utils.ts` has helpers that work with any Standard Schema, including schemas
from other libraries such as Zod. They are not yet re-exported from the package
root.

| Function                                                      | What it does                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `validate(schema, input)`                                     | Returns the `{ value }` or `{ issues }` result. Throws a `TypeError` if the schema is async.               |
| `validateAsync(schema, input)`                                | Like `validate`, for sync and async schemas.                                                               |
| `parse(schema, input)`                                        | Returns the value, or throws a `SchemaError` with the issues. Throws a `TypeError` if the schema is async. |
| `parseAsync(schema, input)`                                   | Like `parse`, for sync and async schemas.                                                                  |
| `toJSONSchema(schema, options?)`                              | The JSON Schema of a Standard JSON Schema. Options: `io` (`"output"` by default), `target`, `silent`.      |
| `isStandardSchemaV1(value)` / `isStandardJSONSchemaV1(value)` | Type guards, requiring `version` 1.                                                                        |

`validate`, `validateAsync`, `parse` and `parseAsync` also accept the boolean
schemas `true` (accepts everything) and `false` (rejects everything).

```ts ignore
import { z } from "@zod/zod";
import { parse, toJSONSchema, validate } from "./utils.ts";

const User = z.object({ name: z.string() });

validate(User, { name: "Alice" }); // { value: { name: "Alice" } }
validate(User, { name: 1 }); // { issues: [...] }
parse(User, { name: "Alice" }); // { name: "Alice" }

// `io: "input"` gives what the schema accepts; `silent` returns `undefined`
// for schemas without Standard JSON Schema support instead of throwing
toJSONSchema(string, { io: "input", silent: true });
```

## Creating a schema

`createSchema(kind, options)` takes a `validate` function and the JSON Schema of
the schema:

```ts
import { createSchema } from "@stdext/validation";

const string = createSchema("string", {
  validate: (value) =>
    typeof value === "string"
      ? { value }
      : { issues: [{ message: "Expected a string" }] },
  jsonSchema: {
    input: () => ({ type: "string" }),
    output: () => ({ type: "string" }),
  },
});
// Schema<string, string, "string">

string.kind; // "string"
string["~standard"].validate("a"); // { value: "a" }
string["~standard"].validate(1); // { issues: [{ message: "Expected a string" }] }
```

The result is a frozen object: a `Schema`, which is a Standard Schema and a
Standard JSON Schema at once.

### Type inference

- The **output type** comes from the `{ value }` results `validate` returns. It
  works for async validators, keeps literal types (`"on" | "off"`), keeps
  `undefined` when the value may be `undefined`, and is `never` if `validate`
  always fails. Returning `{ issues }` never adds anything to the output.
- The **input type** defaults to the output type. When they differ, pass the
  phantom `types` option, which is never read at runtime.
- The **kind** is a literal type.

Read the types with the standard's helpers:

```ts
import { createSchema } from "@stdext/validation";
import type { StandardSchemaV1 } from "@standard-schema/spec";

const length = createSchema("length", {
  validate: (value) =>
    typeof value === "string"
      ? { value: value.length }
      : { issues: [{ message: "Expected a string" }] },
  jsonSchema: {
    input: () => ({ type: "string" }),
    output: () => ({ type: "integer" }),
  },
  types: undefined as unknown as StandardSchemaV1.Types<string, number>,
});
// Schema<string, number, "length">

type Input = StandardSchemaV1.InferInput<typeof length>; // string
type Output = StandardSchemaV1.InferOutput<typeof length>; // number
```

### Async

A schema is async when `validate` returns a promise. Nothing else changes: the
types are inferred through the promise.

```ts
import { createSchema } from "@stdext/validation";

const taken = new Set(["admin"]);
const isTaken = (name: string) => Promise.resolve(taken.has(name));

const unusedName = createSchema("unusedName", {
  validate: async (value) =>
    typeof value === "string" && !(await isTaken(value))
      ? { value }
      : { issues: [{ message: "Name is taken or not a string" }] },
  jsonSchema: {
    input: () => ({ type: "string" }),
    output: () => ({ type: "string" }),
  },
});
```

## Nesting schemas

Every schema is a Standard Schema, so a `validate` function can call any other
schema, or you can reuse its `validate` directly. A container validates its
items with the item schema and prefixes the issue paths:

```ts
import { type CombinedSchemaV1, createSchema } from "@stdext/validation";
import type { StandardSchemaV1 } from "@standard-schema/spec";

function list<TItem extends CombinedSchemaV1>(item: TItem) {
  return createSchema("list", {
    validate: (value) => {
      if (!Array.isArray(value)) {
        return { issues: [{ message: "Expected an array" }] };
      }

      const values: StandardSchemaV1.InferOutput<TItem>[] = [];
      for (const [index, entry] of value.entries()) {
        const result = item["~standard"].validate(entry);
        if (result instanceof Promise) {
          throw new TypeError("Async items are not supported");
        }
        if (result.issues) {
          return {
            issues: result.issues.map((issue) => ({
              ...issue,
              path: [index, ...(issue.path ?? [])],
            })),
          };
        }
        values.push(result.value);
      }
      return { value: values };
    },
    jsonSchema: {
      input: (options) => ({
        type: "array",
        items: item["~standard"].jsonSchema.input(options),
      }),
      output: (options) => ({
        type: "array",
        items: item["~standard"].jsonSchema.output(options),
      }),
    },
  });
}
```

`list(string)` is inferred as a schema of `string[]`. To support async items,
check whether any result is a promise and only then wait for all of them. Always
call a nested schema through its object, `item["~standard"].validate(x)`, as
other libraries' `validate` may rely on `this`.

## JSON Schema

A schema describes itself through `~standard.jsonSchema`. `input` is the JSON
Schema of what the schema accepts and `output` of what it produces; they only
differ for schemas that transform their input.

```ts
import { createSchema } from "@stdext/validation";

const age = createSchema("age", {
  validate: (value) =>
    Number.isInteger(value) && (value as number) >= 0
      ? { value: value as number }
      : { issues: [{ message: "Expected a non-negative integer" }] },
  jsonSchema: {
    input: () => ({ type: "integer", minimum: 0 }),
    output: () => ({ type: "integer", minimum: 0 }),
  },
});

age["~standard"].jsonSchema.input({ target: "draft-2020-12" });
// { type: "integer", minimum: 0 }
```

## Types

| Type                          | Description                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `Schema<Input, Output, Kind>` | What `createSchema` returns: a Standard Schema and a Standard JSON Schema.       |
| `CombinedSchemaV1`            | Any schema implementing both standards, without the `kind`.                      |
| `CreateSchemaOptions`         | The options of `createSchema`.                                                   |
| `InferValidateOutput`         | The output type of a `validate` result, used by the inference.                   |
| `Issue`                       | A Standard Schema issue with `kind`, `expected` and `actual` for form libraries. |
