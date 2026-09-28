use uppsala::{parse as parse_xml, Document, XsdValidator};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const IXML_TYPES: &'static str = r#"
/** A single XSD validation error */
export interface XmlValidationError {
  message: string;
}
/** Result of validating a document against an XSD schema */
export interface XmlValidationResult {
  valid: boolean;
  errors: XmlValidationError[];
}
"#;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "XmlValidationResult")]
  pub type XmlValidationResult;
}

#[derive(Serialize, Deserialize, Debug)]
pub struct XmlValidationError {
  pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct XmlValidationResultRaw {
  pub valid: bool,
  pub errors: Vec<XmlValidationError>,
}

/// A parsed, well-formed XML document.
///
/// @example
/// ```ts
/// const doc = parse("<note><to>Alice</to></note>");
/// doc.stringify();
/// const result = doc.validate(xsd);
/// ```
#[wasm_bindgen]
pub struct XmlDocument {
  doc: Document<'static>,
}

/// Parse an XML string. Fails if the input is not well-formed.
#[wasm_bindgen(js_name = "parse")]
pub fn parse(input: String) -> Result<XmlDocument, JsError> {
  // Leak the input: uppsala's DOM borrows from the source string.
  // Standard wasm-bindgen workaround for arena lifetimes; the DOM is
  // freed when the XmlDocument is dropped, the source lives as long
  // as the module instance (acceptable for a per-parse workload).
  let input: &'static str = Box::leak(input.into_boxed_str());
  let doc = parse_xml(input).map_err(|e| JsError::new(&e.to_string()))?;
  Ok(XmlDocument { doc })
}

#[wasm_bindgen]
impl XmlDocument {
  /// Serialize the document back to an XML string.
  #[wasm_bindgen(js_name = "stringify")]
  pub fn stringify(&self) -> String {
    self.doc.to_xml()
  }

  /// Validate this document against an XSD schema string.
  ///
  /// Fails (throws) if the schema itself cannot be parsed or compiled;
  /// returns `{ valid: false, errors: [...] }` for instance errors.
  #[wasm_bindgen(js_name = "validate")]
  pub fn validate(&self, xsd: String) -> Result<XmlValidationResultRaw, JsError> {
    let xsd: &'static str = Box::leak(xsd.into_boxed_str());
    let schema_doc = parse_xml(xsd)
      .map_err(|e| JsError::new(&format!("schema not well-formed: {e}")))?;
    let validator = XsdValidator::from_schema(&schema_doc)
      .map_err(|e| JsError::new(&format!("invalid schema: {e}")))?;
    let errors: Vec<XmlValidationError> = validator
      .validate(&self.doc)
      .iter()
      .map(|e| XmlValidationError{message:e.to_string()})
      .collect();
    let valid = errors.is_empty();
    Ok(XmlValidationResultRaw{valid, errors})
  }
}