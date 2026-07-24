//! DOM node types and structures

pub mod node;
pub mod document;
pub mod serialization;

pub use node::DomNode;
pub use document::DomDocument;
pub use serialization::serialize_node;
