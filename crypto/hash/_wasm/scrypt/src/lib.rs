use scrypt::{
  password_hash::{
    rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier,
    SaltString,
  },
  Params, Scrypt,
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
  keyLenght?: number;
}
"#;

#[derive(Serialize, Deserialize, Debug)]
pub struct WasmScryptOptionsRaw {
  #[serde(rename = "logN")]
  pub log_n: Option<u8>,
  #[serde(rename = "blockSize")]
  pub block_size: Option<u32>,
  pub parallelism: Option<u32>,
  #[serde(rename = "keyLenght")]
  pub key_lenght: Option<usize>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WasmScryptOptionsParsed {
  pub log_n: u8,
  pub block_size: u32,
  pub parallelism: u32,
  pub key_lenght: usize,
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "ScryptOptions")]
  pub type ScryptOptions;
}

fn get_parsed_options(i: ScryptOptions) -> Params {
  let parsed_options: WasmScryptOptionsRaw =
    serde_wasm_bindgen::from_value(i.into()).unwrap_throw();

  Params::new(
    parsed_options.log_n.unwrap_or(Params::RECOMMENDED_LOG_N),
    parsed_options.block_size.unwrap_or(Params::RECOMMENDED_R),
    parsed_options.parallelism.unwrap_or(Params::RECOMMENDED_P),
    parsed_options.key_lenght.unwrap_or(Params::RECOMMENDED_LEN),
  )
  .expect("invalid parameters")
}

/// Hash a password using Scrypt
#[wasm_bindgen]
pub fn hash(data: String, options: ScryptOptions) -> String {
  let parsed_options = get_parsed_options(options);
  let data_bytes = data.as_bytes();
  let salt = SaltString::generate(&mut OsRng);
  let hasher = Scrypt
    .hash_password_customized(data_bytes, None, None, parsed_options, &salt)
    .expect_throw("failed to hash password");
  hasher.to_string()
}

/// Verify a password using Scrypt
#[wasm_bindgen]
pub fn verify(data: String, hash: String, _options: ScryptOptions) -> bool {
  let data_bytes = data.as_bytes();
  let parsed_hash = PasswordHash::new(&hash).expect("failed to parse hash");
  Scrypt.verify_password(data_bytes, &parsed_hash).is_ok()
}
