import {
  parse as wasmParse,
  type XmlDocument as WasmXmlDocument,
} from "./_wasm/xml.mjs";

/** A single XSD validation error. */
export interface XmlValidationError {
  message: string;
}

/** Result of validating a document against an XSD schema. */
export interface XmlValidationResult {
  valid: boolean;
  errors: XmlValidationError[];
}

/** A parsed XML document. */
export class XmlDocument {
  #doc: WasmXmlDocument;
  constructor(doc: WasmXmlDocument) {
    this.#doc = doc;
  }
  /** Serialize back to an XML string. */
  stringify(): string {
    return this.#doc.stringify();
  }
  /** Validate against an XSD schema string. */
  validate(xsd: string): XmlValidationResult {
    const errors = this.#doc.validateErrors(xsd);
    return {
      valid: errors.length === 0,
      errors: errors.map((message) => ({ message })),
    };
  }
  [Symbol.dispose](): void {
    this.#doc.free();
  }
}

/**
 * Parse an XML string into an XmlDocument.
 *
 * @example
 * ```ts
 * import { parse } from "@stdext/xml";
 * const doc = parse("<note><to>Alice</to></note>");
 * doc.stringify(); // "<note><to>Alice</to></note>"
 * ```
 *
 * @throws if the input is not well-formed XML.
 */
export function parse(xml: string): XmlDocument {
  return new XmlDocument(wasmParse(xml));
}
