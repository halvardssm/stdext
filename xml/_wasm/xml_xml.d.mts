// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { XmlDocument } from "@std/xml";

/**
 * StandardSchemaV1 compatible result
 *
 * Result of `validate`: the Standard Schema `Result` union shape.
 *   - success: `{ value: XmlDocument }` (`issues` is undefined — falsy)
 *   - failure: `{ issues: StandardSchemaV1.Issue[] }` (no `value`)
 */
export type XmlValidationResult = StandardSchemaV1.Result<XmlDocument>;

/**
 * Parse XML text into a JSON-encoded @std/xml `XmlDocument`.
 *
 * `options` is a JSON-encoded @std/xml `ParseOptions`.
 *
 * @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
 * is not well-formed, or when maxDepth is exceeded.
 */
export function parse(input: string, options: string): string;

/**
 * Serialize a JSON-encoded @std/xml `XmlDocument` to XML text.
 *
 * `options` is a JSON-encoded @std/xml `StringifyOptions`.
 *
 * @throws {Error} if the input is not a valid XmlDocument, or contains a
 * comment that cannot be serialized.
 */
export function stringify(doc: string, options: string): string;

/**
 * Validate XML text against an XSD schema (also XML text).
 *
 * Returns a JSON-encoded Standard Schema result: `{ value: XmlDocument }`
 * on success, `{ issues }` on failure. Issues carry `message` and, when
 * uppsala reports a position, `line`, `column` and a best-effort `path`.
 *
 * @throws {Error} if the document or schema is not well-formed, or the
 * schema cannot be compiled.
 */
export function validate(document: string, schema: string): string;
