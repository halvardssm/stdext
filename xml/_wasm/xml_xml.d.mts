// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { XmlDocument } from "@std/xml";

/**
 * A Standard Schema shaped issue: `message`, plus a best-effort `path` —
 * the chain of enclosing element names with 0-based indices for repeated
 * siblings.
 */
export type XmlIssue = {
  message: string;
  path?: (string | number)[];
};

/**
 * Result of `parse` — it never throws, every problem is an issue:
 *   - well-formed XML text → `{ value: XmlDocument }`
 *   - otherwise            → `{ issues: XmlIssue[] }`
 */
export type XmlParseResult = {
  value?: XmlDocument;
  issues?: XmlIssue[];
};

/**
 * Result of `XmlSchema.validate` — it never throws, every problem is an
 * issue:
 *   - XML text input, valid → `{ value: XmlDocument }`
 *   - tree input, valid     → `{}` — the caller already holds the tree
 *   - otherwise             → `{ issues: StandardSchemaV1.Issue[] }`
 */
export type XmlValidationResult = StandardSchemaV1.Result<XmlDocument>;

/**
 * A compiled XSD schema. Compile once, then validate any number of
 * documents given as XML text or as `XmlDocument` trees.
 */
export class XmlSchema {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Compile a schema from XML text or an `XmlDocument` tree.
   *
   * @throws {Error} if the schema is not well-formed or not a valid XSD.
   */
  constructor(schema: any);
  /**
   * Validate a document — XML text or an `XmlDocument` tree — against the
   * schema. Never throws: every problem is an issue.
   *
   * Returns `{ value }` for valid XML text (the parsed tree), `{}` for a
   * valid tree (the caller already holds it), `{ issues }` otherwise.
   */
  validate(document: any): XmlValidationResult;
}

/**
 * Parse XML text into a Standard Schema result. Never throws: every
 * problem is an issue. Tree input is not accepted — the wrapper already
 * holds any tree it could pass.
 *
 * Returns `{ value }` (the parsed tree) on success, `{ issues }` otherwise.
 */
export function parse(input: any, options: any): XmlParseResult;

/**
 * Serialize an @std/xml `XmlDocument` tree to XML text.
 *
 * `options` is @std/xml's `StringifyOptions`.
 *
 * @throws {Error} if the input is not a valid XmlDocument, or contains a
 * comment that cannot be serialized.
 */
export function stringify(doc: any, options: any): string;
