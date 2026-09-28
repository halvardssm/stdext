// @generated file from wasmbuild -- do not edit
// @ts-nocheck: generated
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * Parse an XML string into a plain document tree, identical in shape to
 * @std/xml's `parse` output.
 *
 * Options follow @std/xml's `ParseOptions` (camelCase): `ignoreWhitespace`,
 * `ignoreComments`, `disallowDoctype` (default true), `maxDepth` (root
 * element counts as depth 1, as in @std/xml), `trackPosition` (default
 * true — controls the declaration's position fields).
 * `maxAttributes` and `xmlVersion` are accepted but ignored (see the
 * crate-level notes above).
 *
 * @example
 * ```ts
 * const doc = parse('<root id="1"><child/></root>');
 * doc.root.name.local;          // "root"
 * doc.root.attributes["id"];    // "1"
 * ```
 *
 * @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
 * is not well-formed, or when maxDepth is exceeded.
 * @param {string} input
 * @param {any | null} [options]
 * @returns {any}
 */
export function parse(input, options) {
  const ptr0 = passStringToWasm0(
    input,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.parse(
    ptr0,
    len0,
    isLikeNone(options) ? 0 : addToExternrefTable0(options),
  );
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
}

/**
 * Serialize a document tree back to an XML string, with @std/xml's
 * `StringifyOptions` semantics (`indent` for pretty-printing, `declaration`
 * defaulting to true when the document has one). Attributes are emitted in
 * the input object's key order, which for parse output is document order.
 *
 * @example
 * ```ts
 * stringify(doc);                         // declaration kept if present
 * stringify(doc, { indent: "  " });        // pretty-printed
 * stringify(doc, { declaration: false }); // never emit <?xml ...?>
 * ```
 *
 * @throws {Error} if the input is not a valid XmlDocument object.
 * @param {any} doc
 * @param {any | null} [options]
 * @returns {string}
 */
export function stringify(doc, options) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ret = wasm.stringify(
      doc,
      isLikeNone(options) ? 0 : addToExternrefTable0(options),
    );
    var ptr1 = ret[0];
    var len1 = ret[1];
    if (ret[3]) {
      ptr1 = 0;
      len1 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred2_0 = ptr1;
    deferred2_1 = len1;
    return getStringFromWasm0(ptr1, len1);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
}

/**
 * Validate a document against an XSD schema.
 *
 * Both `document` and `schema` accept either an XML string or the plain
 * document/schema object (the same shape `parse` produces).
 *
 * Returns `{ value: XmlDocument, issues: { message: string }[] }`:
 *   - `value` is the document as a plain @std/xml-compatible tree
 *     (round-tripped through the validator)
 *   - `issues` is empty when the document conforms to the schema
 *
 * Error layering:
 *   - a schema that is not well-formed XML *throws*
 *   - an invalid XSD may *throw* (schema compilation error) — uppsala
 *     compiles leniently, so some authoring mistakes surface as validation
 *     issues on the document instead. Both behaviors are supported by the
 *     TS wrapper's callers.
 *   - a document that does not conform returns issues (does not throw)
 *
 * @example
 * ```ts
 * const result = validate("<age>25</age>", xsdString);
 * result.issues.length;          // 0
 * result.value.root.name.local;   // "age"
 * ```
 * @param {any} document
 * @param {any} schema
 * @returns {any}
 */
export function validate(document, schema) {
  const ret = wasm.validate(document, schema);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
}
export function __wbg_Error_8c4e43fe74559d73(arg0, arg1) {
  const ret = Error(getStringFromWasm0(arg0, arg1));
  return ret;
}
export function __wbg_String_fed4d24b68977888(arg0, arg1) {
  const ret = String(arg1);
  const ptr1 = passStringToWasm0(
    ret,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_bigint_get_as_i64_8fcf4ce7f1ca72a2(
  arg0,
  arg1,
) {
  const v = arg1;
  const ret = typeof v === "bigint" ? v : undefined;
  getDataViewMemory0().setBigInt64(
    arg0 + 8 * 1,
    isLikeNone(ret) ? BigInt(0) : ret,
    true,
  );
  getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25(arg0) {
  const v = arg0;
  const ret = typeof v === "boolean" ? v : undefined;
  return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_0bc8482c6e3508ae(arg0, arg1) {
  const ret = debugString(arg1);
  const ptr1 = passStringToWasm0(
    ret,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_in_47fa6863be6f2f25(arg0, arg1) {
  const ret = arg0 in arg1;
  return ret;
}
export function __wbg___wbindgen_is_bigint_31b12575b56f32fc(arg0) {
  const ret = typeof arg0 === "bigint";
  return ret;
}
export function __wbg___wbindgen_is_function_0095a73b8b156f76(arg0) {
  const ret = typeof arg0 === "function";
  return ret;
}
export function __wbg___wbindgen_is_object_5ae8e5880f2c1fbd(arg0) {
  const val = arg0;
  const ret = typeof val === "object" && val !== null;
  return ret;
}
export function __wbg___wbindgen_is_string_cd444516edc5b180(arg0) {
  const ret = typeof arg0 === "string";
  return ret;
}
export function __wbg___wbindgen_is_undefined_9e4d92534c42d778(arg0) {
  const ret = arg0 === undefined;
  return ret;
}
export function __wbg___wbindgen_jsval_eq_11888390b0186270(arg0, arg1) {
  const ret = arg0 === arg1;
  return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811(arg0, arg1) {
  const ret = arg0 == arg1;
  return ret;
}
export function __wbg___wbindgen_number_get_8ff4255516ccad3e(arg0, arg1) {
  const obj = arg1;
  const ret = typeof obj === "number" ? obj : undefined;
  getDataViewMemory0().setFloat64(
    arg0 + 8 * 1,
    isLikeNone(ret) ? 0 : ret,
    true,
  );
  getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_72fb696202c56729(arg0, arg1) {
  const obj = arg1;
  const ret = typeof obj === "string" ? obj : undefined;
  var ptr1 = isLikeNone(ret)
    ? 0
    : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  var len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_be289d5034ed271b(arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg_call_389efe28435a9388() {
  return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
  }, arguments);
}
export function __wbg_done_57b39ecd9addfe81(arg0) {
  const ret = arg0.done;
  return ret;
}
export function __wbg_entries_58c7934c745daac7(arg0) {
  const ret = Object.entries(arg0);
  return ret;
}
export function __wbg_get_9b94d73e6221f75c(arg0, arg1) {
  const ret = arg0[arg1 >>> 0];
  return ret;
}
export function __wbg_get_b3ed3ad4be2bc8ac() {
  return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
  }, arguments);
}
export function __wbg_get_with_ref_key_bb8f74a92cb2e784(arg0, arg1) {
  const ret = arg0[arg1];
  return ret;
}
export function __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04(arg0) {
  let result;
  try {
    result = arg0 instanceof ArrayBuffer;
  } catch (_) {
    result = false;
  }
  const ret = result;
  return ret;
}
export function __wbg_instanceof_Uint8Array_9b9075935c74707c(arg0) {
  let result;
  try {
    result = arg0 instanceof Uint8Array;
  } catch (_) {
    result = false;
  }
  const ret = result;
  return ret;
}
export function __wbg_isArray_d314bb98fcf08331(arg0) {
  const ret = Array.isArray(arg0);
  return ret;
}
export function __wbg_isSafeInteger_bfbc7332a9768d2a(arg0) {
  const ret = Number.isSafeInteger(arg0);
  return ret;
}
export function __wbg_iterator_6ff6560ca1568e55() {
  const ret = Symbol.iterator;
  return ret;
}
export function __wbg_length_32ed9a279acd054c(arg0) {
  const ret = arg0.length;
  return ret;
}
export function __wbg_length_35a7bace40f36eac(arg0) {
  const ret = arg0.length;
  return ret;
}
export function __wbg_new_361308b2356cecd0() {
  const ret = new Object();
  return ret;
}
export function __wbg_new_3eb36ae241fe6f44() {
  const ret = new Array();
  return ret;
}
export function __wbg_new_dca287b076112a51() {
  const ret = new Map();
  return ret;
}
export function __wbg_new_dd2b680c8bf6ae29(arg0) {
  const ret = new Uint8Array(arg0);
  return ret;
}
export function __wbg_next_3482f54c49e8af19() {
  return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
  }, arguments);
}
export function __wbg_next_418f80d8f5303233(arg0) {
  const ret = arg0.next;
  return ret;
}
export function __wbg_prototypesetcall_bdcdcc5842e4d77d(arg0, arg1, arg2) {
  Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}
export function __wbg_set_1eb0999cf5d27fc8(arg0, arg1, arg2) {
  const ret = arg0.set(arg1, arg2);
  return ret;
}
export function __wbg_set_3fda3bac07393de4(arg0, arg1, arg2) {
  arg0[arg1] = arg2;
}
export function __wbg_set_f43e577aea94465b(arg0, arg1, arg2) {
  arg0[arg1 >>> 0] = arg2;
}
export function __wbg_value_0546255b415e96c1(arg0) {
  const ret = arg0.value;
  return ret;
}
export function __wbindgen_cast_0000000000000001(arg0) {
  // Cast intrinsic for `F64 -> Externref`.
  const ret = arg0;
  return ret;
}
export function __wbindgen_cast_0000000000000002(arg0) {
  // Cast intrinsic for `I64 -> Externref`.
  const ret = arg0;
  return ret;
}
export function __wbindgen_cast_0000000000000003(arg0, arg1) {
  // Cast intrinsic for `Ref(String) -> Externref`.
  const ret = getStringFromWasm0(arg0, arg1);
  return ret;
}
export function __wbindgen_cast_0000000000000004(arg0) {
  // Cast intrinsic for `U64 -> Externref`.
  const ret = BigInt.asUintN(64, arg0);
  return ret;
}
export function __wbindgen_init_externref_table() {
  const table = wasm.__wbindgen_externrefs;
  const offset = table.grow(4);
  table.set(0, undefined);
  table.set(offset + 0, undefined);
  table.set(offset + 1, null);
  table.set(offset + 2, true);
  table.set(offset + 3, false);
}
export function __wbindgen_object_is_undefined(arg0) {
  const ret = arg0 === undefined;
  return ret;
}
function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function debugString(val) {
  // primitive types
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val);
  }
  if (className == "Object") {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`;
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true,
    });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(ptr, ptr + len),
  );
}

const cachedTextEncoder = new TextEncoder();

if (!("encodeInto" in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

let WASM_VECTOR_LEN = 0;

let wasm;
export function __wbg_set_wasm(val) {
  wasm = val;
}
