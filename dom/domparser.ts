import type { Document, Node, Element } from "./_wasm/dom_domparser.generated.mjs";
import {
  instantiate,
  type InstantiateResult,
  type JsDOMParser as WasmDOMParser,
} from "./_wasm/dom_domparser.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

/**
 * DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
 *
 * @example parsing HTML
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
 * console.log(doc.documentElement.tagName); // "HTML"
 * ```
 *
 * @example parsing XML
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<root><item>test</item></root>", "text/xml");
 * console.log(doc.documentElement.tagName); // "ROOT"
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 */
export class DOMParser {
  #wasmParser: WasmDOMParser;

  constructor() {
    this.#wasmParser = new instance.JsDOMParser();
  }

  /**
   * Parses a string into a Document.
   *
   * @param string - The string to parse
   * @param contentType - The content type (e.g., "text/html", "text/xml", "application/xml")
   * @returns A Document object
   */
  parseFromString(string: string, contentType: string): Document {
    return this.#wasmParser.parse_from_string(string, contentType);
  }
}

// Re-export DOM types
export type { Document, Node, Element };
