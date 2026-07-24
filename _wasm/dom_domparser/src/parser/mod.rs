//! DOM parsing implementations

pub mod html;
pub mod xml;
pub mod content_type;

use wasm_bindgen::prelude::*;

/// Parses a string into a DOM document
pub fn parse(input: &str, content_type: &str) -> JsValue {
    if content_type::is_html(content_type) {
        html::parse(input)
    } else if content_type::is_xml(content_type) {
        xml::parse(input)
    } else {
        // Default to HTML for unknown content types
        html::parse(input)
    }
}
