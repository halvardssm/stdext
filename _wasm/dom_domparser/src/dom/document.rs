//! DOM Document implementation

use super::node::DomNode;
use serde::{Serialize, Deserialize};

/// A DOM Document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomDocument {
    pub node: DomNode,
}

impl DomDocument {
    /// Creates a new empty document
    pub fn new() -> Self {
        let doc_node = DomNode::document();
        DomDocument { node: doc_node }
    }

    /// Creates a document from a node
    pub fn from_node(node: DomNode) -> Self {
        DomDocument { node }
    }
}
