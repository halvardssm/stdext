//! DOMParser implementation for WASM
//!
//! This module provides a DOMParser that parses HTML and XML strings
//! into a serializable Document structure.

use html5ever::parse_document;
use html5ever::tendril::TendrilSink;
use markup5ever_rcdom::{RcDom, Handle, NodeData};
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

/// Represents a DOM Node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsNode {
    pub node_type: String,
    pub node_name: String,
    pub node_value: Option<String>,
    pub attributes: Vec<(String, String)>,
    pub children: Vec<JsNode>,
}

impl JsNode {
    fn from_rcdom(node: &Handle) -> JsNode {
        match &node.data {
            NodeData::Element { name, attrs, .. } => {
                let children: Vec<JsNode> = node.children.borrow().iter()
                    .map(|child| JsNode::from_rcdom(child))
                    .collect();
                
                let attrs: Vec<(String, String)> = attrs.borrow().iter()
                    .map(|attr| (attr.name.local.to_string(), attr.value.to_string()))
                    .collect();
                
                JsNode {
                    node_type: "ELEMENT_NODE".to_string(),
                    node_name: name.local.to_string(),
                    node_value: None,
                    attributes: attrs,
                    children,
                }
            }
            NodeData::Text { contents } => {
                JsNode {
                    node_type: "TEXT_NODE".to_string(),
                    node_name: "#text".to_string(),
                    node_value: Some(contents.borrow().to_string()),
                    attributes: vec![],
                    children: vec![],
                }
            }
            NodeData::Comment { contents } => {
                JsNode {
                    node_type: "COMMENT_NODE".to_string(),
                    node_name: "#comment".to_string(),
                    node_value: Some(contents.to_string()),
                    attributes: vec![],
                    children: vec![],
                }
            }
            NodeData::Document => {
                let children: Vec<JsNode> = node.children.borrow().iter()
                    .map(|child| JsNode::from_rcdom(child))
                    .collect();
                
                JsNode {
                    node_type: "DOCUMENT_NODE".to_string(),
                    node_name: "#document".to_string(),
                    node_value: None,
                    attributes: vec![],
                    children,
                }
            }
            NodeData::Doctype { .. } => {
                JsNode {
                    node_type: "DOCUMENT_TYPE_NODE".to_string(),
                    node_name: "#doctype".to_string(),
                    node_value: None,
                    attributes: vec![],
                    children: vec![],
                }
            }
            _ => {
                JsNode {
                    node_type: "UNKNOWN_NODE".to_string(),
                    node_name: "#unknown".to_string(),
                    node_value: None,
                    attributes: vec![],
                    children: vec![],
                }
            }
        }
    }
}

/// Represents a DOM Document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsDocument {
    pub document_element: Option<JsNode>,
    pub root: JsNode,
}

impl JsDocument {
    fn from_rcdom(dom: RcDom) -> JsDocument {
        let root = JsNode::from_rcdom(&dom.document);
        
        // Find the document element (first element child of document)
        let document_element = root.children.iter()
            .find(|n| n.node_type == "ELEMENT_NODE")
            .cloned();
        
        JsDocument {
            document_element,
            root,
        }
    }
}

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
    /// @param content_type - The content type (e.g., "text/html", "text/xml")
    /// @returns A Document object serialized as JSON
    #[wasm_bindgen]
    pub fn parse_from_string(&self, string: &str, _content_type: &str) -> JsValue {
        // Parse as HTML using html5ever
        // Note: content_type is currently ignored, always parses as HTML
        let dom = parse_document(RcDom::default(), Default::default())
            .from_utf8()
            .read_from(&mut string.as_bytes())
            .expect("Failed to parse document");
        
        let document = JsDocument::from_rcdom(dom);
        
        let serializer: Serializer = Serializer::new()
            .serialize_maps_as_objects(true)
            .serialize_missing_as_null(true);
        
        document.serialize(&serializer).unwrap()
    }
}

// TypeScript custom section for better type definitions
#[wasm_bindgen(typescript_custom_section)]
const TS_TYPES: &'static str = r#"
/**
 * A DOM Node
 */
export interface JsNode {
    node_type: string;
    node_name: string;
    node_value: string | null;
    attributes: [string, string][];
    children: JsNode[];
}

/**
 * A DOM Document
 */
export interface JsDocument {
    document_element: JsNode | null;
    root: JsNode;
}
"#;
