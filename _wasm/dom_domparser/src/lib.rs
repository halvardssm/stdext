//! DOMParser implementation for WASM
//!
//! This module provides a DOMParser that parses HTML and XML strings
//! into a serializable Document structure.
//!
//! ## Architecture
//!
//! The implementation uses a modular structure:
//! - `parser/` - Contains HTML and XML parsing logic
//! - `dom/` - Contains DOM node and document structures
//!
//! The Rust side focuses on parsing, while the TypeScript wrapper
//! provides the full DOM API.

mod dom;
mod parser;

use wasm_bindgen::prelude::*;

/// DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
///
/// @example
/// ```ts
/// const parser = new DOMParser();
/// const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
/// ```
#[wasm_bindgen]
pub struct JsDOMParser;

#[wasm_bindgen]
impl JsDOMParser {
    /// Creates a new DOMParser instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> JsDOMParser {
        JsDOMParser
    }

    /// Parses a string into a Document.
    ///
    /// @param string - The string to parse
    /// @param content_type - The content type (e.g., "text/html", "text/xml", "application/xml")
    /// @returns A Document object serialized as JSON, or an error message
    #[wasm_bindgen]
    pub fn parse_from_string(&self, string: &str, content_type: &str) -> JsValue {
        parser::parse(string, content_type)
    }
}

// ============================================================================
// TypeScript Type Definitions
// ============================================================================

#[wasm_bindgen(typescript_custom_section)]
const TS_TYPES: &'static str = r#"
/** Node types */
export const ELEMENT_NODE = 1;
export const ATTRIBUTE_NODE = 2;
export const TEXT_NODE = 3;
export const CDATA_SECTION_NODE = 4;
export const ENTITY_REFERENCE_NODE = 5;
export const ENTITY_NODE = 6;
export const PROCESSING_INSTRUCTION_NODE = 7;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;
export const DOCUMENT_TYPE_NODE = 10;
export const DOCUMENT_FRAGMENT_NODE = 11;
export const NOTATION_NODE = 12;

/** A DOM Node */
export interface JsNode {
    node_type: number;
    node_name: string;
    node_value: string | null;
    attributes: [string, string][];
    children: JsNode[];
}

/** A DOM Document */
export interface JsDocument {
    document_element: JsNode | null;
    root: JsNode;
}
"#;
