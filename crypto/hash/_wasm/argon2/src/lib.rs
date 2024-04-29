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
export type StdextArgon2Algorithm = "argon2d" | "argon2i" | "argon2id"
export interface StdextArgon2Options {
    algorithm?: StdextArgon2Algorithm;
    memoryCost?: number;
    timeCost?: number;
    parallelism?: number;
    outputLength?: number;
}
"#;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "StdextArgon2Options")]
  pub type StdextArgon2Options;
}

#[wasm_bindgen]
#[derive(Default)]
pub struct StdextArgon2 {
  options: argon2::Params,
  algorithm: argon2::Algorithm,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StdextArgon2OptionsIncoming {
  #[serde(rename = "memoryCost")]
  pub m_cost: Option<u32>,
  #[serde(rename = "timeCost")]
  pub t_cost: Option<u32>,
  #[serde(rename = "parallelism")]
  pub p: Option<u32>,
  #[serde(rename = "outputLength")]
  pub output_len: Option<usize>,
  pub algorithm: Option<String>,
}

#[wasm_bindgen]
impl StdextArgon2 {
  #[wasm_bindgen(constructor)]
  pub fn new(i: StdextArgon2Options) -> StdextArgon2 {
    let parsed_options: StdextArgon2OptionsIncoming =
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
      parsed_options.m_cost.unwrap_or(default_params.m_cost()),
      parsed_options.t_cost.unwrap_or(default_params.t_cost()),
      parsed_options.p.unwrap_or(default_params.p_cost()),
      parsed_options.output_len,
    )
    .expect_throw("failed to create params");

    Self {
      options: params,
      algorithm: algorithm,
    }
  }

  #[wasm_bindgen]
  pub fn hash(&self, password: &str) -> String {
    let argon2 =
      Argon2::new(self.algorithm, Version::V0x13, self.options.clone());
    let salt = SaltString::generate(&mut OsRng);
    let password_bytes = password.as_bytes();
    argon2
      .hash_password(password_bytes, &salt)
      .expect("hashing failed")
      .to_string()
  }

  #[wasm_bindgen]
  pub fn verify(&self, password: &str, hash: &str) -> bool {
    let password_bytes = password.as_bytes();
    let parsed_hash = PasswordHash::new(&hash).expect("failed to parse hash");
    let argon2 =
      Argon2::new(self.algorithm, Version::V0x13, self.options.clone())
        .verify_password(password_bytes, &parsed_hash)
        .is_ok();

    argon2
  }
}
