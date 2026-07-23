//! DOMParser implementation for WASM
//!
//! This module provides a DOMParser that parses HTML and XML strings
//! into a serializable Document structure.

use html5ever::parse_document;
use html5ever::tendril::TendrilSink;
use markup5ever_rcdom::{RcDom, Handle, NodeData};
use quick_xml::events::Event;
use quick_xml::Reader;
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

    fn new_element(name: String, attributes: Vec<(String, String)>, children: Vec<JsNode>) -> JsNode {
        JsNode {
            node_type: "ELEMENT_NODE".to_string(),
            node_name: name,
            node_value: None,
            attributes,
            children,
        }
    }

    fn new_text(content: &str) -> JsNode {
        JsNode {
            node_type: "TEXT_NODE".to_string(),
            node_name: "#text".to_string(),
            node_value: Some(content.to_string()),
            attributes: vec![],
            children: vec![],
        }
    }

    fn new_comment(content: &str) -> JsNode {
        JsNode {
            node_type: "COMMENT_NODE".to_string(),
            node_name: "#comment".to_string(),
            node_value: Some(content.to_string()),
            attributes: vec![],
            children: vec![],
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

    fn new(root: JsNode, document_element: Option<JsNode>) -> JsDocument {
        JsDocument {
            document_element,
            root,
        }
    }
}

/// Parse content type and determine if it's HTML or XML
fn is_html_content_type(content_type: &str) -> bool {
    let content_type_lower = content_type.to_lowercase();
    content_type_lower.contains("text/html") ||
    content_type_lower.contains("application/xhtml")
}

fn is_xml_content_type(content_type: &str) -> bool {
    let content_type_lower = content_type.to_lowercase();
    content_type_lower.contains("text/xml") ||
    content_type_lower.contains("application/xml") ||
    content_type_lower.contains("image/svg+xml")
}

/// Parse XML string into JsDocument
fn parse_xml(input: &str) -> Result<JsDocument, String> {
    let mut reader = Reader::from_str(input);
    reader.trim_text(true);
    
    let mut root = JsNode::new_element("#document".to_string(), vec![], vec![]);
    let mut stack: Vec<usize> = Vec::new(); // Stack of indices in root.children
    let mut current_index: usize = 0;
    
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().into_inner()).to_string();
                let attributes: Vec<(String, String)> = e.attributes()
                    .map(|attr| {
                        let attr = attr.unwrap();
                        let key = String::from_utf8_lossy(attr.key.into_inner()).to_string();
                        let value = String::from_utf8_lossy(&attr.value).to_string();
                        (key, value)
                    })
                    .collect();
                
                let node = JsNode::new_element(name, attributes, vec![]);
                
                // Find the current parent in root.children
                if let Some(current) = root.children.get_mut(current_index) {
                    current.children.push(node);
                    // Push current index and update to new child
                    stack.push(current_index);
                    current_index = current.children.len() - 1;
                } else {
                    // Shouldn't happen, but add to root if no parent
                    root.children.push(node);
                    stack.push(current_index);
                    current_index = root.children.len() - 1;
                }
            }
            Ok(Event::End(_)) => {
                // Pop from stack to go back to parent
                if let Some(parent_index) = stack.pop() {
                    current_index = parent_index;
                }
            }
            Ok(Event::Text(ref e)) => {
                let text = e.unescape().unwrap_or_default();
                if !text.trim().is_empty() {
                    let text_node = JsNode::new_text(&text);
                    if let Some(current) = root.children.get_mut(current_index) {
                        current.children.push(text_node);
                    } else {
                        root.children.push(text_node);
                    }
                }
            }
            Ok(Event::Comment(ref e)) => {
                let text = e.unescape().unwrap_or_default();
                let comment_node = JsNode::new_comment(&text);
                if let Some(current) = root.children.get_mut(current_index) {
                    current.children.push(comment_node);
                } else {
                    root.children.push(comment_node);
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }
    
    // Find document element (first element child)
    let document_element = root.children.iter()
        .find(|n| n.node_type == "ELEMENT_NODE")
        .cloned();
    
    Ok(JsDocument::new(root, document_element))
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
    /// @param content_type - The content type (e.g., "text/html", "text/xml", "application/xml")
    /// @returns A Document object serialized as JSON, or throws an error
    #[wasm_bindgen]
    pub fn parse_from_string(&self, string: &str, content_type: &str) -> JsValue {
        // Determine content type
        if is_html_content_type(content_type) {
            // Parse as HTML using html5ever
            match parse_document(RcDom::default(), Default::default())
                .from_utf8()
                .read_from(&mut string.as_bytes()) {
                Ok(dom) => {
                    let document = JsDocument::from_rcdom(dom);
                    let serializer: Serializer = Serializer::new()
                        .serialize_maps_as_objects(true)
                        .serialize_missing_as_null(true);
                    document.serialize(&serializer).unwrap()
                }
                Err(e) => JsValue::from_str(&format!("HTML parse error: {}", e)),
            }
        } else if is_xml_content_type(content_type) {
            // Parse as XML using quick-xml
            match parse_xml(string) {
                Ok(document) => {
                    let serializer: Serializer = Serializer::new()
                        .serialize_maps_as_objects(true)
                        .serialize_missing_as_null(true);
                    document.serialize(&serializer).unwrap()
                }
                Err(e) => JsValue::from_str(&e),
            }
        } else {
            // Default to HTML parsing for unknown content types
            match parse_document(RcDom::default(), Default::default())
                .from_utf8()
                .read_from(&mut string.as_bytes()) {
                Ok(dom) => {
                    let document = JsDocument::from_rcdom(dom);
                    let serializer: Serializer = Serializer::new()
                        .serialize_maps_as_objects(true)
                        .serialize_missing_as_null(true);
                    document.serialize(&serializer).unwrap()
                }
                Err(e) => JsValue::from_str(&format!("Parse error: {}", e)),
            }
        }
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
