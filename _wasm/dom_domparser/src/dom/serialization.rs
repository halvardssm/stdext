//! Serialization utilities for DOM nodes

use super::node::DomNode;
use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

/// Serializes a DOM node to JsValue
pub fn serialize_node(node: &DomNode) -> JsValue {
    let serializer: Serializer = Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_missing_as_null(true);
    
    node.serialize(&serializer).unwrap()
}
