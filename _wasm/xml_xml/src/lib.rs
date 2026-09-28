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
//                                                raw attribute name (incl. xmlns
//                                                declarations), document order
//                                                preserved via IndexMap
//                              - children union: "element" | "text" | "cdata" | "comment"
//                                                (no PI node — std's tree omits PIs too)
//
//   stringify(doc, options?) → string, std's `StringifyOptions` semantics:
//                              { indent?: string, declaration?: boolean }
//                              declaration defaults to true and only applies when
//                              the input document has a declaration. Attribute
//                              order follows the input object's key order (JS
//                              objects preserve string-key insertion order).
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
//   maxDepth          — enforced with std's semantics (root element = depth 1)
//                       by our own walk, because uppsala counts depth from 0.
//                       Also passed to uppsala as a parser backstop.
//   trackPosition     — supported for the declaration's position (std's
//                       default is true); parse errors always carry
//                       line/column regardless of this option
//   maxAttributes     — NOT supported by uppsala; option is accepted and ignored
//   xmlVersion        — NOT supported (XML 1.0 only); option is accepted and ignored
//
// Errors:
//   Malformed input throws a JsError whose message is formatted like @std/xml's
//   XmlSyntaxError ("message at line L, column C") for error variants that
//   carry position (Parse, WellFormedness). Variants without position
//   (e.g. UnexpectedEof) fall back to a plain message — the TS wrapper maps
//   those to position 0, std's sentinel for "position unavailable".
//
// Memory:
//   All DOMs are built, used, and dropped within a single call. Nothing is
//   leaked: `parse` returns a plain JS object, not a borrowed handle.
//
// Required crate deps (stdext workspace):
//   wasm-bindgen, serde, serde-wasm-bindgen, uppsala = "0.10",
//   indexmap = { version = "2", features = ["serde"] }
//   (add to [workspace.dependencies] and this crate's [dependencies] with
//   `indexmap.workspace = true`)
//
// Implementation notes:
//   - NEVER use QName::to_string() for raw names/keys — it emits Clark
//     notation ({uri}local). Reconstruct raw names from prefix + local_name.
//   - The namespace URI is resolved by uppsala at parse time and stored in
//     QName::namespace_uri — no NamespaceResolver walk is needed (and std
//     only exposes uri for prefixed names, which is honored here).
//   - Attribute maps are IndexMap, not BTreeMap: std preserves document
//     order, and JS objects preserve insertion order for string keys, so
//     round-tripping keeps the original order.

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use uppsala::dom::{Document, NodeId, NodeKind, QName};
use uppsala::error::XmlError;
use uppsala::{parse as parse_uppsala, Parser, XsdValidator};
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// TypeScript type definitions (emitted verbatim into xml/_wasm/xml.d.mts)
//
// Only the types @std/xml does NOT provide are declared here. All shared
// types (XmlPosition, XmlName, XmlDeclaration, XmlTextNode, XmlCDataNode,
// XmlCommentNode, XmlElement, XmlNode, XmlDocument, ParseOptions,
// StringifyOptions) are imported from @std/xml by the JS wrapper — the JS
// package declares "@std/xml" in its import map (allowed by stdext's
// dependency policy: everything under @std).
// ---------------------------------------------------------------------------

#[wasm_bindgen(typescript_custom_section)]
const IXML_TYPES: &'static str = r#"
/** A single XSD validation issue. */
export interface XmlValidationIssue {
  readonly message: string;
}

/** Result of `validate`: the document tree plus any validation issues. */
export interface XmlValidationResult {
  readonly value: import("@std/xml").XmlDocument;
  readonly issues: ReadonlyArray<XmlValidationIssue>;
}
"#;

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
    /// (e.g. "id", "xlink:href", "xmlns", "xmlns:ns"). IndexMap preserves
    /// insertion order, so key order matches the document / input object.
    attributes: IndexMap<String, String>,
    children: Vec<StdXmlNode>,
  },
  #[serde(rename = "text")]
  Text { text: String },
  #[serde(rename = "cdata")]
  CData { text: String },
  #[serde(rename = "comment")]
  Comment { text: String },
}

/// `XmlDeclaration` — @std/xml's declaration carries a `type: "declaration"`
/// discriminant and extends XmlPosition, so line/column/offset are always
/// present. uppsala does not expose the declaration's position, but XML
/// requires the declaration to be the first thing in a document, so its
/// position is the offset of the first '<' in the input — computed with
/// @std/xml's exact rules (1-based line counting '\n' before the offset;
/// column = offset − last-newline offset, i.e. 1-based within the line;
/// offset in UTF-16 code units). With `trackPosition: false` @std/xml
/// reports (0, 0, 0) — its sentinel — and so do we.
#[derive(Serialize, Deserialize, Clone)]
struct StdXmlDeclaration {
  #[serde(rename = "type", default = "declaration_node_type")]
  node_type: String,
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

fn declaration_node_type() -> String {
  "declaration".to_string()
}

/// The declaration's position in @std/xml's terms (see StdXmlDeclaration).
fn declaration_position(input: &str, track_position: bool) -> (i64, i64, i64) {
  if !track_position {
    return (0, 0, 0);
  }
  let Some(lt) = input.find('<') else {
    return (0, 0, 0);
  };
  let mut line = 1i64;
  let mut last_nl_u16: i64 = -1;
  let mut u16_offset = 0i64;
  for ch in input.chars().take(lt) {
    if ch == '\n' {
      line += 1;
      last_nl_u16 = u16_offset;
    }
    u16_offset += ch.len_utf16() as i64;
  }
  (line, u16_offset - last_nl_u16, u16_offset)
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
  /// @default {true} — @std/xml tracks the declaration's position by
  /// default (only the declaration carries a position in the tree).
  track_position: Option<bool>,
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

/// Reconstruct the raw qualified name ("prefix:local" or "local") from a
/// QName. NEVER use QName::to_string() for this — it emits Clark notation
/// ({uri}local) for resolved names.
fn qname_raw(name: &QName<'_>) -> String {
  match &name.prefix {
    Some(p) => format!("{p}:{}", name.local_name),
    None => name.local_name.to_string(),
  }
}

/// Split a QName into std's XmlName shape. The URI comes straight from the
/// QName (uppsala resolves namespaces at parse time); @std/xml only sets uri
/// for prefixed names, so gate on prefix presence to match exactly.
fn std_qname(name: &QName<'_>) -> StdXmlName {
  StdXmlName {
    raw: qname_raw(name),
    local: name.local_name.to_string(),
    prefix: name.prefix.as_ref().map(|p| p.to_string()),
    namespace_uri: name
      .prefix
      .as_ref()
      .and_then(|_| name.namespace_uri.as_ref().map(|u| u.to_string())),
  }
}

/// Convert an arena node (and its subtree) into a std node.
/// Returns None for PIs, the synthetic Document node, and nodes filtered by
/// the options.
fn node_to_std(
  doc: &Document<'_>,
  id: NodeId,
  opts: &ParseOptions,
) -> Option<StdXmlNode> {
  match doc.node_kind(id) {
    Some(NodeKind::Element(el)) => {
      let mut attributes: IndexMap<String, String> = el
        .attributes
        .iter()
        .map(|a| (qname_raw(&a.name), a.value.to_string()))
        .collect();
      // @std/xml keeps namespace declarations as plain attributes keyed by
      // raw name ("xmlns", "xmlns:ns"); uppsala stores them separately.
      for (prefix, uri) in &el.namespace_declarations {
        let key = if prefix.is_empty() {
          "xmlns".to_string()
        } else {
          format!("xmlns:{prefix}")
        };
        attributes.insert(key, uri.to_string());
      }
      Some(StdXmlNode::Element {
        name: std_qname(&el.name),
        attributes,
        children: doc
          .children(id)
          .iter()
          .filter_map(|c| node_to_std(doc, *c, opts))
          .collect(),
      })
    }
    Some(NodeKind::Text(t)) => {
      if opts.ignore_whitespace && t.trim().is_empty() {
        return None; // drop whitespace-only text nodes
      }
      Some(StdXmlNode::Text {
        text: t.to_string(),
      })
    }
    Some(NodeKind::CData(t)) => Some(StdXmlNode::CData {
      text: t.to_string(),
    }),
    Some(NodeKind::Comment(t)) => {
      if opts.ignore_comments {
        return None;
      }
      Some(StdXmlNode::Comment {
        text: t.to_string(),
      })
    }
    // PIs: dropped — @std/xml's DOM tree has no PI node.
    _ => None,
  }
}

/// Convert a whole parsed document into the std tree. `input` is the original
/// XML text — needed for the declaration's position, which uppsala does not
/// expose (see `declaration_position`).
fn document_to_std(
  doc: &Document<'_>,
  opts: &ParseOptions,
  input: &str,
) -> Result<StdXmlDocument, JsError> {
  let root_id = doc
    .document_element()
    .ok_or_else(|| JsError::new("document has no root element"))?;
  let declaration = doc.xml_declaration.clone().map(|d| {
    let (line, column, offset) =
      declaration_position(input, opts.track_position.unwrap_or(true));
    StdXmlDeclaration {
      node_type: "declaration".to_string(),
      version: d.version.to_string(),
      encoding: d.encoding.map(|e| e.to_string()),
      standalone: d
        .standalone
        .map(|b| if b { "yes".into() } else { "no".into() }),
      line,
      column,
      offset,
    }
  });
  let root = node_to_std(doc, root_id, opts)
    .ok_or_else(|| JsError::new("document element is not an element"))?;
  Ok(StdXmlDocument { declaration, root })
}

/// Enforce @std/xml's maxDepth semantics: the root element is depth 1.
/// uppsala counts nesting depth from 0, so its own cap is off by one
/// relative to std — this walk is the authoritative check.
fn check_depth(
  doc: &Document<'_>,
  id: NodeId,
  depth: u32,
  max_depth: u32,
) -> Result<(), JsError> {
  if depth > max_depth {
    return Err(JsError::new(&format!(
      "maximum element nesting depth ({max_depth}) exceeded at depth {depth}"
    )));
  }
  for child in doc.children(id) {
    if matches!(doc.node_kind(child), Some(NodeKind::Element(_))) {
      check_depth(doc, child, depth + 1, max_depth)?;
    }
  }
  Ok(())
}

/// Serialize an uppsala error as a JsError with @std/xml's XmlSyntaxError
/// message style, carrying line/column when the underlying error has them.
fn to_js_error(e: XmlError) -> JsError {
  match &e {
    XmlError::Parse(p) => JsError::new(&format!(
      "{} at line {}, column {}",
      p.message, p.line, p.column
    )),
    XmlError::WellFormedness(w) => JsError::new(&format!(
      "{} at line {}, column {}",
      w.message, w.line, w.column
    )),
    _ => JsError::new(&e.to_string()),
  }
}

/// Parse XML text with std's option semantics applied to the parser.
fn parse_with_options<'a>(
  input: &'a str,
  opts: &ParseOptions,
) -> Result<Document<'a>, JsError> {
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
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

fn escape_attr(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
}

/// Serialize a CDATA section, splitting "]]>" the way @std/xml does
/// (XML 1.0 §2.7): "a]]>b" becomes two adjacent CDATA sections.
fn write_cdata(text: &str, out: &mut String) {
  out.push_str("<![CDATA[");
  out.push_str(&text.replace("]]>", "]]]]><![CDATA[>"));
  out.push_str("]]>");
}

/// @std/xml validates comment text on serialization (XML 1.0 §2.5) and
/// throws on "--" inside or a trailing "-"; mirror its error messages.
fn write_comment(text: &str, out: &mut String) -> Result<(), JsError> {
  if text.contains("--") {
    return Err(JsError::new(
      "Cannot serialize comment: XML forbids \"--\" within comments",
    ));
  }
  if text.ends_with('-') {
    return Err(JsError::new(
      "Cannot serialize comment: trailing \"-\" would produce invalid \"--->\"",
    ));
  }
  out.push_str("<!--");
  out.push_str(text);
  out.push_str("-->");
  Ok(())
}

/// Mirror of @std/xml's serializeElement/serializeNode:
///   - the indent prefix (indent repeated by `depth`) applies to elements
///     and comments only — text and cdata children get no prefix
///   - an element whose children are all text/cdata is serialized inline:
///     `<tag>content</tag>`, no newlines inside
///   - otherwise: a newline (when indenting) before every child, and the
///     closing tag is preceded by a newline + the element's own prefix
///   - without indent, no newlines are inserted anywhere
fn write_node(
  node: &StdXmlNode,
  out: &mut String,
  indent: Option<&str>,
  depth: usize,
) -> Result<(), JsError> {
  let newline = if indent.is_some() { "\n" } else { "" };
  match node {
    StdXmlNode::Element {
      name,
      attributes,
      children,
    } => {
      let prefix = indent.unwrap_or("").repeat(depth);
      out.push_str(&prefix);
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
        return Ok(());
      }
      out.push('>');
      let only_inline = children.iter().all(|c| {
        matches!(c, StdXmlNode::Text { .. } | StdXmlNode::CData { .. })
      });
      if only_inline {
        for child in children {
          match child {
            StdXmlNode::Text { text } => out.push_str(&escape_text(text)),
            StdXmlNode::CData { text } => write_cdata(text, out),
            _ => unreachable!("checked above"),
          }
        }
      } else {
        for child in children {
          out.push_str(newline);
          write_node(child, out, indent, depth + 1)?;
        }
        out.push_str(newline);
        out.push_str(&prefix);
      }
      out.push_str("</");
      out.push_str(&name.raw);
      out.push('>');
      Ok(())
    }
    StdXmlNode::Text { text } => {
      out.push_str(&escape_text(text));
      Ok(())
    }
    StdXmlNode::CData { text } => {
      write_cdata(text, out);
      Ok(())
    }
    StdXmlNode::Comment { text } => {
      out.push_str(&indent.unwrap_or("").repeat(depth));
      write_comment(text, out)
    }
  }
}

/// Render a std document tree to XML text.
/// The declaration is emitted only when the document has one and the caller
/// did not disable it (@std/xml's rule).
fn std_document_to_xml(
  doc: &StdXmlDocument,
  opts: &StringifyOptions,
) -> Result<String, JsError> {
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
      // @std/xml: a newline follows the declaration only when indenting.
      if opts.indent.is_some() {
        out.push('\n');
      }
    }
  }
  write_node(&doc.root, &mut out, opts.indent.as_deref(), 0)?;
  Ok(out)
}

/// Accept either an XML string or a std document object; return XML text.
/// (Used by validate, whose arguments may be either form.)
fn normalize_to_xml(value: JsValue) -> Result<String, JsError> {
  if let Ok(s) = serde_wasm_bindgen::from_value::<String>(value.clone()) {
    return Ok(s);
  }
  let doc: StdXmlDocument =
    serde_wasm_bindgen::from_value(value).map_err(|e| {
      JsError::new(&format!(
        "expected an XML string or XmlDocument object: {e}"
      ))
    })?;
  Ok(std_document_to_xml(
    &doc,
    &StringifyOptions {
      indent: None,
      declaration: Some(true),
    },
  )?)
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
/// `ignoreComments`, `disallowDoctype` (default true), `maxDepth` (root
/// element counts as depth 1, as in @std/xml), `trackPosition` (default
/// true — controls the declaration's position fields).
/// `maxAttributes` and `xmlVersion` are accepted but ignored (see the
/// crate-level notes above).
///
/// @example
/// ```ts
/// const doc = parse('<root id="1"><child/></root>');
/// doc.root.name.local;          // "root"
/// doc.root.attributes["id"];    // "1"
/// ```
///
/// @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
/// is not well-formed, or when maxDepth is exceeded.
#[wasm_bindgen(js_name = "parse")]
pub fn parse(
  input: String,
  options: Option<JsValue>,
) -> Result<JsValue, JsError> {
  let opts: ParseOptions = match options {
    Some(v) => serde_wasm_bindgen::from_value(v).unwrap_or_default(),
    None => ParseOptions::default(),
  };
  let doc = parse_with_options(&input, &opts)?;
  // std's maxDepth semantics (root = depth 1) — authoritative check; the
  // parser's own cap (root = depth 0) only acts as a backstop beyond this.
  if let Some(max_depth) = opts.max_depth {
    let root_id = doc
      .document_element()
      .ok_or_else(|| JsError::new("document has no root element"))?;
    check_depth(&doc, root_id, 1, max_depth)?;
  }
  let std_doc = document_to_std(&doc, &opts, &input)?;
  std_doc
    .serialize(&js_serializer())
    .map_err(|e| JsError::new(&e.to_string()))
}

/// Serialize a document tree back to an XML string, with @std/xml's
/// `StringifyOptions` semantics (`indent` for pretty-printing, `declaration`
/// defaulting to true when the document has one). Attributes are emitted in
/// the input object's key order, which for parse output is document order.
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
pub fn stringify(
  doc: JsValue,
  options: Option<JsValue>,
) -> Result<String, JsError> {
  let std_doc: StdXmlDocument = serde_wasm_bindgen::from_value(doc)
    .map_err(|e| JsError::new(&format!("invalid XmlDocument object: {e}")))?;
  let opts: StringifyOptions = match options {
    Some(v) => serde_wasm_bindgen::from_value(v).unwrap_or_default(),
    None => StringifyOptions::default(),
  };
  Ok(std_document_to_xml(&std_doc, &opts)?)
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
/// Error layering:
///   - a schema that is not well-formed XML *throws*
///   - an invalid XSD may *throw* (schema compilation error) — uppsala
///     compiles leniently, so some authoring mistakes surface as validation
///     issues on the document instead. Both behaviors are supported by the
///     TS wrapper's callers.
///   - a document that does not conform returns issues (does not throw)
///
/// @example
/// ```ts
/// const result = validate("<age>25</age>", xsdString);
/// result.issues.length;          // 0
/// result.value.root.name.local;   // "age"
/// ```
#[wasm_bindgen(js_name = "validate")]
pub fn validate(
  document: JsValue,
  schema: JsValue,
) -> Result<JsValue, JsError> {
  // Normalize both arguments to XML text.
  let doc_xml = normalize_to_xml(document)?;
  let schema_xml = normalize_to_xml(schema)?;

  // Parse and compile the schema. Compilation failure throws.
  let schema_doc = parse_uppsala(&schema_xml).map_err(to_js_error)?;
  let validator = XsdValidator::from_schema(&schema_doc)
    .map_err(|e| JsError::new(&format!("invalid schema: {e}")))?;

  // Parse the document (full parse: no ignoreWhitespace/ignoreComments
  // filtering — validation must see the real document) and validate.
  let doc = parse_uppsala(&doc_xml).map_err(to_js_error)?;
  let issues: Vec<ValidateIssue> = validator
    .validate(&doc)
    .iter()
    .map(|e| ValidateIssue {
      message: e.to_string(),
    })
    .collect();

  // Return the document as a std tree alongside the issues.
  let value = document_to_std(&doc, &ParseOptions::default(), &doc_xml)?;
  ValidateResult { value, issues }
    .serialize(&js_serializer())
    .map_err(|e| JsError::new(&e.to_string()))
}
