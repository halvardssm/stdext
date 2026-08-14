// @generated file from wasmbuild -- do not edit
// @ts-nocheck: generated
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * Hash a password using Argon2
 * @param {string} data
 * @param {Argon2Options} options
 * @returns {string}
 */
export function hash(data, options) {
  let deferred3_0;
  let deferred3_1;
  try {
    const ptr0 = passStringToWasm0(
      data,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.hash(ptr0, len0, options);
    var ptr2 = ret[0];
    var len2 = ret[1];
    if (ret[3]) {
      ptr2 = 0;
      len2 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred3_0 = ptr2;
    deferred3_1 = len2;
    return getStringFromWasm0(ptr2, len2);
  } finally {
    wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
  }
}

/**
 * Verify a password using Argon2
 * @param {string} data
 * @param {string} hash
 * @param {Argon2Options} options
 * @returns {boolean}
 */
export function verify(data, hash, options) {
  const ptr0 = passStringToWasm0(
    data,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(
    hash,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.verify(ptr0, len0, ptr1, len1, options);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return ret[0] !== 0;
}
export function __wbg_Error_8c4e43fe74559d73(arg0, arg1) {
  const ret = Error(getStringFromWasm0(arg0, arg1));
  return ret;
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
export function __wbg_call_4708e0c13bdc8e95() {
  return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
  }, arguments);
}
export function __wbg_crypto_dd1b8f71596b161a(arg0) {
  const ret = arg0.crypto;
  return ret;
}
export function __wbg_getRandomValues_760c8e927227643e() {
  return handleError(function (arg0, arg1) {
    arg0.getRandomValues(arg1);
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
export function __wbg_isSafeInteger_bfbc7332a9768d2a(arg0) {
  const ret = Number.isSafeInteger(arg0);
  return ret;
}
export function __wbg_length_32ed9a279acd054c(arg0) {
  const ret = arg0.length;
  return ret;
}
export function __wbg_msCrypto_60a4979188f6b80b(arg0) {
  const ret = arg0.msCrypto;
  return ret;
}
export function __wbg_new_dd2b680c8bf6ae29(arg0) {
  const ret = new Uint8Array(arg0);
  return ret;
}
export function __wbg_new_no_args_1c7c842f08d00ebb(arg0, arg1) {
  const ret = new Function(getStringFromWasm0(arg0, arg1));
  return ret;
}
export function __wbg_new_with_length_a2c39cbe88fd8ff1(arg0) {
  const ret = new Uint8Array(arg0 >>> 0);
  return ret;
}
export function __wbg_node_0deadde112ce24bb(arg0) {
  const ret = arg0.node;
  return ret;
}
export function __wbg_process_0caa4f154b97e834(arg0) {
  const ret = arg0.process;
  return ret;
}
export function __wbg_prototypesetcall_bdcdcc5842e4d77d(arg0, arg1, arg2) {
  Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}
export function __wbg_randomFillSync_82e8b56b81896e30() {
  return handleError(function (arg0, arg1) {
    arg0.randomFillSync(arg1);
  }, arguments);
}
export function __wbg_require_1a22b236558b5786() {
  return handleError(function () {
    const ret = module.require;
    return ret;
  }, arguments);
}
export function __wbg_static_accessor_GLOBAL_12837167ad935116() {
  const ret = typeof global === "undefined" ? null : global;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f() {
  const ret = typeof globalThis === "undefined" ? null : globalThis;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_SELF_a621d3dfbb60d0ce() {
  const ret = typeof self === "undefined" ? null : self;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_WINDOW_f8727f0cf888e0bd() {
  const ret = typeof window === "undefined" ? null : window;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_subarray_a96e1fef17ed23cb(arg0, arg1, arg2) {
  const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
  return ret;
}
export function __wbg_versions_134d8f3c6de79566(arg0) {
  const ret = arg0.versions;
  return ret;
}
export function __wbindgen_cast_0000000000000001(arg0, arg1) {
  // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
  const ret = getArrayU8FromWasm0(arg0, arg1);
  return ret;
}
export function __wbindgen_cast_0000000000000002(arg0, arg1) {
  // Cast intrinsic for `Ref(String) -> Externref`.
  const ret = getStringFromWasm0(arg0, arg1);
  return ret;
}
export function __wbindgen_cast_0000000000000003(arg0) {
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
