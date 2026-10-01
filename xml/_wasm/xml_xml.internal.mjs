// @generated file from wasmbuild -- do not edit
// @ts-nocheck: generated
// deno-lint-ignore-file
// deno-fmt-ignore-file

/**
 * A compiled XSD schema. Compile once, then validate any number of
 * documents given as XML text or as JSON-encoded `XmlDocument` trees.
 */
export class XmlSchema {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(XmlSchema.prototype);
    obj.__wbg_ptr = ptr;
    XmlSchemaFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    XmlSchemaFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_xmlschema_free(ptr, 0);
  }
  /**
   * Compile a schema from a JSON-encoded `XmlDocument`.
   *
   * @throws {Error} if the tree is invalid or not a valid XSD.
   * @param {string} schema
   * @returns {XmlSchema}
   */
  static fromTree(schema) {
    const ptr0 = passStringToWasm0(
      schema,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.xmlschema_fromTree(ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return XmlSchema.__wrap(ret[0]);
  }
  /**
   * Compile a schema from XML text.
   *
   * @throws {Error} if the schema is not well-formed or not a valid XSD.
   * @param {string} schema
   */
  constructor(schema) {
    const ptr0 = passStringToWasm0(
      schema,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.xmlschema_new(ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    XmlSchemaFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Validate XML text. Returns a JSON-encoded Standard Schema result:
   * `{ value: XmlDocument }` on success, `{ issues }` on failure.
   *
   * @throws {Error} if the document is not well-formed.
   * @param {string} document
   * @returns {string}
   */
  validate(document) {
    let deferred3_0;
    let deferred3_1;
    try {
      const ptr0 = passStringToWasm0(
        document,
        wasm.__wbindgen_malloc,
        wasm.__wbindgen_realloc,
      );
      const len0 = WASM_VECTOR_LEN;
      const ret = wasm.xmlschema_validate(this.__wbg_ptr, ptr0, len0);
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
   * Validate a JSON-encoded `XmlDocument`. Returns the JSON-encoded issues,
   * or `undefined` when the document is valid — the caller already holds
   * the tree, so it is not sent back.
   *
   * @throws {Error} if the tree is invalid or not well-formed.
   * @param {string} document
   * @returns {string | undefined}
   */
  validateTree(document) {
    const ptr0 = passStringToWasm0(
      document,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.xmlschema_validateTree(this.__wbg_ptr, ptr0, len0);
    if (ret[3]) {
      throw takeFromExternrefTable0(ret[2]);
    }
    let v2;
    if (ret[0] !== 0) {
      v2 = getStringFromWasm0(ret[0], ret[1]).slice();
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
  }
}
if (Symbol.dispose) {
  XmlSchema.prototype[Symbol.dispose] = XmlSchema.prototype.free;
}

/**
 * Check that a JSON-encoded @std/xml `XmlDocument` is well-formed XML.
 *
 * @throws {Error} if the tree is not a valid XmlDocument, or does not
 * serialize to well-formed XML.
 * @param {string} doc
 */
export function checkTree(doc) {
  const ptr0 = passStringToWasm0(
    doc,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.checkTree(ptr0, len0);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * Parse XML text into a JSON-encoded @std/xml `XmlDocument`.
 *
 * `options` is a JSON-encoded @std/xml `ParseOptions`.
 *
 * @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
 * is not well-formed, or when maxDepth is exceeded.
 * @param {string} input
 * @param {string} options
 * @returns {string}
 */
export function parse(input, options) {
  let deferred4_0;
  let deferred4_1;
  try {
    const ptr0 = passStringToWasm0(
      input,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(
      options,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.parse(ptr0, len0, ptr1, len1);
    var ptr3 = ret[0];
    var len3 = ret[1];
    if (ret[3]) {
      ptr3 = 0;
      len3 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred4_0 = ptr3;
    deferred4_1 = len3;
    return getStringFromWasm0(ptr3, len3);
  } finally {
    wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
  }
}

/**
 * Serialize a JSON-encoded @std/xml `XmlDocument` to XML text.
 *
 * `options` is a JSON-encoded @std/xml `StringifyOptions`.
 *
 * @throws {Error} if the input is not a valid XmlDocument, or contains a
 * comment that cannot be serialized.
 * @param {string} doc
 * @param {string} options
 * @returns {string}
 */
export function stringify(doc, options) {
  let deferred4_0;
  let deferred4_1;
  try {
    const ptr0 = passStringToWasm0(
      doc,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(
      options,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.stringify(ptr0, len0, ptr1, len1);
    var ptr3 = ret[0];
    var len3 = ret[1];
    if (ret[3]) {
      ptr3 = 0;
      len3 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred4_0 = ptr3;
    deferred4_1 = len3;
    return getStringFromWasm0(ptr3, len3);
  } finally {
    wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
  }
}
export function __wbg_Error_8c4e43fe74559d73(arg0, arg1) {
  const ret = Error(getStringFromWasm0(arg0, arg1));
  return ret;
}
export function __wbg___wbindgen_throw_be289d5034ed271b(arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1));
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
const XmlSchemaFinalization = (typeof FinalizationRegistry === "undefined")
  ? { register: () => {}, unregister: () => {} }
  : new FinalizationRegistry((ptr) => wasm.__wbg_xmlschema_free(ptr >>> 0, 1));

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
