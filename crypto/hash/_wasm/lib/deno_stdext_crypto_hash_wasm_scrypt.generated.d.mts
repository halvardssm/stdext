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
* Hash a password using Scrypt
* @param {string} data
* @param {ScryptOptions} options
* @returns {string}
*/
export function hash(data: string, options: ScryptOptions): string;
/**
* Verify a password using Scrypt
* @param {string} data
* @param {string} hash
* @param {ScryptOptions} _options
* @returns {boolean}
*/
export function verify(data: string, hash: string, _options: ScryptOptions): boolean;

/**
 * Scrypt options
 */
export interface ScryptOptions {
  /**
   * Logarithmic complexity
   * 
   * Must be less than 64
   * 
   * @default 17
   */
  logN?: number;
  /**
   * Block size
   * 
   * Must be between 1 and 4294967295
   * 
   * @default 8
   */
  blockSize?: number; 
  /**
   * Parallelism
   * 
   * Must be between 1 and 4294967295
   * 
   * @default 1
   */
  parallelism?: number;
  /**
   * Key length
   * 
   * Must be between 10 and 64
   * 
   * @default 32
   */
  keyLenght?: number;
}


