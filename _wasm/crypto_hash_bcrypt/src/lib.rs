use bcrypt::{hash as bcrypt_hash, verify as bcrypt_verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
/**
 * Bcrypt options
 */
export interface BcryptOptions {
  /**
   * Must be a number between 4 and 31
   * 
   * @default 12
   */
   cost?: number;
}
"#;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "BcryptOptions")]
  pub type BcryptOptions;
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WasmBcryptOptionsIncoming {
  pub cost: Option<u32>,
}

fn get_parsed_options(i: BcryptOptions) -> u32 {
  let parsed_options: WasmBcryptOptionsIncoming =
    serde_wasm_bindgen::from_value(i.into())
      .expect_throw("Options could not be parsed");
  parsed_options.cost.unwrap_or(DEFAULT_COST)
}

/// Hash a password using Bcrypt
#[wasm_bindgen]
pub fn hash(
  password: String,
  options: BcryptOptions,
) -> Result<String, JsError> {
  let cost = get_parsed_options(options);
  Ok(bcrypt_hash(password, cost).expect_throw("Failed to generate hash"))
}

/// Verify a password using Bcrypt
#[wasm_bindgen]
pub fn verify(
  password: String,
  hash: String,
  options: BcryptOptions,
) -> Result<bool, JsError> {
  let is_ok = bcrypt_verify(password, &hash.as_str()).is_ok();
  Ok(is_ok)
}
