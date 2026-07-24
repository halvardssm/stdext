//! HTML parser implementation using html5ever

use html5ever::parse_document;
use html5ever::tendril::TendrilSink;
use markup5ever_rcdom::{RcDom, Handle, NodeData};
use crate::dom::{DomDocument, DomNode, serialize_node};
use wasm_bindgen::prelude::*;

/// Converts an RcDom node to our DomNode structure
fn convert_rcdom_node(node: &Handle) -> DomNode {
    match &node.data {
        NodeData::Element { name, attrs, .. } => {
            let children: Vec<DomNode> = node.children.borrow().iter()
                .map(|child| convert_rcdom_node(child))
                .collect();
            
            let attrs: Vec<(String, String)> = attrs.borrow().iter()
                .map(|attr| (attr.name.local.to_string(), attr.value.to_string()))
                .collect();
            
            DomNode {
                node_type: super::super::dom::node::ELEMENT_NODE,
                node_name: name.local.to_string(),
                node_value: None,
                attributes: attrs,
                children,
            }
        }
        NodeData::Text { contents } => {
            DomNode {
                node_type: super::super::dom::node::TEXT_NODE,
                node_name: "#text".to_string(),
                node_value: Some(contents.borrow().to_string()),
                attributes: vec![],
                children: vec![],
            }
        }
        NodeData::Comment { contents } => {
            DomNode {
                node_type: super::super::dom::node::COMMENT_NODE,
                node_name: "#comment".to_string(),
                node_value: Some(contents.to_string()),
                attributes: vec![],
                children: vec![],
            }
        }
        NodeData::Document => {
            let children: Vec<DomNode> = node.children.borrow().iter()
                .map(|child| convert_rcdom_node(child))
                .collect();
            
            DomNode {
                node_type: super::super::dom::node::DOCUMENT_NODE,
                node_name: "#document".to_string(),
                node_value: None,
                attributes: vec![],
                children,
            }
        }
        NodeData::Doctype { .. } => {
            DomNode {
                node_type: super::super::dom::node::DOCUMENT_TYPE_NODE,
                node_name: "#doctype".to_string(),
                node_value: None,
                attributes: vec![],
                children: vec![],
            }
        }
        _ => {
            DomNode {
                node_type: 0,
                node_name: "#unknown".to_string(),
                node_value: None,
                attributes: vec![],
                children: vec![],
            }
        }
    }
}

/// Converts an RcDom to our DomDocument structure
fn convert_rcdom_to_dom(dom: RcDom) -> DomDocument {
    let root = convert_rcdom_node(&dom.document);
    DomDocument::from_node(root)
}

/// Parses HTML string into a DOM document
pub fn parse(input: &str) -> JsValue {
    match parse_document(RcDom::default(), Default::default())
        .from_utf8()
        .read_from(&mut input.as_bytes()) {
        Ok(dom) => {
            let document = convert_rcdom_to_dom(dom);
            serialize_node(&document.node)
        }
        Err(e) => JsValue::from_str(&format!("HTML parse error: {}", e)),
    }
}
