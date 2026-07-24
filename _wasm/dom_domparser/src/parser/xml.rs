//! XML parser implementation using quick-xml

use quick_xml::events::Event;
use quick_xml::Reader;
use crate::dom::{DomNode, serialize_node};
use wasm_bindgen::prelude::*;

/// Parses XML string into a DOM document
pub fn parse(input: &str) -> JsValue {
    let mut reader = Reader::from_str(input);
    reader.trim_text(true);
    
    let mut root = DomNode::document();
    let mut stack: Vec<usize> = Vec::new();
    let mut current_index: usize = 0;
    
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().into_inner()).into_owned();
                let mut attributes: Vec<(String, String)> = Vec::new();
                
                for attr in e.attributes() {
                    let attr = attr.unwrap();
                    let key = String::from_utf8_lossy(attr.key.into_inner()).into_owned();
                    let value = String::from_utf8_lossy(&attr.value).into_owned();
                    attributes.push((key, value));
                }
                
                let node = DomNode::element(name);
                
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
                    let text_node = DomNode::text(text.into_owned());
                    if let Some(current) = root.children.get_mut(current_index) {
                        current.children.push(text_node);
                    } else {
                        root.children.push(text_node);
                    }
                }
            }
            Ok(Event::Comment(ref e)) => {
                let text = e.unescape().unwrap_or_default();
                let comment_node = DomNode::comment(text.into_owned());
                if let Some(current) = root.children.get_mut(current_index) {
                    current.children.push(comment_node);
                } else {
                    root.children.push(comment_node);
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return JsValue::from_str(&format!("XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }
    
    serialize_node(&root)
}
