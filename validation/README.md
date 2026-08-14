# @stdext/validation

The validation package contains a standard validator compatible with
[Standard Schema](https://standardschema.dev/). It provides validation functions
and schema builders that work with both Standard Schema and JSON Schema
standards.

## Namespace

The validation is designed to be compatible with the Standard Schema v1 and
Standard JSON Schema v1 specification, it uses `@stdext/validation` as vendor
identifier.

## Entrypoints

### Validator

The validator module provides core validation functions for any
schema/validation library that implements Standard Schema v1.

```ts
import { parse, parseAsync, validate, validateAsync } from "@stdext/validation";

// Synchronous validation
const result = validate(mySchema, input);
if (result.issues) {
  console.error("Validation failed:", result.issues);
} else {
  console.log("Valid:", result.value);
}

// Asynchronous validation
const asyncResult = await validateAsync(mySchema, input);

// Parse with error throwing
try {
  const parsed = parse(mySchema, input);
  console.log("Parsed:", parsed);
} catch (error) {
  console.error("Validation error:", error);
}

// Async parse
const asyncParsed = await parseAsync(mySchema, input);
```

### Schema Builders

The package provides schema builders for common JSON Schema types that are
compatible with Standard Schema v1. These builders create schemas with both
validation logic and JSON Schema metadata.

```ts
import {
  array,
  boolean,
  combination,
  integer,
  nullable,
  number,
  object,
  string,
} from "@stdext/validation";

// String schema with format validation
const emailSchema = string({ format: "email" });
const result = validate(emailSchema, "user@example.com");

// Number schema with constraints
const ageSchema = number({ minimum: 0, maximum: 120 });

// Object schema with properties
const personSchema = object({
  properties: {
    name: string({ minLength: 1 }),
    age: number({ minimum: 0 }),
    email: string({ format: "email" }),
  },
  required: ["name", "email"],
  additionalProperties: false,
});

// Array schema
const tagsSchema = array({
  items: string({ minLength: 1, maxLength: 50 }),
  minItems: 1,
  maxItems: 10,
  uniqueItems: true,
});

// Combination schemas
const combinedSchema = combination({
  // AND - true if all condition matches
  allOf: [string(), number()],
});
const combinedSchema = combination({
  // OR - true if at leas one matches
  anyOf: [string(), integer()],
});
// You can also combine the conditions
const combinedSchema = combination({
  // XOR - true if exactly one matches
  oneOf: [boolean(), number()],
  // NOT - if this matches, it will fail
  not: integer(),
});
```

### Utility Functions

The package exports utility functions for type checking and schema inspection.

```ts
import {
  getStandardJSONSchemaV1Input,
  getStandardJSONSchemaV1Output,
  isEmptyObject,
  isEmptyPlainObject,
  isObject,
  isStandardSchemaV1,
} from "@stdext/validation";

// Type checking utilities
isObject({}); // true
isObject([]); // false
isObject(null); // false

// Check if an object is empty
isEmptyObject({}); // true
isEmptyObject({ key: "value" }); // false

// Check if an object has no own properties (including non-enumerable)
isEmptyPlainObject({}); // true
isEmptyPlainObject(Object.create(null)); // true
isEmptyPlainObject({ key: "value" }); // false
isEmptyPlainObject({ [Symbol.for("example")]: "value" }); // false

// Check if a value is a Standard Schema v1
const mySchema = string();
isStandardSchemaV1(mySchema); // true
isStandardSchemaV1({}); // false

// Get JSON Schema for input validation
const inputSchema = getStandardJSONSchemaV1Input(mySchema, {
  target: "draft-2020-12",
});

// Get JSON Schema for output validation
const outputSchema = getStandardJSONSchemaV1Output(mySchema, {
  target: "draft-2020-12",
});
```
