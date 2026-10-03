/**
 * Export fluent schemas to JSON Schema draft 2020-12.
 *
 * The export describes what the schema ACCEPTS (its input). It is lossless
 * for core types, keyword actions and combinators. Anything that cannot be
 * represented (transforms, custom refinements, foreign schemas without a JSON
 * Schema converter) degrades to the `true` schema per node, or throws in
 * `strict` mode. It never emits a stricter or different schema than the
 * runtime validates.
 *
 * @module
 */

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { JSONSchema } from "@stdext/json/json-schema/2020-12";
import {
  getSchemaVersion,
  isStandardJSONSchemaV1,
  isStandardSchemaV1,
} from "../utils.ts";
import { isSchema } from "./schema.ts";
import type { KeywordAction, Schema } from "./types.ts";

// deno-lint-ignore no-explicit-any
type AnySchema = StandardSchemaV1<any, any>;
type Node = JSONSchema | boolean;

/**
 * Options for {@linkcode toJSONSchema}.
 */
export interface ToJSONSchemaParams {
  /** The JSON Schema version. Defaults to `"draft-2020-12"`. */
  target?: StandardJSONSchemaV1.Target;
  /**
   * Throw when a node cannot be represented (e.g. an opaque transform)
   * instead of degrading it. Defaults to `false`.
   */
  strict?: boolean;
  /** Schema for nodes that cannot be represented. Defaults to `true`. */
  fallback?: (schema: AnySchema) => JSONSchema | boolean;
}

interface Context {
  params: ToJSONSchemaParams;
  stack: Set<unknown>;
  names: Map<unknown, string>;
  defs: Record<string, JSONSchema>;
}

function isKeywordAction(step: unknown): step is KeywordAction<never> {
  return typeof (step as KeywordAction<never>)?.jsonSchemaKeyword === "string";
}

function toObject(node: Node): JSONSchema {
  if (node === true) return {};
  if (node === false) return { not: true };
  return node;
}

/** Drop `undefined` values and the `~standard` property of builder objects. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (v === undefined || key === "~standard" || key === "$schema") continue;
      out[key] = clean(v);
    }
    return out;
  }
  return value;
}

function unrepresentable(
  ctx: Context,
  what: string,
  schema?: AnySchema,
): Node {
  if (ctx.params.strict) {
    throw new TypeError(`Cannot represent ${what} as JSON Schema`);
  }
  return schema && ctx.params.fallback ? ctx.params.fallback(schema) : true;
}

/** Whether a schema may change the value it validates. */
function hasTransform(schema: unknown): boolean {
  if (!isSchema(schema)) return true;
  const base = (schema.def.baseSteps as number | undefined) ?? 0;
  return schema.steps.slice(base).some((step) =>
    isStandardSchemaV1(step)
      ? hasTransform(step)
      : (step as { kind?: string }).kind === "transform"
  );
}

/** Whether an object entry may be absent. */
function isOptionalEntry(entry: AnySchema): boolean {
  if (isSchema(entry)) {
    if (entry.kind === "optional" || entry.kind === "unknown") return true;
    if (entry.kind !== "standard") return false;
  }
  try {
    const result = entry["~standard"].validate(undefined);
    return !(result instanceof Promise) && !result.issues;
  } catch {
    return false;
  }
}

function addKeyword(
  ctx: Context,
  node: Node,
  action: KeywordAction<never>,
): Node {
  if (node === false) return false;
  const target: JSONSchema = node === true ? {} : node;
  const value = action.jsonSchemaKeyword === "contains"
    ? convert(ctx, action.jsonSchemaValue as AnySchema)
    : action.jsonSchemaValue;
  const entries: Record<string, unknown> = {
    [action.jsonSchemaKeyword]: value,
    ...action.jsonSchemaExtra,
  };

  const record = target as Record<string, unknown>;
  if (Object.keys(entries).some((k) => k in record)) {
    (target.allOf ??= []).push(entries as JSONSchema);
  } else {
    Object.assign(record, entries);
  }
  return target;
}

function addAllOf(node: Node, sub: Node): Node {
  if (node === false || sub === true) return node;
  if (sub === false) return false;
  const target: JSONSchema = node === true ? {} : node;
  if (Object.keys(target).length === 0) return sub;
  (target.allOf ??= []).push(sub);
  return target;
}

function baseNode(ctx: Context, schema: Schema): Node {
  const def = schema.def as Record<string, unknown>;
  const list = (options: unknown) =>
    (options as AnySchema[]).map((o) => toObject(convert(ctx, o)));

  switch (schema.kind) {
    case "string":
    case "number":
    case "integer":
    case "boolean":
    case "null":
      return { type: schema.kind };
    case "const":
      return { const: def.value };
    case "enum":
      return { enum: [...(def.values as unknown[])] };
    case "unknown":
      return true;
    case "never":
      return false;
    case "date":
      return unrepresentable(ctx, "a Date", schema);
    case "object": {
      const entries = def.entries as Record<string, AnySchema>;
      const properties: Record<string, Node> = {};
      const required = new Set<string>(def.required as string[] | undefined);
      for (const [key, entry] of Object.entries(entries)) {
        properties[key] = convert(ctx, entry);
        if (!isOptionalEntry(entry)) required.add(key);
      }
      const node: JSONSchema = { type: "object" };
      if (Object.keys(properties).length) node.properties = properties;
      if (required.size) node.required = [...required];
      if (def.mode === "strict") node.additionalProperties = false;
      if (def.mode === "rest") {
        const rest = convert(ctx, def.rest as AnySchema);
        if (rest !== true) node.additionalProperties = rest;
      }
      return node;
    }
    case "array": {
      const items = convert(ctx, def.item as AnySchema);
      return items === true ? { type: "array" } : { type: "array", items };
    }
    case "record":
      return {
        type: "object",
        additionalProperties: convert(ctx, def.value as AnySchema),
      };
    case "anyOf":
      return { anyOf: list(def.options) };
    case "discriminatedOneOf":
    case "oneOf":
      return { oneOf: list(def.options) };
    case "allOf":
      return { allOf: list(def.options) };
    case "not":
      return { not: convert(ctx, def.inner as AnySchema) };
    case "nullable":
      return {
        anyOf: [toObject(convert(ctx, def.inner as AnySchema)), {
          type: "null",
        }],
      };
    case "optional":
      return convert(ctx, def.inner as AnySchema);
    case "lazy":
      return convert(ctx, (def.getter as () => AnySchema)());
    default:
      return true;
  }
}

function convertFluent(ctx: Context, schema: Schema): Node {
  let node = baseNode(ctx, schema);
  const base = (schema.def.baseSteps as number | undefined) ?? 0;
  let tainted = false;

  for (const step of schema.steps.slice(base)) {
    if (isKeywordAction(step)) {
      if (tainted) {
        unrepresentable(
          ctx,
          `keyword "${step.jsonSchemaKeyword}" after a transform`,
        );
      } else {
        node = addKeyword(ctx, node, step);
      }
    } else if (isStandardSchemaV1(step)) {
      if (tainted) {
        unrepresentable(ctx, "a schema step after a transform", step);
      } else {
        node = addAllOf(node, convert(ctx, step));
        tainted = hasTransform(step);
      }
    } else if ((step as { kind?: string }).kind === "transform") {
      unrepresentable(ctx, "a transform");
      tainted = true;
    } else {
      unrepresentable(
        ctx,
        `a custom "${(step as { kind?: string }).kind}" check`,
      );
    }
  }
  return node;
}

function convertForeign(ctx: Context, schema: AnySchema): Node {
  if (!isStandardJSONSchemaV1(schema)) {
    return unrepresentable(
      ctx,
      `a "${schema["~standard"].vendor}" schema without JSON Schema support`,
      schema,
    );
  }
  const json = schema["~standard"].jsonSchema.input({
    target: ctx.params.target ?? "draft-2020-12",
  });
  return clean(json) as Node;
}

function convert(ctx: Context, schema: AnySchema): Node {
  if (!isStandardSchemaV1(schema)) {
    return unrepresentable(ctx, "a value that is not a Standard Schema");
  }

  if (ctx.stack.has(schema)) {
    let name = ctx.names.get(schema);
    if (!name) {
      name = `ref${ctx.names.size}`;
      ctx.names.set(schema, name);
    }
    return { $ref: `#/$defs/${name}` };
  }

  ctx.stack.add(schema);
  let node: Node;
  try {
    node = isSchema(schema)
      ? convertFluent(ctx, schema)
      : convertForeign(ctx, schema);
  } finally {
    ctx.stack.delete(schema);
  }

  const name = ctx.names.get(schema);
  if (name) {
    ctx.defs[name] = toObject(node);
    return { $ref: `#/$defs/${name}` };
  }
  return typeof node === "object" && Object.keys(node).length === 0
    ? true
    : node;
}

/**
 * Convert a schema to JSON Schema draft 2020-12. The result describes the
 * values the schema accepts.
 *
 * - Core types, keyword actions and combinators map losslessly.
 * - `lazy` recursion becomes `$ref` / `$defs`.
 * - Foreign Standard Schemas use their own JSON Schema converter
 *   (`~standard.jsonSchema.input`).
 * - Transforms, custom refinements and foreign schemas without a converter
 *   degrade to `true` (see `fallback`), or throw when `strict` is set.
 *
 * @param schema Any Standard Schema.
 * @param params Export options.
 * @returns The JSON Schema.
 *
 * @example
 * ```ts
 * import {
 *   minLength,
 *   object,
 *   pipe,
 *   string,
 *   toJSONSchema,
 * } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const json = toJSONSchema(object({ name: pipe(string(), minLength(1)) }));
 * assertEquals(json.properties, { name: { type: "string", minLength: 1 } });
 * assertEquals(json.required, ["name"]);
 * ```
 */
export function toJSONSchema(
  schema: AnySchema,
  params: ToJSONSchemaParams = {},
): JSONSchema {
  const ctx: Context = {
    params,
    stack: new Set(),
    names: new Map(),
    defs: {},
  };
  const root = toObject(convert(ctx, schema));
  const result: JSONSchema = {
    $schema: getSchemaVersion(params.target ?? "draft-2020-12"),
    ...root,
  };
  if (Object.keys(ctx.defs).length) result.$defs = ctx.defs;
  return result;
}
