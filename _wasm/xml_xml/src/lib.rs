// _wasm/xml_xml/src/lib.rs
//
// @stdext/xml — wasm bindings for the `uppsala` crate, producing trees that
// are drop-in compatible with @std/xml (https://jsr.io/@std/xml).
//
// Values cross the wasm boundary as JSON strings: a single `JSON.parse` on
// the JS side is much cheaper than building the tree object-by-object
// through FFI calls. The JS wrapper (xml/mod.ts) owns the (de)serialization.
//
//   parse(xml, options)       → JSON `XmlDocument` ({ declaration?, root })
//   stringify(doc, options)   → XML text (std's StringifyOptions semantics)
//   checkTree(doc)            → throws unless the tree is well-formed XML
//   XmlSchema                 → compiled XSD; validates XML text or trees,
//                               returning a JSON Standard Schema result:
//                               `{ value }` or `{ issues }`
//
// Options parity (parse):
//   ignoreWhitespace, ignoreComments — filtered during tree conversion
//   disallowDoctype — uppsala's `with_forbid_dtd`; default true, as in std.
//                     When false, uppsala parses the DTD internal subset,
//                     whereas @std/xml ignores it.
//   maxDepth        — std semantics (root element = depth 1), checked during
//                     tree conversion; also passed to uppsala as a backstop.
//   trackPosition   — honored for the declaration's position (default true)
//   maxAttributes, xmlVersion — accepted and ignored
//
// Errors carry std's XmlSyntaxError message style ("… at line L, column C")
// when uppsala reports a position; the wrapper turns them into
// XmlSyntaxError instances.
//
// NEVER use QName::to_string() for raw names — it emits Clark notation
// ({uri}local). Raw names are rebuilt from prefix + local name.

use indexmap::IndexMap;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use uppsala::dom::{Document, NodeId, NodeKind, QName};
use uppsala::error::XmlError;
use uppsala::{Parser, XsdValidator};
use wasm_bindgen::prelude::*;

// Only types @std/xml does not provide are declared here; the wrapper
// imports every shared type from @std/xml.
#[wasm_bindgen(typescript_custom_section)]
const IXML_TYPES: &'static str = r#"
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { XmlDocument } from "@std/xml";

/**
 * StandardSchemaV1 compatible result
 *
 * Result of `validate`: the Standard Schema `Result` union shape.
 *   - success: `{ value: XmlDocument }` (`issues` is undefined — falsy)
 *   - failure: `{ issues: StandardSchemaV1.Issue[] }` (no `value`)
 */
export type XmlValidationResult = StandardSchemaV1.Result<XmlDocument>
"#;

// ---------------------------------------------------------------------------
// @std/xml-compatible types
// ---------------------------------------------------------------------------

/// `XmlName`. Like @std/xml, `uri` is only set for prefixed names (the
/// default namespace is not applied to element names).
#[derive(Serialize, Deserialize)]
struct StdXmlName {
  raw: String,
  local: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  prefix: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  uri: Option<String>,
}

/// `XmlNode` — no PI variant, matching @std/xml.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum StdXmlNode {
  Element {
    name: StdXmlName,
    /// Keyed by raw attribute name (incl. xmlns declarations); IndexMap
    /// keeps document / input-object order.
    attributes: IndexMap<String, String>,
    children: Vec<StdXmlNode>,
  },
  Text {
    text: String,
  },
  Cdata {
    text: String,
  },
  Comment {
    text: String,
  },
}

/// `XmlDeclaration` — carries `type: "declaration"` and std's position
/// fields (0/0/0 is std's "position unavailable" sentinel).
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename = "declaration")]
struct StdXmlDeclaration {
  version: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  encoding: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  standalone: Option<String>,
  #[serde(default)]
  line: usize,
  #[serde(default)]
  column: usize,
  #[serde(default)]
  offset: usize,
}

#[derive(Serialize, Deserialize)]
struct StdXmlDocument {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  declaration: Option<StdXmlDeclaration>,
  root: StdXmlNode,
}

/// Standard Schema result union: `{ value }` or `{ issues }`.
#[derive(Serialize)]
#[serde(untagged)]
enum ValidateResult {
  Success { value: StdXmlDocument },
  Failure { issues: Vec<ValidateIssue> },
}

#[derive(Serialize)]
struct ValidateIssue {
  message: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  path: Option<Vec<PathSegment>>,
}

/// Standard Schema path segment: element name or sibling index.
#[derive(Serialize)]
#[serde(untagged)]
enum PathSegment {
  Name(String),
  Index(usize),
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct ParseOptions {
  ignore_whitespace: bool,
  ignore_comments: bool,
  disallow_doctype: Option<bool>,
  max_depth: Option<u32>,
  track_position: Option<bool>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct StringifyOptions {
  indent: Option<String>,
  declaration: Option<bool>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn js_err(message: impl std::fmt::Display) -> JsError {
  JsError::new(&message.to_string())
}

/// Lenient options decoding: invalid options fall back to the defaults.
fn from_json_or_default<T: DeserializeOwned + Default>(json: &str) -> T {
  serde_json::from_str(json).unwrap_or_default()
}

fn tree_from_json(doc: &str) -> Result<StdXmlDocument, JsError> {
  serde_json::from_str(doc)
    .map_err(|e| js_err(format_args!("invalid XmlDocument object: {e}")))
}

/// JSON-encoded `XmlDocument` → XML text, declaration included.
fn tree_to_xml(doc: &str) -> Result<String, JsError> {
  std_document_to_xml(&tree_from_json(doc)?, &StringifyOptions::default())
}

fn to_json(value: &impl Serialize) -> Result<String, JsError> {
  serde_json::to_string(value).map_err(js_err)
}

/// Format an uppsala error in @std/xml's XmlSyntaxError message style.
fn to_js_error(e: XmlError) -> JsError {
  match &e {
    XmlError::Parse(p) => js_err(format_args!(
      "{} at line {}, column {}",
      p.message, p.line, p.column
    )),
    XmlError::WellFormedness(w) => js_err(format_args!(
      "{} at line {}, column {}",
      w.message, w.line, w.column
    )),
    _ => js_err(e),
  }
}

fn qname_raw(name: &QName<'_>) -> String {
  match &name.prefix {
    Some(p) => format!("{p}:{}", name.local_name),
    None => name.local_name.to_string(),
  }
}

// ---------------------------------------------------------------------------
// uppsala DOM → std tree
// ---------------------------------------------------------------------------

/// The declaration's position in @std/xml's terms. uppsala does not expose
/// it, but the declaration must come first, so it sits at the first '<'.
/// Line is 1-based, column is 1-based within the line, offset is in UTF-16
/// code units.
fn declaration_position(input: &str) -> (usize, usize, usize) {
  let Some(lt) = input.find('<') else {
    return (0, 0, 0);
  };
  let (mut line, mut line_start, mut offset) = (1, 0, 0);
  for ch in input[..lt].chars() {
    offset += ch.len_utf16();
    if ch == '\n' {
      line += 1;
      line_start = offset;
    }
  }
  (line, offset - line_start + 1, offset)
}

/// Convert a node and its subtree. Returns `Ok(None)` for nodes std's tree
/// has no equivalent for (PIs) or that the options filter out. `depth` is
/// the element depth in std's terms (root = 1).
fn node_to_std(
  doc: &Document<'_>,
  id: NodeId,
  opts: &ParseOptions,
  depth: u32,
) -> Result<Option<StdXmlNode>, JsError> {
  let node = match doc.node_kind(id) {
    Some(NodeKind::Element(el)) => {
      if let Some(max) = opts.max_depth.filter(|&max| depth > max) {
        return Err(js_err(format_args!(
          "maximum element nesting depth ({max}) exceeded at depth {depth}"
        )));
      }
      // std keeps namespace declarations as plain attributes; uppsala
      // stores them separately.
      let attributes = el
        .attributes
        .iter()
        .map(|a| (qname_raw(&a.name), a.value.to_string()))
        .chain(el.namespace_declarations.iter().map(|(prefix, uri)| {
          let key = if prefix.is_empty() {
            "xmlns".to_string()
          } else {
            format!("xmlns:{prefix}")
          };
          (key, uri.to_string())
        }))
        .collect();
      let mut children = Vec::new();
      for child in doc.children_iter(id) {
        if let Some(node) = node_to_std(doc, child, opts, depth + 1)? {
          children.push(node);
        }
      }
      StdXmlNode::Element {
        name: StdXmlName {
          raw: qname_raw(&el.name),
          local: el.name.local_name.to_string(),
          prefix: el.name.prefix.as_ref().map(|p| p.to_string()),
          uri: el
            .name
            .prefix
            .as_ref()
            .and(el.name.namespace_uri.as_ref())
            .map(|u| u.to_string()),
        },
        attributes,
        children,
      }
    }
    Some(NodeKind::Text(t))
      if !(opts.ignore_whitespace && t.trim().is_empty()) =>
    {
      StdXmlNode::Text {
        text: t.to_string(),
      }
    }
    Some(NodeKind::CData(t)) => StdXmlNode::Cdata {
      text: t.to_string(),
    },
    Some(NodeKind::Comment(t)) if !opts.ignore_comments => {
      StdXmlNode::Comment {
        text: t.to_string(),
      }
    }
    _ => return Ok(None),
  };
  Ok(Some(node))
}

fn document_to_std(
  doc: &Document<'_>,
  input: &str,
  opts: &ParseOptions,
) -> Result<StdXmlDocument, JsError> {
  let root_id = doc
    .document_element()
    .ok_or_else(|| js_err("document has no root element"))?;
  let declaration = doc.xml_declaration.as_ref().map(|d| {
    let (line, column, offset) = if opts.track_position.unwrap_or(true) {
      declaration_position(input)
    } else {
      (0, 0, 0)
    };
    StdXmlDeclaration {
      version: d.version.to_string(),
      encoding: d.encoding.as_ref().map(|e| e.to_string()),
      standalone: d.standalone.map(|b| (if b { "yes" } else { "no" }).into()),
      line,
      column,
      offset,
    }
  });
  let root = node_to_std(doc, root_id, opts, 1)?
    .ok_or_else(|| js_err("document element is not an element"))?;
  Ok(StdXmlDocument { declaration, root })
}

// ---------------------------------------------------------------------------
// std tree → XML text
// ---------------------------------------------------------------------------

/// Escape `&`, `<`, `>` (and `"` for attribute values) in a single pass.
fn push_escaped(out: &mut String, s: &str, attr: bool) {
  let mut last = 0;
  for (i, b) in s.bytes().enumerate() {
    let entity = match b {
      b'&' => "&amp;",
      b'<' => "&lt;",
      b'>' => "&gt;",
      b'"' if attr => "&quot;",
      _ => continue,
    };
    out.push_str(&s[last..i]);
    out.push_str(entity);
    last = i + 1;
  }
  out.push_str(&s[last..]);
}

/// Mirror of @std/xml's serializer:
///   - the indent prefix applies to elements and comments only
///   - an element whose children are all text/cdata is written inline
///   - otherwise each child goes on its own line (when indenting), and the
///     closing tag gets the element's own prefix
fn write_node(
  node: &StdXmlNode,
  out: &mut String,
  indent: Option<&str>,
  depth: usize,
) -> Result<(), JsError> {
  let push_prefix = |out: &mut String| {
    if let Some(indent) = indent {
      for _ in 0..depth {
        out.push_str(indent);
      }
    }
  };
  match node {
    StdXmlNode::Element {
      name,
      attributes,
      children,
    } => {
      push_prefix(out);
      out.push('<');
      out.push_str(&name.raw);
      for (k, v) in attributes {
        out.push(' ');
        out.push_str(k);
        out.push_str("=\"");
        push_escaped(out, v, true);
        out.push('"');
      }
      if children.is_empty() {
        out.push_str("/>");
        return Ok(());
      }
      out.push('>');
      let inline = children.iter().all(|c| {
        matches!(c, StdXmlNode::Text { .. } | StdXmlNode::Cdata { .. })
      });
      if inline {
        for child in children {
          write_node(child, out, indent, depth + 1)?;
        }
      } else {
        for child in children {
          if indent.is_some() {
            out.push('\n');
          }
          write_node(child, out, indent, depth + 1)?;
        }
        if indent.is_some() {
          out.push('\n');
        }
        push_prefix(out);
      }
      out.push_str("</");
      out.push_str(&name.raw);
      out.push('>');
    }
    StdXmlNode::Text { text } => push_escaped(out, text, false),
    // Split "]]>" across two CDATA sections, as @std/xml does.
    StdXmlNode::Cdata { text } => {
      out.push_str("<![CDATA[");
      out.push_str(&text.replace("]]>", "]]]]><![CDATA[>"));
      out.push_str("]]>");
    }
    // @std/xml rejects comments that cannot be serialized (XML 1.0 §2.5).
    StdXmlNode::Comment { text } => {
      if text.contains("--") {
        return Err(js_err(
          "Cannot serialize comment: XML forbids \"--\" within comments",
        ));
      }
      if text.ends_with('-') {
        return Err(js_err(
          "Cannot serialize comment: trailing \"-\" would produce invalid \"--->\"",
        ));
      }
      push_prefix(out);
      out.push_str("<!--");
      out.push_str(text);
      out.push_str("-->");
    }
  }
  Ok(())
}

fn std_document_to_xml(
  doc: &StdXmlDocument,
  opts: &StringifyOptions,
) -> Result<String, JsError> {
  let mut out = String::new();
  if let Some(decl) = doc
    .declaration
    .as_ref()
    .filter(|_| opts.declaration.unwrap_or(true))
  {
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
    if opts.indent.is_some() {
      out.push('\n');
    }
  }
  write_node(&doc.root, &mut out, opts.indent.as_deref(), 0)?;
  Ok(out)
}

// ---------------------------------------------------------------------------
// Issue position → Standard Schema path
// ---------------------------------------------------------------------------

/// Byte offset of each line start, for mapping uppsala's (line, column)
/// positions — the column is a 1-based byte column — back to byte offsets.
fn line_starts(input: &str) -> Vec<usize> {
  std::iter::once(0)
    .chain(
      input
        .bytes()
        .enumerate()
        .filter(|&(_, b)| b == b'\n')
        .map(|(i, _)| i + 1),
    )
    .collect()
}

/// The chain of element names from the root down to the deepest element
/// containing `offset`, with a 0-based index after a name only when its
/// parent has more than one child element of that name.
fn path_at(doc: &Document<'_>, offset: usize) -> Option<Vec<PathSegment>> {
  let contains =
    |id: NodeId| doc.node_range(id).is_some_and(|r| r.contains(&offset));
  let mut current = doc.document_element().filter(|&id| contains(id))?;
  let mut path =
    vec![PathSegment::Name(qname_raw(&doc.element(current)?.name))];
  while let Some(child) = doc
    .children_iter(current)
    .find(|&c| doc.element(c).is_some() && contains(c))
  {
    let name = &doc.element(child)?.name;
    let same_name = |&id: &NodeId| {
      doc.element(id).is_some_and(|e| {
        e.name.local_name == name.local_name && e.name.prefix == name.prefix
      })
    };
    let index = doc
      .children_iter(current)
      .take_while(|&id| id != child)
      .filter(same_name)
      .count();
    let repeated = index > 0
      || doc
        .children_iter(current)
        .filter(same_name)
        .nth(1)
        .is_some();
    path.push(PathSegment::Name(qname_raw(name)));
    if repeated {
      path.push(PathSegment::Index(index));
    }
    current = child;
  }
  Some(path)
}

// ---------------------------------------------------------------------------
// Public wasm API
// ---------------------------------------------------------------------------

/// Parse XML text into a JSON-encoded @std/xml `XmlDocument`.
///
/// `options` is a JSON-encoded @std/xml `ParseOptions`.
///
/// @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
/// is not well-formed, or when maxDepth is exceeded.
#[wasm_bindgen]
pub fn parse(input: &str, options: &str) -> Result<String, JsError> {
  let opts: ParseOptions = from_json_or_default(options);
  let mut parser = Parser::new();
  if let Some(max_depth) = opts.max_depth {
    parser = parser.with_max_depth(max_depth);
  }
  if opts.disallow_doctype.unwrap_or(true) {
    parser = parser.with_forbid_dtd(true);
  }
  let doc = parser.parse(input).map_err(to_js_error)?;
  to_json(&document_to_std(&doc, input, &opts)?)
}

/// Serialize a JSON-encoded @std/xml `XmlDocument` to XML text.
///
/// `options` is a JSON-encoded @std/xml `StringifyOptions`.
///
/// @throws {Error} if the input is not a valid XmlDocument, or contains a
/// comment that cannot be serialized.
#[wasm_bindgen]
pub fn stringify(doc: &str, options: &str) -> Result<String, JsError> {
  std_document_to_xml(&tree_from_json(doc)?, &from_json_or_default(options))
}

/// Check that a JSON-encoded @std/xml `XmlDocument` is well-formed XML.
///
/// @throws {Error} if the tree is not a valid XmlDocument, or does not
/// serialize to well-formed XML.
#[wasm_bindgen(js_name = checkTree)]
pub fn check_tree(doc: &str) -> Result<(), JsError> {
  uppsala::parse(&tree_to_xml(doc)?).map_err(to_js_error)?;
  Ok(())
}

/// A compiled XSD schema. Compile once, then validate any number of
/// documents given as XML text or as JSON-encoded `XmlDocument` trees.
#[wasm_bindgen]
pub struct XmlSchema {
  validator: XsdValidator,
}

#[wasm_bindgen]
impl XmlSchema {
  /// Compile a schema from XML text.
  ///
  /// @throws {Error} if the schema is not well-formed or not a valid XSD.
  #[wasm_bindgen(constructor)]
  pub fn new(schema: &str) -> Result<XmlSchema, JsError> {
    let schema_doc = uppsala::parse(schema).map_err(to_js_error)?;
    let validator = XsdValidator::from_schema(&schema_doc)
      .map_err(|e| js_err(format_args!("invalid schema: {e}")))?;
    Ok(XmlSchema { validator })
  }

  /// Compile a schema from a JSON-encoded `XmlDocument`.
  ///
  /// @throws {Error} if the tree is invalid or not a valid XSD.
  #[wasm_bindgen(js_name = fromTree)]
  pub fn from_tree(schema: &str) -> Result<XmlSchema, JsError> {
    XmlSchema::new(&tree_to_xml(schema)?)
  }

  /// Validate XML text. Returns a JSON-encoded Standard Schema result:
  /// `{ value: XmlDocument }` on success, `{ issues }` on failure.
  ///
  /// @throws {Error} if the document is not well-formed.
  pub fn validate(&self, document: &str) -> Result<String, JsError> {
    let doc = uppsala::parse(document).map_err(to_js_error)?;
    let result = match self.issues(&doc, document) {
      Some(issues) => ValidateResult::Failure { issues },
      None => ValidateResult::Success {
        value: document_to_std(&doc, document, &ParseOptions::default())?,
      },
    };
    to_json(&result)
  }

  /// Validate a JSON-encoded `XmlDocument`. Returns the JSON-encoded issues,
  /// or `undefined` when the document is valid — the caller already holds
  /// the tree, so it is not sent back.
  ///
  /// @throws {Error} if the tree is invalid or not well-formed.
  #[wasm_bindgen(js_name = validateTree)]
  pub fn validate_tree(
    &self,
    document: &str,
  ) -> Result<Option<String>, JsError> {
    let xml = tree_to_xml(document)?;
    let doc = uppsala::parse(&xml).map_err(to_js_error)?;
    self
      .issues(&doc, &xml)
      .map(|issues| to_json(&issues))
      .transpose()
  }
}

impl XmlSchema {
  /// Validation issues for a parsed document, or `None` when it is valid.
  /// Validation sees the full document: no whitespace/comment filtering.
  fn issues(
    &self,
    doc: &Document<'_>,
    input: &str,
  ) -> Option<Vec<ValidateIssue>> {
    let errors = self.validator.validate(doc);
    if errors.is_empty() {
      return None;
    }
    let starts = line_starts(input);
    let issues = errors
      .into_iter()
      .map(|e| {
        let path = e
          .line
          .zip(e.column)
          .filter(|&(line, column)| line > 0 && column > 0)
          .and_then(|(line, column)| {
            starts.get(line - 1).map(|s| s + column - 1)
          })
          .and_then(|offset| path_at(doc, offset));
        ValidateIssue {
          message: e.to_string(),
          path,
        }
      })
      .collect();
    Some(issues)
  }
}
