import {
  type BcryptOptions,
  instantiate,
  type InstantiateResult,
} from "../_wasm/crypto_hash_bcrypt.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

export type { BcryptOptions };

export const hash = instance.hash;
export const verify = instance.verify;
