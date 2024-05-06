// deno-lint-ignore-file
// deno-fmt-ignore-file

export interface InstantiateResult {
  instance: WebAssembly.Instance;
  exports: {
    hash: typeof hash;
    verify: typeof verify
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

/**
* Hash a password using Bcrypt
* @param {string} password
* @param {BcryptOptions} options
* @returns {string}
*/
export function hash(password: string, options: BcryptOptions): string;
/**
* Verify a password using Bcrypt
* @param {string} password
* @param {string} hash
* @param {BcryptOptions} options
* @returns {boolean}
*/
export function verify(password: string, hash: string, options: BcryptOptions): boolean;

/**
 * Bcrypt options
 */
export interface BcryptOptions {
  /**
   * Must be a number between 4 and 31
   * 
   * @default 12
   */
   cost?: number;
}


