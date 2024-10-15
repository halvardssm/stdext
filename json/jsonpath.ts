import type { JsonValue } from "@std/json";
import {
  instantiate,
  type InstantiateResult,
  type JSONPath as WasmJSONPath,
  type JSONPathResult as WasmJSONPathResult,
} from "./_wasm/json_jsonpath.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

export type JSONPathResult<Value = JsonValue> = WasmJSONPathResult<Value>;

/**
 * JSONPath (RFC9535)
 *
 * @example querying
 * ```ts
 * import { JSONPath } from "@stdext/json";
 * const jp = new JSONPath({ a: "b" });
 * jp.query("$.a"); // "b"
 * ```
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9535
 */
export class JSONPath {
  #wasmJsonPath: WasmJSONPath;
  constructor(data: JsonValue) {
    this.#wasmJsonPath = new instance.JSONPath(data);
  }

  queryWithLocation<Value = JsonValue>(
    expression: string,
  ): JSONPathResult<Value>[] {
    return this.#wasmJsonPath.query(expression) as JSONPathResult<Value>[];
  }

  query<Value = JsonValue>(expression: string): Value[] {
    const res = this.queryWithLocation<Value>(expression);
    return res.map((r) => r.result);
  }
}
