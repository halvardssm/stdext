// deno-lint-ignore-file
// deno-fmt-ignore-file

export interface InstantiateResult {
  instance: WebAssembly.Instance;
  exports: {
    JSONPath : typeof JSONPath 
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
 * JsonPath result
 */
export interface JSONPathResult<JsonValue = any> {
  path: string
  result: JsonValue
}


/**
* JSONPath
* 
* @example
* ```ts
* const jp = new JSONPath({a: "b"})
* jp.query("$.a") as JSONPathResult;
* ```
*/
export class JSONPath {
  free(): void;
/**
* @param {any} data
*/
  constructor(data: any);
/**
* @param {string} expression
* @returns {any}
*/
  query(expression: string): any;
}
