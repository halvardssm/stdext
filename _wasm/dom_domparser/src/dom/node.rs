//! DOM Node implementation

use serde::{Serialize, Deserialize};

/// Node type constants
pub const ELEMENT_NODE: u16 = 1;
pub const ATTRIBUTE_NODE: u16 = 2;
pub const TEXT_NODE: u16 = 3;
pub const CDATA_SECTION_NODE: u16 = 4;
pub const ENTITY_REFERENCE_NODE: u16 = 5;
pub const ENTITY_NODE: u16 = 6;
pub const PROCESSING_INSTRUCTION_NODE: u16 = 7;
pub const COMMENT_NODE: u16 = 8;
pub const DOCUMENT_NODE: u16 = 9;
pub const DOCUMENT_TYPE_NODE: u16 = 10;
pub const DOCUMENT_FRAGMENT_NODE: u16 = 11;
pub const NOTATION_NODE: u16 = 12;

/// A DOM Node in our tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomNode {
    pub node_type: u16,
    pub node_name: String,
    pub node_value: Option<String>,
    pub attributes: Vec<(String, String)>,
    pub children: Vec<DomNode>,
}

impl DomNode {
    /// Creates a new DOM node
    pub fn new(node_type: u16, node_name: String, node_value: Option<String>) -> Self {
        DomNode {
            node_type,
            node_name,
            node_value,
            attributes: vec![],
            children: vec![],
        }
    }

    /// Creates a new element node
    pub fn element(name: String) -> Self {
        DomNode::new(ELEMENT_NODE, name, None)
    }

    /// Creates a new text node
    pub fn text(content: String) -> Self {
        DomNode::new(TEXT_NODE, "#text".to_string(), Some(content))
    }

    /// Creates a new comment node
    pub fn comment(content: String) -> Self {
        DomNode::new(COMMENT_NODE, "#comment".to_string(), Some(content))
    }

    /// Creates a new document node
    pub fn document() -> Self {
        DomNode::new(DOCUMENT_NODE, "#document".to_string(), None)
    }

    /// Creates a new document type node
    pub fn document_type() -> Self {
        DomNode::new(DOCUMENT_TYPE_NODE, "#doctype".to_string(), None)
    }

    /// Creates a new document fragment node
    pub fn document_fragment() -> Self {
        DomNode::new(DOCUMENT_FRAGMENT_NODE, "#document-fragment".to_string(), None)
    }
}
