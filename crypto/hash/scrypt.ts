import {
  instantiate,
  type InstantiateResult,
  type ScryptOptions,
} from "../_wasm/crypto_hash_scrypt.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

export type { ScryptOptions };

export const hash = instance.hash;
export const verify = instance.verify;
