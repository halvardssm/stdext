/**
 * Types of the fluent pipe validation system: issues, results, schemas and
 * actions.
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A Standard Schema issue plus additive structured metadata.
 */
export interface Issue extends StandardSchemaV1.Issue {
  /** Machine-readable kind: `"type"`, `"minLength"`, `"custom"`, ... */
  kind: string;
  /** What was expected, for form libraries and i18n. */
  expected?: unknown;
  /** What was received, for form libraries and i18n. */
  actual?: unknown;
}

/** Sync results are exactly the standard result shape. */
export type Result<T> = StandardSchemaV1.Result<T>;

/** A result that may still be pending. */
export type MaybeAsyncResult<T> = Result<T> | Promise<Result<T>>;

/** Infer the input type of a Standard Schema. */
export type SchemaInput<S> = S extends StandardSchemaV1<infer I, unknown> ? I
  : never;

/** Infer the output type of a Standard Schema. */
export type SchemaOutput<S> = S extends StandardSchemaV1<unknown, infer O> ? O
  : never;

/**
 * An action returns the next value, or a standard failure result
 * (`{ issues: [...] }`) to fail the pipe.
 */
export type ActionResult<T> = T | StandardSchemaV1.FailureResult;

/**
 * A sync action: a check (`TOutput = TInput`) or a transform.
 */
export interface Action<TInput, TOutput = TInput> {
  /** Machine-readable: `"check"`, `"transform"`, `"minLength"`, ... */
  readonly kind: string;
  /** Return the next value, or a failure result. */
  run(value: TInput): ActionResult<TOutput>;
}

/**
 * An async action. Its presence anywhere makes the whole schema async.
 */
export interface AsyncAction<TInput, TOutput = TInput> {
  readonly kind: string;
  readonly async: true;
  run(value: TInput): Promise<ActionResult<TOutput>>;
}

/**
 * An action tied to a JSON Schema draft 2020-12 keyword, so it can be
 * exported losslessly by `toJSONSchema`.
 */
export interface KeywordAction<TInput, TOutput = TInput>
  extends Action<TInput, TOutput> {
  /** The keyword this action represents, e.g. `"minLength"`. */
  readonly jsonSchemaKeyword: string;
  /** The serializable keyword value, e.g. `3` for `minLength(3)`. */
  readonly jsonSchemaValue: unknown;
  /** Extra sibling keywords, e.g. `minContains` next to `contains`. */
  readonly jsonSchemaExtra?: Readonly<Record<string, unknown>>;
}

/**
 * A pipe step: an action, any Standard Schema (ours or a third party's), or
 * the `[predicate, message?]` check shorthand.
 *
 * The input of a nested schema is not checked against the pipe's value type,
 * so asymmetric schemas (input differs from output) can be used as steps.
 */
export type PipeItem<TInput, TOutput = TInput> =
  | Action<TInput, TOutput>
  | AsyncAction<TInput, TOutput>
  // deno-lint-ignore no-explicit-any
  | StandardSchemaV1<any, TOutput>
  | readonly [(value: TInput) => boolean, string?];

/**
 * Infer the output type of a pipe step given the value type flowing in.
 */
export type StepOutput<TIn, S> = S extends StandardSchemaV1<unknown, infer O>
  ? O
  : S extends { run(value: never): infer R }
    ? Exclude<Awaited<R>, StandardSchemaV1.FailureResult>
  : S extends readonly [unknown, ...unknown[]] ? TIn
  : never;

/** Infer the output of a pipe step. Alias kept for readability. */
export type ActionOutput<T, A> = StepOutput<T, A>;

/**
 * The pipe signature shared by `pipe(schema, ...)` and `schema.pipe(...)`.
 * Each step's output type is inferred from the step; steps without an output
 * type of their own (the `[predicate, message]` shorthand) keep the previous
 * one.
 */
export interface PipeMethod<TInput, TOutput> {
  <B = TOutput>(a1: PipeItem<TOutput, B>): Schema<TInput, B>;
  <B = TOutput, C = B>(
    a1: PipeItem<TOutput, B>,
    a2: PipeItem<B, C>,
  ): Schema<TInput, C>;
  <B = TOutput, C = B, D = C>(
    a1: PipeItem<TOutput, B>,
    a2: PipeItem<B, C>,
    a3: PipeItem<C, D>,
  ): Schema<TInput, D>;
  <B = TOutput, C = B, D = C, E = D>(
    a1: PipeItem<TOutput, B>,
    a2: PipeItem<B, C>,
    a3: PipeItem<C, D>,
    a4: PipeItem<D, E>,
  ): Schema<TInput, E>;
  <B = TOutput, C = B, D = C, E = D, F = E>(
    a1: PipeItem<TOutput, B>,
    a2: PipeItem<B, C>,
    a3: PipeItem<C, D>,
    a4: PipeItem<D, E>,
    a5: PipeItem<E, F>,
  ): Schema<TInput, F>;
  <B = TOutput, C = B, D = C, E = D, F = E, G = F>(
    a1: PipeItem<TOutput, B>,
    a2: PipeItem<B, C>,
    a3: PipeItem<C, D>,
    a4: PipeItem<D, E>,
    a5: PipeItem<E, F>,
    a6: PipeItem<F, G>,
  ): Schema<TInput, G>;
  /** Fallback for longer pipes: the output type is not tracked. */
  (
    // deno-lint-ignore no-explicit-any
    ...items: PipeItem<any, unknown>[]
  ): Schema<TInput, unknown>;
}

/**
 * A fluent schema. It is a Standard Schema, so `validate`, `parse` and any
 * other consumer works unchanged. Schemas are immutable.
 */
export interface Schema<TInput = unknown, TOutput = TInput>
  extends StandardSchemaV1<TInput, TOutput> {
  /** The runtime node type: `"string"`, `"object"`, `"union"`, ... */
  readonly kind: string;
  /** The steps of the pipe, in order (step 0 is the type check). */
  readonly steps: readonly PipeItem<never, unknown>[];
  /** Kind specific definition, used for introspection and export. */
  readonly def: Readonly<Record<string, unknown>>;
  /** Append steps; returns a NEW schema. */
  readonly pipe: PipeMethod<TInput, TOutput>;
}
