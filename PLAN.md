# Plan: Type Inference for Validator Functions

## Goal

Implement type inference for the validator functions (`validate`,
`validateAsync`, `parse`, `parseAsync`) and schema builders in the `validation`
namespace, drawing inspiration from Zod. The input type of
`validate(schema, input)` and the return type of `parse(schema, input)` should
be inferred from the schema, including for composed schemas (`array`, `object`,
`combination`, `nullable`).

## Background

- Schemas implement `StandardSchemaV1<Input, Output>` (a generic interface) but
  the builders in `json_schema.ts` did NOT set the `~standard.types` field. As a
  result `StandardSchemaV1.InferInput`/`InferOutput` (which read
  `~standard.types`) resolved to `unknown` for these schemas.
- `validator.ts` used `StandardSchemaV1.InferInput<S>` / `InferOutput<S>` plus a
  union with `unknown`, so callers never got useful input typing and `parse`
  returned `unknown`.
- Zod exposes inference via typed schemas + `z.infer`. The Standard Schema
  equivalent is the `~standard.types` field plus the generic
  `StandardSchemaV1<Input, Output>` parameters.

## Tasks

-
  1. [x] Add inference helpers in `validation/infer.ts` exposing `InferInput<S>`
         and `InferOutput<S>` that read `~standard.types` (set by the schema
         builder) and fall back to `unknown`, plus composition helpers
         (`InferMemberOutput`, `InferObjectOutput`, `InferCombinationOutput`).
-
  2. [x] Update `validator.ts` (`validate`, `validateAsync`, `parse`,
         `parseAsync`) to use the new `InferInput`/`InferOutput` helpers so
         input is typed and parsed output carries the schema's output type. Kept
         the existing `boolean` schema shortcut and async support behavior.
-
  3. [x] Set `~standard.types` in the `schema()` builder so inference resolves
         to the schema's `Input`/`Output` (the generic params alone cannot infer
         `Input` because it is structurally absent from `StandardSchemaV1`).
-
  4. [x] Make schema builders in `json_schema.ts` carry proper composed types:
  - [x] 4a. `array({ items })` -> `InferOutput<items>[]` (input/output).
  - [x] 4b. `object({ properties })` -> object shape with all properties
        optional (JSON Schema's `required` is `string[]` and widens, so it
        cannot mark keys required at the type level).
  - [x] 4c. `combination({ allOf/anyOf/oneOf })` -> union of member output
        types.
  - [x] 4d. `nullable()` already typed as `null`; left as is.
-
  5. [x] Add type-level tests (`validation/infer.test.ts`) using compile-time
         `IsExact`/`IsSubtype` assertions for scalars, `array`, `object`,
         `combination`, and `parse`/`validate` signatures.
-
  6. [x] Verified with `tsc` (against the real `@standard-schema/spec` types)
         and runtime tests via Node (`--experimental-strip-types`): all type
         checks pass and all existing runtime behavior is preserved.

## Non-goals

- No new runtime behavior changes beyond setting the `~standard.types` carrier
  field (whose runtime values are `undefined`; it is a type-level carrier).
- No changes to JSON Schema output/input converters.
- No changes to other packages.
