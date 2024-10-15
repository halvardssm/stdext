use argon2::{
  password_hash::{
    rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier,
    SaltString,
  },
  Argon2, Version,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
/**
 * Argon2 algorithms
 */
export type Argon2Algorithm = "argon2d" | "argon2i" | "argon2id"
/**
 * Argon2 options
 */
export interface Argon2Options {
  /**
   * The Argon2 algorithm to use
   * 
   * @default "argon2id"
   */
  algorithm?: Argon2Algorithm;
  /**
   * Memory cost
   * 
   * @default 19456
   */
  memoryCost?: number;
  /**
   * Time cost
   * 
   * @default 2
   */
  timeCost?: number;
  /**
   * Parallelism
   * 
   * @default 1
   */
  parallelism?: number;
  /**
   * Output length, will default to 32usize
   */
  outputLength?: number;
}
"#;

#[derive(Serialize, Deserialize, Debug)]
pub struct WasmArgon2OptionsIncoming {
  pub algorithm: Option<String>,
  #[serde(rename = "memoryCost")]
  pub memory_cost: Option<u32>,
  #[serde(rename = "timeCost")]
  pub time_cost: Option<u32>,
  pub parallelism: Option<u32>,
  #[serde(rename = "outputLength")]
  pub output_length: Option<usize>,
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "Argon2Options")]
  pub type Argon2Options;
}

fn get_parsed_options(i: Argon2Options) -> (argon2::Algorithm, argon2::Params) {
  let parsed_options: WasmArgon2OptionsIncoming =
    serde_wasm_bindgen::from_value(i.into()).unwrap_throw();

  let algorithm = match parsed_options
    .algorithm
    .unwrap_or("argon2id".to_string())
    .as_str()
  {
    "argon2d" => argon2::Algorithm::Argon2d,
    "argon2i" => argon2::Algorithm::Argon2i,
    "argon2id" => argon2::Algorithm::Argon2id,
    _ => argon2::Algorithm::Argon2id,
  };

  let default_params = argon2::Params::default();

  let params = argon2::Params::new(
    parsed_options
      .memory_cost
      .unwrap_or(default_params.m_cost()),
    parsed_options.time_cost.unwrap_or(default_params.t_cost()),
    parsed_options
      .parallelism
      .unwrap_or(default_params.p_cost()),
    parsed_options.output_length,
  )
  .expect_throw("failed to create params");

  (algorithm, params)
}

/// Hash a password using Argon2
#[wasm_bindgen]
pub fn hash(data: String, options: Argon2Options) -> String {
  let (algorithm, parsed_options) = get_parsed_options(options);
  let argon2 = Argon2::new(algorithm, Version::V0x13, parsed_options.clone());
  let salt = SaltString::generate(&mut OsRng);
  let data_bytes = data.as_bytes();
  argon2
    .hash_password(data_bytes, &salt)
    .expect("hashing failed")
    .to_string()
}

/// Verify a password using Argon2
#[wasm_bindgen]
pub fn verify(data: String, hash: String, options: Argon2Options) -> bool {
  let (algorithm, parsed_options) = get_parsed_options(options);

  let data_bytes = data.as_bytes();
  let parsed_hash = PasswordHash::new(&hash).expect("failed to parse hash");
  let argon2 = Argon2::new(algorithm, Version::V0x13, parsed_options.clone())
    .verify_password(data_bytes, &parsed_hash)
    .is_ok();

  argon2
}
