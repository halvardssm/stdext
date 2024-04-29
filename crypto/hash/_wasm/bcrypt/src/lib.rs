use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const ITEXT_STYLE: &'static str = r#"
export interface StdextBcryptOptions {
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
  #[wasm_bindgen(typescript_type = "StdextBcryptOptions")]
  pub type StdextBcryptOptions;
}

#[wasm_bindgen]
#[derive(Default)]
pub struct StdextBcrypt {
  cost: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StdextBcryptOptionsIncoming {
  pub cost: Option<u32>,
}

#[wasm_bindgen]
impl StdextBcrypt {
  #[wasm_bindgen(constructor)]
  pub fn new(i: StdextBcryptOptions) -> StdextBcrypt {
    let parsed_options: StdextBcryptOptionsIncoming =
      serde_wasm_bindgen::from_value(i.into()).unwrap_throw();

    Self {
      cost: parsed_options.cost.unwrap_or(DEFAULT_COST),
    }
  }

  #[wasm_bindgen]
  pub fn hash(&self, password: &str) -> String {
    hash(password, self.cost).expect_throw("failed to hash password")
  }

  #[wasm_bindgen]
  pub fn verify(&self, password: &str, hash: &str) -> bool {
    verify(password, hash).expect_throw("failed to verify password")
  }
}
