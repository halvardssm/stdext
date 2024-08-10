import {
  instantiate,
  type InstantiateResult,
  type ScryptOptions,
} from "./_wasm/lib/deno_stdext_crypto_hash_wasm_scrypt.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

export type { ScryptOptions };

export const hash = instance.hash;
export const verify = instance.verify;
