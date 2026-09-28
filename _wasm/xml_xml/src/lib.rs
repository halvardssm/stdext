// _wasm/xml/src/lib.rs
//
// @stdext/xml — wasm bindings for the `uppsala` crate.
//
// Drop-in compatibility with @std/xml (https://jsr.io/@std/xml):
//
//   parse(xml, options?)     → plain `XmlDocument` tree object, identical shape:
//                              { declaration?: XmlDeclaration, root: XmlElement }
//                              - XmlName:        { raw, local, prefix?, uri? }
//                              - attributes:     Record<string, string> keyed by
//                                                raw attribute name (incl. prefixes)
//                              - children union: "element" | "text" | "cdata" | "comment"
//                                                (no PI node — std's tree omits PIs too)
//
//   stringify(doc, options?) → string, std's `StringifyOptions` semantics:
//                              { indent?: string, declaration?: boolean }
//                              declaration defaults to true and only applies when
//                              the input document has a declaration.
//
//   validate(doc, schema)    → { value: XmlDocument, issues: { message: string }[] }
//                              both arguments accept either an XML string or the
//                              plain document/schema object.
//
// Options parity (parse):
//   ignoreWhitespace  — supported (filtered during tree conversion)
//   ignoreComments    — supported (filtered during tree conversion)
//   disallowDoctype   — supported via uppsala's `with_forbid_dtd`; default true,
//                       same as @std/xml. NOTE: when set to false, uppsala parses
//                       the DTD internal subset (subject to its entity-expansion
//                       caps), whereas @std/xml ignores DTD content entirely.
//   maxDepth          — supported via `with_max_depth`
//   trackPosition     — ignored; parse errors always carry line/column
//   maxAttributes     — NOT supported by uppsala; option is accepted and ignored
//   xmlVersion        — NOT supported (XML 1.0 only); option is accepted and ignored
//
// Errors:
//   Malformed input throws a JsError whose message is formatted like @std/xml's
//   XmlSyntaxError ("message at line L, column C"). The TS wrapper should catch
//   and re-throw as a real `XmlSyntaxError` subclass (wasm cannot construct JS
//   classes directly).
//
// Memory:
//   All DOMs are built, used, and dropped within a single call. Nothing is
//   leaked: `parse` returns a plain JS object, not a borrowed handle.
//
// Required crate deps (already in the stdext workspace):
//   wasm-bindgen, serde, serde-wasm-bindgen, uppsala = "0.10"
//
// VERIFY against uppsala docs after first build (see xml.d.mts):
//   - Document::node_kind(id) -> NodeKind<'_> — accessor name and shape
//   - QName fields `local` (Cow<str>) and `prefix` (Option<Cow<str>>)
//   - Document::declaration() -> Option<&XmlDeclaration { version, encoding,
//     standalone: bool }>
//   - ValidationError implements Display

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uppsala::dom::{Document, NodeId, NodeKind, QName};
use uppsala::error::XmlError;
use uppsala::namespace::NamespaceResolver;
use uppsala::{parse as parse_uppsala, Parser, XsdValidator};
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// @std/xml-compatible types
// ---------------------------------------------------------------------------

/// `XmlName` — raw qualified name, split local part, optional prefix and
/// resolved namespace URI. Mirrors @std/xml, including its quirk that the
/// default namespace is NOT applied to element names (uri is only set for
/// prefixed names).
#[derive(Serialize, Deserialize, Clone)]
struct StdXmlName {
  raw: String,
  local: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  prefix: Option<String>,
  #[serde(rename = "uri", default, skip_serializing_if = "Option::is_none")]
  namespace_uri: Option<String>,
}

/// `XmlNode` — discriminated by `type`. No PI variant, matching @std/xml.
#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
enum StdXmlNode {
  #[serde(rename = "element")]
  Element {
    name: StdXmlName,
    /// Keyed by raw qualified attribute name as written in the document
    /// (e.g. "id", "xlink:href"). BTreeMap means JS object key order is
    /// sorted, not document order — @std/xml uses a plain Record, which is
    /// unordered anyway.
    attributes: BTreeMap<String, String>,
    children: Vec<StdXmlNode>,
  },
  #[serde(rename = "text")]
  Text { text: String },
  #[serde(rename = "cdata")]
  CData { text: String },
  #[serde(rename = "comment")]
  Comment { text: String },
}

/// `XmlDeclaration` — @std/xml's declaration extends XmlPosition, so it
/// carries line/column/offset. uppsala does not expose declaration position,
/// so -1 is used (per the agreed convention for "position unavailable").
#[derive(Serialize, Deserialize, Clone)]
struct StdXmlDeclaration {
  version: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  encoding: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  standalone: Option<String>,
  #[serde(default)]
  line: i64,
  #[serde(default)]
  column: i64,
  #[serde(default)]
  offset: i64,
}

/// `XmlDocument` — the plain tree returned by parse.
#[derive(Serialize, Deserialize, Clone)]
struct StdXmlDocument {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  declaration: Option<StdXmlDeclaration>,
  root: StdXmlNode,
}

/// Result of validate(): the document as a std tree plus validation issues.
#[derive(Serialize)]
struct ValidateResult {
  value: StdXmlDocument,
  issues: Vec<ValidateIssue>,
}

#[derive(Serialize)]
struct ValidateIssue {
  message: String,
}

// ---------------------------------------------------------------------------
// parse / stringify options
// ---------------------------------------------------------------------------

/// @std/xml's `ParseOptions`, camelCased on the JS side. Unsupported options
/// (maxAttributes, xmlVersion) are accepted and ignored.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct ParseOptions {
  ignore_whitespace: bool,
  ignore_comments: bool,
  /// @default {true} — handled via Option + unwrap_or, same as @std/xml.
  disallow_doctype: Option<bool>,
  max_depth: Option<u32>,
}

/// @std/xml's `StringifyOptions`.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct StringifyOptions {
  indent: Option<String>,
  /// @default {true} — only applies when the input has a declaration.
  declaration: Option<bool>,
}

// ---------------------------------------------------------------------------
// Rust-side conversion helpers
// ---------------------------------------------------------------------------

/// Split a QName into std's XmlName shape.
fn std_qname(name: &QName<'_>, resolver: &NamespaceResolver<'_>) -> StdXmlName {
  StdXmlName {
    raw: name.to_string(),
    local: name.local_name.to_string(),
    prefix: name.prefix.as_ref().map(|p| p.to_string()),
    // @std/xml: only prefixed names get a URI (default namespace does not
    // apply to element names in this implementation).
    namespace_uri: name
      .prefix
      .as_ref()
      .and_then(|p| resolver.resolve(p).map(|uri| uri.to_string())),
  }
}

/// Convert an arena node (and its subtree) into a std node.
/// Returns None for PIs and the synthetic Document node.
/// The resolver is advanced scope-by-scope so prefixes resolve with correct
/// scoping (inner declarations shadow outer ones, per Namespaces in XML).
fn node_to_std<'a>(
  doc: &Document<'a>,
  id: NodeId,
  resolver: &mut NamespaceResolver<'a>,
  opts: &ParseOptions,
) -> Option<StdXmlNode> {
  match doc.node_kind(id) {
    Some(NodeKind::Element(el)) => {
      resolver.push_scope();
      for (prefix, uri) in &el.namespace_declarations {
        resolver.declare(prefix.clone(), uri.clone());
      }
      let out = StdXmlNode::Element {
        name: std_qname(&el.name, resolver),
        attributes: el
          .attributes
          .iter()
          .map(|a| (a.name.to_string(), a.value.to_string()))
          .collect(),
        children: doc
          .children(id)
          .iter()
          .filter_map(|c| node_to_std(doc, c.clone(), resolver, opts))
          .collect(),
      };
      resolver.pop_scope();
      Some(out)
    }
    Some(NodeKind::Text(t)) => {
      if opts.ignore_whitespace && t.trim().is_empty() {
        return None; // drop whitespace-only text nodes
      }
      Some(StdXmlNode::Text { text: t.to_string() })
    }
    Some(NodeKind::CData(t)) => Some(StdXmlNode::CData { text: t.to_string() }),
    Some(NodeKind::Comment(t)) => {
      if opts.ignore_comments {
        return None;
      }
      Some(StdXmlNode::Comment { text: t.to_string() })
    }
    // PIs: dropped — @std/xml's DOM tree has no PI node.
    _ => None,
  }
}

/// Convert a whole parsed document into the std tree.
fn document_to_std(
  doc: &Document<'_>,
  opts: &ParseOptions,
) -> Result<StdXmlDocument, JsError> {
  let root_id = doc
    .document_element()
    .ok_or_else(|| JsError::new("document has no root element"))?;
  let declaration = doc.xml_declaration.clone().map(|d| StdXmlDeclaration {
    version: d.version.to_string(),
    encoding: d.encoding.map_or(None, |e| Some(e.to_string())),
    standalone: d
      .standalone
      .map(|b| if b { "yes".into() } else { "no".into() }),
    line: -1, // position unavailable from uppsala
    column: -1,
    offset: -1,
  });
  let mut resolver = NamespaceResolver::new();
  let root = node_to_std(doc, root_id, &mut resolver, opts)
    .ok_or_else(|| JsError::new("document element is not an element"))?;
  Ok(StdXmlDocument { declaration, root })
}

/// Serialize an uppsala error as a JsError with @std/xml's XmlSyntaxError
/// message style, carrying line/column when the underlying error has them.
fn to_js_error(e: XmlError) -> JsError {
  match &e {
    XmlError::Parse(p) => JsError::new(&format!(
      "{} at line {}, column {}",
      p.message, p.line, p.column
    )),
    _ => JsError::new(&e.to_string()),
  }
}

/// Parse XML text with std's option semantics applied to the parser.
fn parse_with_options<'a>(input: &'a str, opts: &ParseOptions) -> Result<Document<'a>, JsError> {
  let mut parser = Parser::new();
  if let Some(max_depth) = opts.max_depth {
    parser = parser.with_max_depth(max_depth);
  }
  // @std/xml rejects DOCTYPE by default (disallowDoctype: true).
  if opts.disallow_doctype.unwrap_or(true) {
    parser = parser.with_forbid_dtd(true);
  }
  parser.parse(input).map_err(to_js_error)
}

// ---------------------------------------------------------------------------
// std tree → XML text (used by stringify, and to normalize object inputs
// in validate)
// ---------------------------------------------------------------------------

fn escape_text(s: &str) -> String {
  s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

fn escape_attr(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
}

fn write_node(node: &StdXmlNode, out: &mut String, indent: Option<&str>, depth: usize) {
  let pad = |out: &mut String, depth: usize| {
    if let Some(ind) = indent {
      out.push('\n');
      out.push_str(&ind.repeat(depth));
    }
  };
  match node {
    StdXmlNode::Element { name, attributes, children } => {
      pad(out, depth);
      out.push('<');
      out.push_str(&name.raw);
      for (k, v) in attributes {
        out.push(' ');
        out.push_str(k);
        out.push_str("=\"");
        out.push_str(&escape_attr(v));
        out.push('"');
      }
      if children.is_empty() {
        out.push_str("/>");
        return;
      }
      out.push('>');
      let only_text = children
        .iter()
        .all(|c| matches!(c, StdXmlNode::Text { .. }));
      for child in children {
        match child {
          // inline text keeps single-line elements readable when pretty-printing
          StdXmlNode::Text { text } if indent.is_some() && only_text => {
            out.push_str(&escape_text(text))
          }
          _ => write_node(child, out, indent, depth + 1),
        }
      }
      if !(only_text && indent.is_some()) {
        pad(out, depth);
      }
      out.push_str("</");
      out.push_str(&name.raw);
      out.push('>');
    }
    StdXmlNode::Text { text } => {
      pad(out, depth);
      out.push_str(&escape_text(text));
    }
    StdXmlNode::CData { text } => {
      pad(out, depth);
      out.push_str("<![CDATA[");
      out.push_str(text);
      out.push_str("]]>");
    }
    StdXmlNode::Comment { text } => {
      pad(out, depth);
      out.push_str("<!--");
      out.push_str(text);
      out.push_str("-->");
    }
  }
}

/// Render a std document tree to XML text.
/// `include_declaration` follows @std/xml's rule: the declaration is emitted
/// only when the document has one and the caller did not disable it.
fn std_document_to_xml(doc: &StdXmlDocument, opts: &StringifyOptions) -> String {
  let mut out = String::new();
  if let Some(decl) = &doc.declaration {
    if opts.declaration.unwrap_or(true) {
      out.push_str("<?xml version=\"");
      out.push_str(&decl.version);
      out.push('"');
      if let Some(enc) = &decl.encoding {
        out.push_str(" encoding=\"");
        out.push_str(enc);
        out.push('"');
      }
      if let Some(sa) = &decl.standalone {
        out.push_str(" standalone=\"");
        out.push_str(sa);
        out.push('"');
      }
      out.push_str("?>");
    }
  }
  write_node(&doc.root, &mut out, opts.indent.as_deref(), 0);
  out
}

/// Accept either an XML string or a std document object; return XML text.
/// (Used by validate, whose arguments may be either form.)
fn normalize_to_xml(value: JsValue) -> Result<String, JsError> {
  if let Ok(s) = serde_wasm_bindgen::from_value::<String>(value.clone()) {
    return Ok(s);
  }
  let doc: StdXmlDocument = serde_wasm_bindgen::from_value(value)
    .map_err(|e| JsError::new(&format!("expected an XML string or XmlDocument object: {e}")))?;
  Ok(std_document_to_xml(
    &doc,
    &StringifyOptions { indent: None, declaration: Some(true) },
  ))
}

/// The JS-facing serializer config used by `parse` and `validate`
/// (serde-wasm-bindgen needs maps serialized as plain objects for
/// `Record<string, string>`).
fn js_serializer() -> serde_wasm_bindgen::Serializer {
  serde_wasm_bindgen::Serializer::new()
    .serialize_maps_as_objects(true)
    .serialize_missing_as_null(false)
}

// ---------------------------------------------------------------------------
// Public wasm API
// ---------------------------------------------------------------------------

/// Parse an XML string into a plain document tree, identical in shape to
/// @std/xml's `parse` output.
///
/// Options follow @std/xml's `ParseOptions` (camelCase): `ignoreWhitespace`,
/// `ignoreComments`, `disallowDoctype` (default true), `maxDepth`.
/// `trackPosition`, `maxAttributes` and `xmlVersion` are accepted but ignored
/// (see the crate-level notes above).
///
/// @example
/// ```ts
/// const doc = parse('<root id="1"><child/></root>');
/// doc.root.name.local;          // "root"
/// doc.root.attributes["id"];    // "1"
/// ```
///
/// @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
/// is not well-formed.
#[wasm_bindgen(js_name = "parse")]
pub fn parse(input: String, options: Option<JsValue>) -> Result<JsValue, JsError> {
  let opts: ParseOptions = match options {
    Some(v) => serde_wasm_bindgen::from_value(v).unwrap_or_default(),
    None => ParseOptions::default(),
  };
  let doc = parse_with_options(&input, &opts)?;
  let std_doc = document_to_std(&doc, &opts)?;
  std_doc
    .serialize(&js_serializer())
    .map_err(|e| JsError::new(&e.to_string()))
}

/// Serialize a document tree back to an XML string, with @std/xml's
/// `StringifyOptions` semantics (`indent` for pretty-printing, `declaration`
/// defaulting to true when the document has one).
///
/// @example
/// ```ts
/// stringify(doc);                         // declaration kept if present
/// stringify(doc, { indent: "  " });        // pretty-printed
/// stringify(doc, { declaration: false }); // never emit <?xml ...?>
/// ```
///
/// @throws {Error} if the input is not a valid XmlDocument object.
#[wasm_bindgen(js_name = "stringify")]
pub fn stringify(doc: JsValue, options: Option<JsValue>) -> Result<String, JsError> {
  let std_doc: StdXmlDocument = serde_wasm_bindgen::from_value(doc)
    .map_err(|e| JsError::new(&format!("invalid XmlDocument object: {e}")))?;
  let opts: StringifyOptions = match options {
    Some(v) => serde_wasm_bindgen::from_value(v).unwrap_or_default(),
    None => StringifyOptions::default(),
  };
  Ok(std_document_to_xml(&std_doc, &opts))
}

/// Validate a document against an XSD schema.
///
/// Both `document` and `schema` accept either an XML string or the plain
/// document/schema object (the same shape `parse` produces).
///
/// Returns `{ value: XmlDocument, issues: { message: string }[] }`:
///   - `value` is the document as a plain @std/xml-compatible tree
///     (round-tripped through the validator)
///   - `issues` is empty when the document conforms to the schema
///
/// Note: a schema that is not well-formed or is an invalid XSD *throws*
/// (that is a schema-authoring error, not a document issue) — consistent with
/// the layering where schema compilation errors are distinct from instance
/// validation errors.
///
/// @example
/// ```ts
/// const result = validate("<age>25</age>", xsdString);
/// result.issues.length;          // 0
/// result.value.root.name.local;   // "age"
/// ```
#[wasm_bindgen(js_name = "validate")]
pub fn validate(document: JsValue, schema: JsValue) -> Result<JsValue, JsError> {
  // Normalize both arguments to XML text.
  let doc_xml = normalize_to_xml(document)?;
  let schema_xml = normalize_to_xml(schema)?;

  // Parse and compile the schema. Compilation failure throws — see doc note.
  let schema_doc = parse_uppsala(&schema_xml).map_err(to_js_error)?;
  let validator = XsdValidator::from_schema(&schema_doc)
    .map_err(|e| JsError::new(&format!("invalid schema: {e}")))?;

  // Parse the document (full parse: no ignoreWhitespace/ignoreComments
  // filtering — validation must see the real document) and validate.
  let doc = parse_uppsala(&doc_xml).map_err(to_js_error)?;
  let issues: Vec<ValidateIssue> = validator
    .validate(&doc)
    .iter()
    .map(|e| ValidateIssue { message: e.to_string() })
    .collect();

  // Return the document as a std tree alongside the issues.
  let value = document_to_std(&doc, &ParseOptions::default())?;
  ValidateResult { value, issues }
    .serialize(&js_serializer())
    .map_err(|e| JsError::new(&e.to_string()))
}