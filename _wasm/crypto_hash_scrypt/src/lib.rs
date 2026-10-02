use scrypt::{
  Params, Scrypt,
  password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
/**
 * Scrypt options
 */
export interface ScryptOptions {
  /**
   * Logarithmic complexity
   * 
   * Must be less than 64
   * 
   * @default 17
   */
  logN?: number;
  /**
   * Block size
   * 
   * Must be between 1 and 4294967295
   * 
   * @default 8
   */
  blockSize?: number; 
  /**
   * Parallelism
   * 
   * Must be between 1 and 4294967295
   * 
   * @default 1
   */
  parallelism?: number;
  /**
   * Key length
   * 
   * Must be between 10 and 64
   * 
   * @default 32
   */
  keyLength?: number;
}
"#;

#[derive(Serialize, Deserialize, Debug)]
pub struct WasmScryptOptionsRaw {
  #[serde(rename = "logN")]
  pub log_n: Option<u8>,
  #[serde(rename = "blockSize")]
  pub block_size: Option<u32>,
  pub parallelism: Option<u32>,
  #[serde(rename = "keyLength")]
  pub key_length: Option<usize>,
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "ScryptOptions")]
  pub type ScryptOptions;
}

fn get_parsed_options(i: ScryptOptions) -> Params {
  let parsed_options: WasmScryptOptionsRaw =
    serde_wasm_bindgen::from_value(i.into())
      .expect_throw("Options could not be parsed");

  Params::new_with_output_len(
    parsed_options.log_n.unwrap_or(Params::RECOMMENDED_LOG_N),
    parsed_options.block_size.unwrap_or(Params::RECOMMENDED_R),
    parsed_options.parallelism.unwrap_or(Params::RECOMMENDED_P),
    parsed_options.key_length.unwrap_or(Params::RECOMMENDED_LEN),
  )
  .expect_throw("Failed to parse parameters")
}

/// Hash a password using Scrypt
#[wasm_bindgen]
pub fn hash(data: String, options: ScryptOptions) -> Result<String, JsError> {
  let parsed_options = get_parsed_options(options);
  let data_bytes = data.as_bytes();
  let hasher = Scrypt::new_with_params(parsed_options)
    .hash_password(data_bytes)
    .expect_throw("Failed to generate hash");
  Ok(hasher.to_string())
}

/// Verify a password using Scrypt
#[wasm_bindgen]
pub fn verify(
  data: String,
  hash: String,
  _options: ScryptOptions,
) -> Result<bool, JsError> {
  let data_bytes = data.as_bytes();
  let parsed_hash = PasswordHash::new(&hash)
    .expect_throw("Failed to parse hash, invalid hash provided");
  let is_ok = Scrypt::new()
    .verify_password(data_bytes, &parsed_hash)
    .is_ok();
  Ok(is_ok)
}
