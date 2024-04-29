// deno-lint-ignore-file
// deno-fmt-ignore-file

export interface InstantiateResult {
  instance: WebAssembly.Instance;
  exports: {
    StdextBcrypt : typeof StdextBcrypt 
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


export interface StdextBcryptOptions {
  /**
   * Must be a number between 4 and 31
   * 
   * @default 12
   */
   cost?: number;
}


/**
*/
export class StdextBcrypt {
  free(): void;
/**
* @param {StdextBcryptOptions} i
*/
  constructor(i: StdextBcryptOptions);
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
