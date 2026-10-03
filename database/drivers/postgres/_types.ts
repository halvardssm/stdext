/**
 * Parses a value received from Postgres in text format.
 */
export type Parser = (value: string) => unknown;

/**
 * The object identifiers (OID) of the built-in Postgres types that are parsed
 * by default.
 */
export const Oid = {
  bool: 16,
  bytea: 17,
  int8: 20,
  int2: 21,
  int4: 23,
  oid: 26,
  json: 114,
  float4: 700,
  float8: 701,
  date: 1082,
  timestamp: 1114,
  timestamptz: 1184,
  numeric: 1700,
  jsonb: 3802,
} as const;

/**
 * Postgres prints years outside of 1 to 9999 differently from ISO 8601, as
 * `0044-03-15 12:00:00 BC` and `10000-01-01 00:00:00`. Rewrite them to ISO
 * 8601 extended years, which Temporal parses.
 */
function toIsoYears(value: string): string {
  const bc = value.endsWith(" BC");
  const text = bc ? value.slice(0, -3) : value;
  const index = text.indexOf("-");
  const year = Number(text.slice(0, index));
  if (!bc && year <= 9999) return text;
  const isoYear = bc ? 1 - year : year;
  const sign = isoYear < 0 ? "-" : "+";
  return `${sign}${String(Math.abs(isoYear)).padStart(6, "0")}${
    text.slice(index)
  }`;
}

/**
 * Parse a Postgres `timestamptz`. Values that can not be represented as a
 * date, such as `infinity`, are returned as strings.
 */
export function parseTimestamptz(value: string): Date | string {
  try {
    return new Date(Temporal.Instant.from(toIsoYears(value)).epochMilliseconds);
  } catch {
    return value;
  }
}

/**
 * Parse a Postgres `timestamp`, which has no time zone, as UTC, so that the
 * result does not depend on the time zone of the machine. Values
 * that can not be represented as a date, such as `infinity`, are returned as
 * strings.
 */
export function parseTimestamp(value: string): Date | string {
  try {
    return new Date(
      Temporal.PlainDateTime.from(toIsoYears(value))
        .toZonedDateTime("UTC").epochMilliseconds,
    );
  } catch {
    return value;
  }
}

/**
 * Parse a `bytea` in the default hex output format.
 */
export function parseBytea(value: string): Uint8Array {
  if (value.startsWith("\\x")) return Uint8Array.fromHex(value.slice(2));
  // The legacy escape format
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== "\\") {
      bytes.push(value.charCodeAt(i));
    } else if (value[i + 1] === "\\") {
      bytes.push(0x5c);
      i++;
    } else {
      bytes.push(parseInt(value.slice(i + 1, i + 4), 8));
      i += 3;
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Parse a Postgres array literal, such as `{1,2,NULL}` or `{{"a","b"}}`.
 *
 * @param value the array literal
 * @param parseElement the parser for the non-null elements
 */
export function parseArray(value: string, parseElement: Parser): unknown[] {
  let i = 0;
  // Arrays with non-default bounds are prefixed with the dimensions, such
  // as `[0:1]={1,2}`.
  if (value[0] === "[") i = value.indexOf("=") + 1;

  function parse(): unknown[] {
    const out: unknown[] = [];
    i++; // {
    if (value[i] === "}") {
      i++;
      return out;
    }
    while (true) {
      if (value[i] === "{") {
        out.push(parse());
      } else if (value[i] === '"') {
        let element = "";
        i++;
        while (value[i] !== '"') {
          if (value[i] === "\\") i++;
          element += value[i++];
        }
        i++;
        out.push(parseElement(element));
      } else {
        const start = i;
        while (value[i] !== "," && value[i] !== "}") i++;
        const element = value.slice(start, i);
        out.push(element === "NULL" ? null : parseElement(element));
      }
      if (value[i++] === "}") return out;
    }
  }

  return parse();
}

const parseBool: Parser = (value) => value === "t";
const parseInt8: Parser = (value) => BigInt(value);
const parseString: Parser = (value) => value;

const scalarParsers: Record<number, Parser> = {
  [Oid.bool]: parseBool,
  [Oid.bytea]: parseBytea,
  [Oid.int8]: parseInt8,
  [Oid.int2]: Number,
  [Oid.int4]: Number,
  [Oid.oid]: Number,
  [Oid.json]: JSON.parse,
  [Oid.float4]: Number,
  [Oid.float8]: Number,
  [Oid.date]: parseString,
  [Oid.timestamp]: parseTimestamp,
  [Oid.timestamptz]: parseTimestamptz,
  [Oid.numeric]: parseString,
  [Oid.jsonb]: JSON.parse,
};

// Array type OID to element type OID
const arrayTypes: Record<number, number> = {
  1000: Oid.bool,
  1001: Oid.bytea,
  1016: Oid.int8,
  1005: Oid.int2,
  1007: Oid.int4,
  1028: Oid.oid,
  199: Oid.json,
  1021: Oid.float4,
  1022: Oid.float8,
  1182: Oid.date,
  1115: Oid.timestamp,
  1185: Oid.timestamptz,
  1231: Oid.numeric,
  3807: Oid.jsonb,
  // Arrays of string types
  1009: 0, // text
  1015: 0, // varchar
  1014: 0, // bpchar
  1003: 0, // name
  2951: 0, // uuid
};

/**
 * The default parsers by type OID. Types without a parser are returned as
 * strings.
 */
export const defaultParsers: Readonly<Record<number, Parser>> = {
  ...scalarParsers,
  ...Object.fromEntries(
    Object.entries(arrayTypes).map(([oid, element]) => {
      const parseElement = scalarParsers[element] ?? parseString;
      return [oid, (value: string) => parseArray(value, parseElement)];
    }),
  ),
};

function quote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Encode an array as a Postgres array literal.
 */
export function encodeArray(values: unknown[]): string {
  const elements = values.map((value) => {
    if (value === null || value === undefined) return "NULL";
    if (Array.isArray(value)) return encodeArray(value);
    return quote(encodeParameter(value)!);
  });
  return `{${elements.join(",")}}`;
}

/**
 * Encode a parameter in text format, or `null` for SQL `NULL`. The type is
 * inferred by the server from the statement.
 */
export function encodeParameter(value: unknown): string | null {
  switch (typeof value) {
    case "undefined":
      return null;
    case "string":
      return value;
    case "number":
    case "bigint":
      return value.toString();
    case "boolean":
      return value ? "true" : "false";
  }
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ArrayBuffer) {
    return `\\x${new Uint8Array(value).toHex()}`;
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    return `\\x${bytes.toHex()}`;
  }
  if (Array.isArray(value)) return encodeArray(value);
  return JSON.stringify(value);
}
