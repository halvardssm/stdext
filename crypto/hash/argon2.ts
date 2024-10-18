import {
  type Argon2Algorithm,
  type Argon2Options,
  instantiate,
  type InstantiateResult,
} from "../_wasm/crypto_hash_argon2.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

export type { Argon2Algorithm, Argon2Options };

export const hash = instance.hash;
export const verify = instance.verify;
