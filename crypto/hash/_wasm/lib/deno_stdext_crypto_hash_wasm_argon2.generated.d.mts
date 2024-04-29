// deno-lint-ignore-file
// deno-fmt-ignore-file

export interface InstantiateResult {
  instance: WebAssembly.Instance;
  exports: {
    StdextArgon2 : typeof StdextArgon2 
  };
}

/** Gets if the Wasm module has been instantiated. */
export function isInstantiated(): boolean;


/** Instantiates an instance of the Wasm module returning its functions.
* @remarks It is safe to call this multiple times and once successfully
* loaded it will always return a reference to the same object. */
export function instantiate(): InstantiateResult["exports"];

/** Instantiates an instance of the Wasm module along with its exports.
 * @remarks It is safe to call this multiple times and once successfully
 * loaded it will always return a reference to the same object. */
export function instantiateWithInstance(): InstantiateResult;


export type StdextArgon2Algorithm = "argon2d" | "argon2i" | "argon2id"
export interface StdextArgon2Options {
    algorithm?: StdextArgon2Algorithm;
    memoryCost?: number;
    timeCost?: number;
    parallelism?: number;
    outputLength?: number;
}


/**
*/
export class StdextArgon2 {
  free(): void;
/**
* @param {StdextArgon2Options} i
*/
  constructor(i: StdextArgon2Options);
/**
* @param {string} password
* @returns {string}
*/
  hash(password: string): string;
/**
* @param {string} password
* @param {string} hash
* @returns {boolean}
*/
  verify(password: string, hash: string): boolean;
}
