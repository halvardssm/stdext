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
* Hash a password using Argon2
* @param {string} data
* @param {Argon2Options} options
* @returns {string}
*/
export function hash(data: string, options: Argon2Options): string;
/**
* Verify a password using Argon2
* @param {string} data
* @param {string} hash
* @param {Argon2Options} options
* @returns {boolean}
*/
export function verify(data: string, hash: string, options: Argon2Options): boolean;

/**
 * Argon2 algorithms
 */
export type Argon2Algorithm = "argon2d" | "argon2i" | "argon2id"
/**
 * Argon2 options
 */
export interface Argon2Options {
  /**
   * The Argon2 algorithm to use
   * 
   * @default "argon2id"
   */
  algorithm?: Argon2Algorithm;
  /**
   * Memory cost
   * 
   * @default 19456
   */
  memoryCost?: number;
  /**
   * Time cost
   * 
   * @default 2
   */
  timeCost?: number;
  /**
   * Parallelism
   * 
   * @default 1
   */
  parallelism?: number;
  /**
   * Output length, will default to 32usize
   */
  outputLength?: number;
}


