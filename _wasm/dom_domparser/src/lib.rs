//! DOMParser implementation for WASM
//!
//! This module provides a DOMParser that wraps the browser's native DOMParser
//! for parsing HTML and XML strings into Document objects.

use wasm_bindgen::prelude::*;
use web_sys::DomParser;

/// DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
///
/// @example
/// ```ts
/// const parser = new DOMParser();
/// const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
/// ```
#[wasm_bindgen]
pub struct JsDOMParser {
    parser: DomParser,
}

#[wasm_bindgen]
impl JsDOMParser {
    /// Creates a new DOMParser instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> JsDOMParser {
        JsDOMParser {
            parser: DomParser::new().unwrap(),
        }
    }

    /// Parses a string into a Document.
    ///
    /// @param string - The string to parse
    /// @param content_type - The content type (e.g., "text/html", "text/xml")
    /// @returns A Document object
    #[wasm_bindgen]
    pub fn parse_from_string(&self, string: &str, content_type: &str) -> web_sys::Document {
        self.parser.parse_from_string(string, content_type).unwrap()
    }
}

// Re-export the DOM types for TypeScript
#[wasm_bindgen]
pub type Document = web_sys::Document;
#[wasm_bindgen]
pub type Node = web_sys::Node;
#[wasm_bindgen]
pub type Element = web_sys::Element;
#[wasm_bindgen]
pub type HtmlElement = web_sys::HtmlElement;
#[wasm_bindgen]
pub type Text = web_sys::Text;
#[wasm_bindgen]
pub type Comment = web_sys::Comment;
