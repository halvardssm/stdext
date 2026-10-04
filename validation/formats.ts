/**
 * The `format` values {@linkcode string} can assert, and the check for each.
 *
 * The regular expressions are named after the RFC or ISO section they
 * implement.
 *
 * @module
 */

/**
 * The formats of the `format` option of {@linkcode string}, the ones JSON
 * Schema defines plus `regex`.
 */
export type StringFormat =
  | "date-time"
  | "date"
  | "time"
  | "duration"
  | "email"
  | "idn-email"
  | "hostname"
  | "idn-hostname"
  | "ipv4"
  | "ipv6"
  | "uri"
  | "uri-reference"
  | "iri"
  | "iri-reference"
  | "uri-template"
  | "uuid"
  | "json-pointer"
  | "relative-json-pointer"
  | "regex";

/** ISO 8601 date-time: `YYYY-MM-DDTHH:mm:ss(.sss)?(Z|±HH:mm)?`. */
const ISO8601_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/** ISO 8601 time: `HH:mm:ss(.sss)?(Z|±HH:mm)?`. */
const ISO8601_TIME = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/** ISO 8601 date: `YYYY-MM-DD`. */
const ISO8601_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ISO 8601 duration: `P1Y2M3DT4H5M6S` or `P2W`, not empty. */
const ISO8601_DURATION =
  /^P(?!$)(?:\d+W|(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?)?)$/;

/** RFC 5321 email address (ASCII). */
const RFC5321_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** RFC 6531 email address, with an internationalized domain and local part. */
const RFC6531_IDN_EMAIL =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u;

/**
 * RFC 1123 hostname: dot separated labels of letters, digits and hyphens
 * (1-63 characters, not starting or ending with a hyphen), at most 253
 * characters. A single label such as `localhost` is valid.
 */
const RFC1123_HOSTNAME =
  /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/;

/** RFC 5890 internationalized hostname. */
const RFC5890_IDN_HOSTNAME =
  /^(?=.{1,253}\.?$)[\p{L}\p{N}\p{M}](?:[\p{L}\p{N}\p{M}-]{0,61}[\p{L}\p{N}\p{M}])?(?:\.[\p{L}\p{N}\p{M}](?:[\p{L}\p{N}\p{M}-]{0,61}[\p{L}\p{N}\p{M}])?)*\.?$/u;

const IPV4 =
  "(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const H16 = "[0-9a-fA-F]{1,4}";

/** RFC 2673 IPv4 address in dotted-decimal notation, without leading zeros. */
const RFC2673_IPV4 = new RegExp(`^${IPV4}$`);

/**
 * RFC 2373 IPv6 address: full or compressed (`::`) form, optionally ending in
 * an embedded IPv4 address, without a zone index.
 */
const RFC2373_IPV6 = new RegExp(
  `^(?:${
    [
      `(?:${H16}:){7}${H16}`,
      `(?:${H16}:){1,7}:`,
      `(?:${H16}:){1,6}:${H16}`,
      `(?:${H16}:){1,5}(?::${H16}){1,2}`,
      `(?:${H16}:){1,4}(?::${H16}){1,3}`,
      `(?:${H16}:){1,3}(?::${H16}){1,4}`,
      `(?:${H16}:){1,2}(?::${H16}){1,5}`,
      `${H16}:(?::${H16}){1,6}`,
      `:(?:(?::${H16}){1,7}|:)`,
      `(?:${H16}:){6}${IPV4}`,
      `(?:${H16}:){1,4}:${IPV4}`,
      `::(?:[fF]{4}(?::0{1,4})?:)?${IPV4}`,
    ].join("|")
  })$`,
);

/** RFC 4122 UUID in the 8-4-4-4-12 hex layout, any version. */
const RFC4122_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** RFC 3986 URI: a scheme, `:` and characters from the RFC's allowed set. */
const RFC3986_URI =
  /^[a-zA-Z][a-zA-Z0-9+.-]*:(?:[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]|%[0-9a-fA-F]{2})*$/;

/** RFC 3986 URI reference: a URI or a relative reference (possibly empty). */
const RFC3986_URI_REFERENCE =
  /^(?:[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]|%[0-9a-fA-F]{2})*$/;

/** RFC 3987 internationalized URI (IRI). */
const RFC3987_IRI =
  /^[a-zA-Z][a-zA-Z0-9+.-]*:(?:[^\s"<>\\^`{|}%\p{Cc}]|%[0-9a-fA-F]{2})*$/u;

/** RFC 3987 internationalized URI reference. */
const RFC3987_IRI_REFERENCE = /^(?:[^\s"<>\\^`{|}%\p{Cc}]|%[0-9a-fA-F]{2})*$/u;

/** RFC 6570 URI template: URI characters and `{expression}` blocks. */
const RFC6570_URI_TEMPLATE =
  /^(?:[^\s"'<>\\^`{|}%\p{Cc}]|%[0-9a-fA-F]{2}|\{[^\s{}]+\})*$/u;

/** RFC 6901 JSON pointer: empty, or `/`-prefixed tokens with `~0` and `~1`. */
const RFC6901_JSON_POINTER = /^(?:\/(?:[^~/]|~[01])*)*$/;

/** Relative JSON pointer: an integer without leading zeros, `#` or a pointer. */
const RELATIVE_JSON_POINTER = /^(?:0|[1-9]\d*)(?:#|(?:\/(?:[^~/]|~[01])*)*)$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidDate(value: string): boolean {
  if (!ISO8601_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function isValidTime(value: string): boolean {
  if (!ISO8601_TIME.test(value)) return false;
  const [hour, minute, second] = value.split(/[Z+-]/)[0].split(":");
  const offset = /[+-](\d{2}):(\d{2})$/.exec(value);
  return Number(hour) <= 23 && Number(minute) <= 59 &&
    Number.parseFloat(second) < 61 &&
    (!offset || (Number(offset[1]) <= 23 && Number(offset[2]) <= 59));
}

function isValidDateTime(value: string): boolean {
  if (!ISO8601_DATETIME.test(value)) return false;
  const [date, time] = value.split("T");
  return isValidDate(date) && isValidTime(time);
}

function isRegex(value: string): boolean {
  try {
    new RegExp(value, "u");
    return true;
  } catch {
    return false;
  }
}

const FORMATS: Readonly<Record<StringFormat, (value: string) => boolean>> = {
  "date-time": isValidDateTime,
  "date": isValidDate,
  "time": isValidTime,
  "duration": (value) => ISO8601_DURATION.test(value),
  "email": (value) => RFC5321_EMAIL.test(value),
  "idn-email": (value) => RFC6531_IDN_EMAIL.test(value),
  "hostname": (value) => RFC1123_HOSTNAME.test(value),
  "idn-hostname": (value) => RFC5890_IDN_HOSTNAME.test(value),
  "ipv4": (value) => RFC2673_IPV4.test(value),
  "ipv6": (value) => RFC2373_IPV6.test(value),
  "uri": (value) => RFC3986_URI.test(value),
  "uri-reference": (value) => RFC3986_URI_REFERENCE.test(value),
  "iri": (value) => RFC3987_IRI.test(value),
  "iri-reference": (value) => RFC3987_IRI_REFERENCE.test(value),
  "uri-template": (value) => RFC6570_URI_TEMPLATE.test(value),
  "uuid": (value) => RFC4122_UUID.test(value),
  "json-pointer": (value) => RFC6901_JSON_POINTER.test(value),
  "relative-json-pointer": (value) => RELATIVE_JSON_POINTER.test(value),
  "regex": isRegex,
};

/**
 * Whether a string is a format that can be asserted.
 *
 * @param format The format name
 * @returns `true` if the format is supported
 */
export function isStringFormat(format: string): format is StringFormat {
  return Object.hasOwn(FORMATS, format);
}

/**
 * Whether a string is in the format.
 *
 * @param value The string to check
 * @param format The format
 * @returns `true` if the string is in the format
 */
export function matchesFormat(value: string, format: StringFormat): boolean {
  return FORMATS[format](value);
}
