/**
 * Compile JSON Schema draft 2020-12 into fluent schemas (best effort).
 *
 * Every supported keyword becomes the same keyword action `toJSONSchema`
 * exports, so for schemas built from core types, keyword actions and
 * combinators `fromJsonSchema(toJSONSchema(s))` accepts exactly what `s`
 * accepts.
 *
 * @module
 */

import type { JSONSchema } from "@stdext/json/json-schema/2020-12";
import { isSupportedFormat } from "../keywords.ts";
import {
  contains,
  exclusiveMaximum,
  exclusiveMinimum,
  format,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  pattern,
  uniqueItems,
} from "./actions.ts";
import {
  allOf,
  anyOf,
  array,
  discriminatedOneOf,
  lazy,
  not,
  object,
  oneOf,
  optional,
} from "./combinators.ts";
import {
  boolean,
  const_,
  enum_,
  integer,
  never,
  null_,
  number,
  string,
  unknown,
} from "./primitives.ts";
import type { PipeItem, Schema } from "./types.ts";

// deno-lint-ignore no-explicit-any
type AnySchema = Schema<any, any>;
type Node = JSONSchema | boolean;

/**
 * Options for {@linkcode fromJsonSchema}.
 */
export interface FromJSONSchemaParams {
  /**
   * What to do with unsupported keywords and references: `"ignore"` skips
   * them (see `onWarning`), `"throw"` throws a `TypeError`. Default
   * `"ignore"`.
   */
  unsupported?: "ignore" | "throw";
  /** Called for every skipped keyword or unsupported feature. */
  onWarning?: (message: string, keyword?: string) => void;
}

/** Keywords that carry no validation and are always ignored silently. */
const ANNOTATIONS = new Set([
  "$schema",
  "$id",
  "$comment",
  "$anchor",
  "$defs",
  "definitions",
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
  "contentEncoding",
  "contentMediaType",
  "contentSchema",
]);

const TYPE_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "properties",
  "required",
  "additionalProperties",
  "minProperties",
  "maxProperties",
]);

const SUPPORTED = new Set([
  ...TYPE_KEYWORDS,
  "type",
  "const",
  "enum",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "$ref",
  "minContains",
  "maxContains",
]);

/** Types a schema without `type` but with type specific keywords may be. */
const ANY_TYPE = ["string", "number", "boolean", "null", "object", "array"];

function withActions(
  base: AnySchema,
  // deno-lint-ignore no-explicit-any
  actions: PipeItem<any, unknown>[],
): AnySchema {
  return actions.length
    // deno-lint-ignore no-explicit-any
    ? (base.pipe as any)(...actions)
    : base;
}

class Compiler {
  readonly defs = new Map<string, Node>();
  readonly compiled = new Map<string, AnySchema>();
  root!: AnySchema;

  constructor(
    readonly params: FromJSONSchemaParams,
    root: Node,
    definitions: Record<string, Node>,
  ) {
    for (const [name, def] of Object.entries(definitions)) {
      this.defs.set(name, def);
    }
    if (typeof root === "object") {
      for (
        const [name, def] of Object.entries({
          ...(root as Record<string, unknown>).definitions as
            | Record<string, Node>
            | undefined,
          ...root.$defs,
        })
      ) {
        this.defs.set(name, def);
      }
    }
  }

  unsupported(message: string, keyword?: string): void {
    if (this.params.unsupported === "throw") {
      throw new TypeError(`Unsupported JSON Schema: ${message}`);
    }
    this.params.onWarning?.(message, keyword);
  }

  compileDef(name: string): AnySchema {
    let schema = this.compiled.get(name);
    if (!schema) {
      schema = this.compile(this.defs.get(name)!);
      this.compiled.set(name, schema);
    }
    return schema;
  }

  ref(ref: string): AnySchema | undefined {
    if (ref === "#") return lazy(() => this.root);
    const match = /^#\/(?:\$defs|definitions)\/(.+)$/.exec(ref);
    const name = match ? decodeURIComponent(match[1]) : undefined;
    if (name !== undefined && this.defs.has(name)) {
      return lazy(() => this.compileDef(name));
    }
    this.unsupported(`Cannot resolve $ref "${ref}"`, "$ref");
  }

  compile(node: Node): AnySchema {
    if (node === true) return unknown();
    if (node === false) return never();

    const schema = node as Record<string, unknown>;
    for (const keyword of Object.keys(schema)) {
      if (!SUPPORTED.has(keyword) && !ANNOTATIONS.has(keyword)) {
        this.unsupported(`Keyword "${keyword}" is not supported`, keyword);
      }
    }

    const parts: AnySchema[] = [];

    const typed = this.compileTyped(node);
    if (typed) parts.push(typed);

    if ("const" in node) parts.push(const_(node.const as string));
    if (node.enum) parts.push(enum_(node.enum as string[]));
    if (node.allOf) {
      parts.push(allOf(node.allOf.map((s) => this.compile(s))));
    }
    if (node.anyOf) {
      parts.push(anyOf(node.anyOf.map((s) => this.compile(s))));
    }
    if (node.oneOf) parts.push(this.compileOneOf(node.oneOf));
    if (node.not !== undefined) parts.push(not(this.compile(node.not)));
    if (node.$ref !== undefined) {
      const ref = this.ref(node.$ref);
      if (ref) parts.push(ref);
    }

    if (parts.length === 0) return unknown();
    return parts.length === 1 ? parts[0] : allOf(parts);
  }

  compileOneOf(options: JSONSchema[]): AnySchema {
    const compiled = options.map((o) => this.compile(o));
    const first = compiled[0]?.def.entries as
      | Record<string, AnySchema>
      | undefined;

    for (const key of Object.keys(first ?? {})) {
      const seen = new Set<unknown>();
      const ok = compiled.every((option) => {
        const entry = (option.def.entries as Record<string, AnySchema>)?.[key];
        const values = entry?.kind === "const"
          ? [entry.def.value]
          : entry?.kind === "enum"
          ? entry.def.values as unknown[]
          : undefined;
        if (!values || values.some((v) => seen.has(v))) return false;
        values.forEach((v) => seen.add(v));
        return true;
      });
      if (ok) {
        // deno-lint-ignore no-explicit-any
        return discriminatedOneOf(key, compiled as any);
      }
    }
    return oneOf(compiled);
  }

  /** The `type` plus every type specific keyword. */
  compileTyped(node: JSONSchema): AnySchema | undefined {
    const record = node as Record<string, unknown>;
    const hasKeywords = Object.keys(record).some((k) => TYPE_KEYWORDS.has(k));
    if (node.type === undefined && !hasKeywords) return undefined;

    const types = node.type === undefined
      ? ANY_TYPE
      : ([] as string[]).concat(node.type);
    const schemas = types.map((type) =>
      this.compileType(type, node, node.type === undefined)
    );
    return schemas.length === 1 ? schemas[0] : anyOf(schemas);
  }

  compileType(type: string, node: JSONSchema, untyped: boolean): AnySchema {
    // deno-lint-ignore no-explicit-any
    const actions: PipeItem<any, unknown>[] = [];
    const push = (
      condition: boolean,
      // deno-lint-ignore no-explicit-any
      action: () => PipeItem<any, unknown>,
    ) => {
      if (condition) actions.push(action());
    };

    switch (type) {
      case "string": {
        push(node.minLength !== undefined, () => minLength(node.minLength!));
        push(node.maxLength !== undefined, () => maxLength(node.maxLength!));
        push(node.pattern !== undefined, () => pattern(node.pattern!));
        if (node.format !== undefined) {
          if (isSupportedFormat(node.format)) actions.push(format(node.format));
          else {
            this.unsupported(
              `Format "${node.format}" is not supported`,
              "format",
            );
          }
        }
        return withActions(string(), actions);
      }
      case "number":
      case "integer": {
        push(node.minimum !== undefined, () => minimum(node.minimum!));
        push(node.maximum !== undefined, () => maximum(node.maximum!));
        push(
          node.exclusiveMinimum !== undefined,
          () => exclusiveMinimum(node.exclusiveMinimum!),
        );
        push(
          node.exclusiveMaximum !== undefined,
          () => exclusiveMaximum(node.exclusiveMaximum!),
        );
        push(node.multipleOf !== undefined, () => multipleOf(node.multipleOf!));
        return withActions(
          type === "integer" && !untyped ? integer() : number(),
          actions,
        );
      }
      case "boolean":
        return boolean();
      case "null":
        return null_();
      case "array": {
        const r = node as Record<string, unknown>;
        if (r.prefixItems) {
          this.unsupported(
            `Keyword "prefixItems" is not supported`,
            "prefixItems",
          );
        }
        push(node.minItems !== undefined, () => minItems(node.minItems!));
        push(node.maxItems !== undefined, () => maxItems(node.maxItems!));
        push(node.uniqueItems === true, () => uniqueItems());
        push(
          node.contains !== undefined,
          () =>
            contains(this.compile(node.contains!), {
              minContains: node.minContains,
              maxContains: node.maxContains,
            }),
        );
        const items = node.items === undefined
          ? unknown()
          : this.compile(node.items);
        return withActions(array(items), actions);
      }
      case "object": {
        push(
          node.minProperties !== undefined,
          () => minProperties(node.minProperties!),
        );
        push(
          node.maxProperties !== undefined,
          () => maxProperties(node.maxProperties!),
        );
        const required = new Set(node.required);
        const entries: Record<string, AnySchema> = {};
        for (const [key, property] of Object.entries(node.properties ?? {})) {
          const compiled = this.compile(property);
          entries[key] = required.has(key) ? compiled : optional(compiled);
        }
        for (const key of required) {
          if (!(key in entries)) entries[key] = unknown();
        }

        const base = object(entries, {
          required: node.required,
        });
        const shaped = node.additionalProperties === false
          ? base.additionalProperties(false)
          : base.additionalProperties(
            node.additionalProperties === undefined ||
              node.additionalProperties === true
              ? unknown()
              : this.compile(node.additionalProperties),
          );
        return withActions(shaped as AnySchema, actions);
      }
      default:
        this.unsupported(`Type "${type}" is not supported`, "type");
        return unknown();
    }
  }
}

/**
 * Compile a JSON Schema (draft 2020-12) into a fluent schema. Best effort:
 *
 * - `type`, `const`, `enum`, `allOf`, `anyOf`, `oneOf`, `not`, the string,
 *   number, array and object keywords and local `$ref`s are supported.
 *   `oneOf` over object schemas with a distinct literal property compiles to
 *   {@linkcode discriminatedOneOf}.
 * - `$defs` / `definitions` and `$ref: "#"` resolve lazily, so recursive
 *   schemas work.
 * - Boolean schemas map to `unknown()` (`true`) and `never()` (`false`).
 * - Unsupported keywords (`patternProperties`, `prefixItems`, `if`/`then`,
 *   `$dynamicRef`, `unevaluated*`, remote `$ref`, ...) are ignored with a
 *   warning, or throw, per `params`.
 *
 * Unlike JSON Schema validators this keeps unknown object keys in the output
 * (as `additionalProperties` defaults to allowed).
 *
 * @param schema The JSON Schema, or a boolean schema.
 * @param params How to treat unsupported features.
 * @param definitions Extra definitions for `$ref: "#/$defs/<name>"`.
 * @returns A fluent schema.
 *
 * @example
 * ```ts
 * import { fromJsonSchema } from "@stdext/validation/fluent";
 * import { validate } from "@stdext/validation";
 * import { assert } from "@std/assert";
 *
 * const schema = fromJsonSchema({
 *   type: "object",
 *   properties: { name: { type: "string", minLength: 2 } },
 *   required: ["name"],
 * });
 * assert(!validate(schema, { name: "Ann" }).issues);
 * assert(validate(schema, { name: "A" }).issues);
 * ```
 */
export function fromJsonSchema(
  schema: JSONSchema | boolean,
  params: FromJSONSchemaParams = {},
  definitions: Record<string, JSONSchema | boolean> = {},
): Schema<unknown, unknown> {
  const compiler = new Compiler(params, schema, definitions);
  compiler.root = compiler.compile(schema);
  return compiler.root;
}
