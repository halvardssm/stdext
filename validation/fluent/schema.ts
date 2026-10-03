/**
 * The fluent schema runtime: {@linkcode createSchema}, {@linkcode pipe} and
 * the step normalization shared by every constructor.
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { failureResult, isStandardSchemaV1 } from "../utils.ts";
import type {
  Action,
  AsyncAction,
  PipeItem,
  PipeMethod,
  Schema,
} from "./types.ts";

/**
 * Options for {@linkcode createSchema}.
 */
export interface SchemaOptions {
  /**
   * Override the message of the type check (step 0) when it fails.
   * Issues from nested schemas and later steps are never rewritten.
   */
  message?: string;
  /** Kind specific definition, exposed as `schema.def`. */
  def?: Readonly<Record<string, unknown>>;
  /**
   * Vendor hook: attach extra props (e.g. `strict()` on objects) without
   * changing the core.
   */
  // deno-lint-ignore no-explicit-any
  extend?: (schema: Schema<any, any>) => Schema<any, any>;
}

/**
 * Whether a value is a thenable.
 *
 * @param value The value to check.
 * @returns `true` for promises and other thenables.
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return typeof (value as PromiseLike<T> | undefined)?.then === "function";
}

const failures = new WeakSet<object>();

/**
 * Create the failure result an {@linkcode Action} returns to fail the pipe.
 * Results are branded so a transform that returns data shaped like
 * `{ issues: [...] }` is never mistaken for a failure; actions must build
 * their failures with this function.
 *
 * @param message The issue message.
 * @param extra Structured metadata: `kind`, `expected`, `actual`.
 * @returns A standard failure result.
 *
 * @example
 * ```ts
 * import { fail } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const result = fail("nope", { kind: "custom" });
 * assertEquals(result.issues[0].message, "nope");
 * ```
 */
export function fail(
  message: string,
  extra?: { kind?: string; expected?: unknown; actual?: unknown },
): StandardSchemaV1.FailureResult {
  const result = failureResult(message, undefined, extra);
  failures.add(result);
  return result;
}

/**
 * Whether an action return value is a failure created by {@linkcode fail}.
 *
 * @param value The action return value.
 * @returns `true` if the value is a failure result.
 */
export function isFailure(
  value: unknown,
): value is StandardSchemaV1.FailureResult {
  return typeof value === "object" && value !== null && failures.has(value);
}

type StepRun = (
  value: unknown,
) =>
  | StandardSchemaV1.Result<unknown>
  | Promise<StandardSchemaV1.Result<unknown>>;

function wrapActionResult(result: unknown): StandardSchemaV1.Result<unknown> {
  return isFailure(result) ? result : { value: result };
}

/** S2: turn any pipe item into a function returning a standard result. */
function normalize(item: PipeItem<never, unknown>): StepRun {
  if (isStandardSchemaV1(item)) {
    return (value) => item["~standard"].validate(value);
  }

  if (Array.isArray(item)) {
    const [fn, message] = item as unknown as readonly [
      (value: unknown) => boolean,
      string?,
    ];
    return (value) =>
      fn(value) ? { value } : failureResult(
        message ?? "Input failed a custom check",
        undefined,
        { kind: "custom", actual: value },
      );
  }

  const action = item as Action<unknown, unknown> | AsyncAction<unknown>;
  return (value) => {
    const result = action.run(value);
    return isPromise(result)
      ? result.then(wrapActionResult)
      : wrapActionResult(result);
  };
}

/**
 * The single factory every constructor (`string()`, `object()`, ...) is a
 * thin wrapper around. Validation logic lives only in the composed steps.
 *
 * Steps run left to right and short-circuit on the first failure. Issues from
 * nested schemas pass through unchanged. The schema is async if any step
 * returns a promise.
 *
 * @param kind The runtime node type, e.g. `"string"`.
 * @param steps The pipe steps; step 0 is conventionally the type check.
 * @param options Extra options.
 * @returns A new immutable schema.
 *
 * @example
 * ```ts
 * import { createSchema, typeCheck } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const isString = createSchema<unknown, string>("string", [
 *   typeCheck((v): v is string => typeof v === "string", "string"),
 * ]);
 * assertEquals(isString["~standard"].validate("a"), { value: "a" });
 * ```
 */
export function createSchema<TInput, TOutput>(
  kind: string,
  steps: readonly PipeItem<never, unknown>[],
  options: SchemaOptions = {},
): Schema<TInput, TOutput> {
  const frozenSteps = Object.freeze([...steps]);
  const runs = frozenSteps.map(normalize);
  const def = Object.freeze({ ...options.def });
  const message = options.message ??
    (typeof def.message === "string" ? def.message : undefined);
  if (message !== undefined && def.message !== message) {
    return createSchema(kind, steps, {
      ...options,
      def: { ...def, message },
      message: undefined,
    });
  }

  const finish = (
    result: StandardSchemaV1.FailureResult,
    index: number,
  ): StandardSchemaV1.FailureResult =>
    message !== undefined && index === 0
      ? { issues: result.issues.map((issue) => ({ ...issue, message })) }
      : result;

  const runFrom = (
    index: number,
    value: unknown,
  ):
    | StandardSchemaV1.Result<unknown>
    | Promise<
      StandardSchemaV1.Result<unknown>
    > => {
    while (index < runs.length) {
      const result = runs[index](value);
      if (isPromise<StandardSchemaV1.Result<unknown>>(result)) {
        const at = index;
        return result.then((res) =>
          res.issues ? finish(res, at) : runFrom(at + 1, res.value)
        );
      }
      if (result.issues) return finish(result, index);
      value = result.value;
      index++;
    }
    return { value };
  };

  const schema: Schema<TInput, TOutput> = {
    kind,
    steps: frozenSteps,
    def,
    "~standard": {
      version: 1,
      vendor: "@stdext/validation",
      validate: (value: unknown) =>
        runFrom(0, value) as StandardSchemaV1.Result<TOutput>,
    },
    pipe:
      ((...items: PipeItem<never, unknown>[]) =>
        createSchema(kind, [...frozenSteps, ...items], { def })) as PipeMethod<
          TInput,
          TOutput
        >,
  };

  return options.extend
    ? options.extend(schema) as Schema<TInput, TOutput>
    : schema;
}

/**
 * Whether a value is a fluent schema created by {@linkcode createSchema}.
 *
 * @param value The value to check.
 * @returns `true` if the value is a fluent schema.
 */
export function isSchema(value: unknown): value is Schema {
  const schema = value as Schema | undefined;
  return isStandardSchemaV1(value) && typeof schema?.kind === "string" &&
    Array.isArray(schema.steps) && typeof schema.pipe === "function";
}

/**
 * Wrap any Standard Schema as a fluent schema, so type inference and runtime
 * dispatch are uniform. Fluent schemas are returned as-is.
 *
 * @param schema Any Standard Schema (Zod, Valibot, ArkType, ...).
 * @returns A fluent schema delegating to it.
 *
 * @example
 * ```ts
 * import { asSchema } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const foreign = {
 *   "~standard": {
 *     version: 1 as const,
 *     vendor: "other",
 *     validate: (value: unknown) => ({ value: String(value) }),
 *   },
 * };
 * assertEquals(asSchema(foreign)["~standard"].validate(1), { value: "1" });
 * ```
 */
// deno-lint-ignore no-explicit-any
export function asSchema<S extends StandardSchemaV1<any, any>>(
  schema: S,
): Schema<
  S extends StandardSchemaV1<infer I, unknown> ? I : never,
  S extends StandardSchemaV1<unknown, infer O> ? O : never
> {
  // deno-lint-ignore no-explicit-any
  if (isSchema(schema)) return schema as any;
  // deno-lint-ignore no-explicit-any
  return createSchema("standard", [schema]) as any;
}

/** The signature of {@linkcode pipe}. */
export interface PipeFunction {
  <A, B, C = B>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
  ): Schema<A, C>;
  <A, B, C = B, D = C>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
    a2: PipeItem<C, D>,
  ): Schema<A, D>;
  <A, B, C = B, D = C, E = D>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
    a2: PipeItem<C, D>,
    a3: PipeItem<D, E>,
  ): Schema<A, E>;
  <A, B, C = B, D = C, E = D, F = E>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
    a2: PipeItem<C, D>,
    a3: PipeItem<D, E>,
    a4: PipeItem<E, F>,
  ): Schema<A, F>;
  <A, B, C = B, D = C, E = D, F = E, G = F>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
    a2: PipeItem<C, D>,
    a3: PipeItem<D, E>,
    a4: PipeItem<E, F>,
    a5: PipeItem<F, G>,
  ): Schema<A, G>;
  <A, B, C = B, D = C, E = D, F = E, G = F, H = G>(
    first: StandardSchemaV1<A, B>,
    a1: PipeItem<B, C>,
    a2: PipeItem<C, D>,
    a3: PipeItem<D, E>,
    a4: PipeItem<E, F>,
    a5: PipeItem<F, G>,
    a6: PipeItem<G, H>,
  ): Schema<A, H>;
  /** Fallback for longer pipes: the output type is not tracked. */
  <A>(
    first: StandardSchemaV1<A, unknown>,
    // deno-lint-ignore no-explicit-any
    ...rest: PipeItem<any, unknown>[]
  ): Schema<A, unknown>;
}

/**
 * Compose left to right: `pipe(s, a1, a2)` is `s.pipe(a1, a2)`. The first
 * argument may be any Standard Schema; it is wrapped with {@linkcode asSchema}.
 *
 * @example
 * ```ts
 * import { match, pipe, string, transform } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const Slug = pipe(
 *   string(),
 *   match(/^[a-z-]+$/),
 *   transform((s) => s.toUpperCase()),
 * );
 * assertEquals(Slug["~standard"].validate("a-b"), { value: "A-B" });
 * ```
 */
export const pipe: PipeFunction = (
  // deno-lint-ignore no-explicit-any
  first: StandardSchemaV1<any, any>,
  // deno-lint-ignore no-explicit-any
  ...rest: PipeItem<any, unknown>[]
  // deno-lint-ignore no-explicit-any
): any => (asSchema(first).pipe as any)(...rest);
