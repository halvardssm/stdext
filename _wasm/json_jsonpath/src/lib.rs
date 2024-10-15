use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_json_path::JsonPath;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
/**
 * JsonPath result
 */
export interface JSONPathResult<JsonValue = any> {
  path: string
  result: JsonValue
}
"#;

#[derive(Serialize, Deserialize, Debug)]
pub struct JsonPathResultRaw {
  pub path: String,
  pub result: Value,
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "JSONPathResult")]
  pub type JsonPathResult;
}

/// JSONPath
///
/// @example
/// ```ts
/// const jp = new JSONPath({a: "b"})
/// jp.query("$.a") as JSONPathResult;
/// ```
#[wasm_bindgen]
pub struct JSONPath {
  data: Value,
}

#[wasm_bindgen]
impl JSONPath {
  #[wasm_bindgen(constructor)]
  pub fn new(data: JsValue) -> JSONPath {
    JSONPath {
      data: serde_wasm_bindgen::from_value(data).unwrap(),
    }
  }

  #[wasm_bindgen()]
  pub fn query(&self, expression: String) -> JsValue {
    let path = JsonPath::parse(&expression).unwrap();
    let pairs: Vec<JsonPathResultRaw> = path
      .query_located(&self.data)
      .iter()
      .map(|q| JsonPathResultRaw {
        path: q.location().to_string(),
        result: q.node().clone(),
      })
      .collect();

    let serializer: Serializer = Serializer::new()
      .serialize_maps_as_objects(true)
      .serialize_missing_as_null(true);

    pairs.serialize(&serializer).unwrap()
  }
}
