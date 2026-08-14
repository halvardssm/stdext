// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * JsonPath result
 */
export interface JSONPathResult<JsonValue = any> {
  path: string;
  result: JsonValue;
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
  [Symbol.dispose](): void;
  constructor(data: any);
  query(expression: string): any;
}
