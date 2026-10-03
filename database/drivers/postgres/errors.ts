import { ConnectionError, QueryError } from "../../sql/mod.ts";
import type { BodyReader } from "./_wire.ts";

/**
 * PostgresErrorFields
 *
 * The fields of an error reported by the Postgres server, carried by
 * {@linkcode PostgresQueryError} and {@linkcode PostgresConnectionError} as
 * their `fields`.
 *
 * @example
 * ```ts ignore
 * import { PostgresQueryError } from "@stdext/database/drivers/postgres";
 *
 * try {
 *   await client.execute("SELECT * FROM missing_table");
 * } catch (error) {
 *   if (error instanceof PostgresQueryError) {
 *     console.log(error.fields.code); // "42P01": undefined table
 *     console.log(error.fields.severity); // "ERROR"
 *   }
 * }
 * ```
 *
 * @see https://www.postgresql.org/docs/current/protocol-error-fields.html
 */
export interface PostgresErrorFields {
  /** The severity, such as `ERROR` or `FATAL` */
  severity: string;
  /** The SQLSTATE code */
  code: string;
  /** The primary error message */
  message: string;
  /** An optional secondary message with more detail */
  detail?: string;
  /** An optional suggestion on what to do about the problem */
  hint?: string;
  /** The 1-based character position of the error in the query */
  position?: string;
  /** The position in an internally generated query */
  internalPosition?: string;
  /** The internally generated query */
  internalQuery?: string;
  /** The context in which the error occurred */
  where?: string;
  /** The schema name associated with the error */
  schema?: string;
  /** The table name associated with the error */
  table?: string;
  /** The column name associated with the error */
  column?: string;
  /** The data type name associated with the error */
  dataType?: string;
  /** The constraint name associated with the error */
  constraint?: string;
  /** The source file of the server where the error was reported */
  file?: string;
  /** The source line of the server where the error was reported */
  line?: string;
  /** The source routine of the server where the error was reported */
  routine?: string;
}

const FIELDS: Record<string, keyof PostgresErrorFields> = {
  V: "severity",
  C: "code",
  M: "message",
  D: "detail",
  H: "hint",
  P: "position",
  p: "internalPosition",
  q: "internalQuery",
  W: "where",
  s: "schema",
  t: "table",
  c: "column",
  d: "dataType",
  n: "constraint",
  F: "file",
  L: "line",
  R: "routine",
};

/**
 * PostgresQueryError
 *
 * A query error reported by the Postgres server, such as a syntax error or a
 * constraint violation. The fields reported by the server, such as the
 * SQLSTATE code, are available as {@linkcode PostgresQueryError.fields}.
 *
 * @example
 * ```ts
 * import { PostgresQueryError } from "@stdext/database/drivers/postgres";
 *
 * const error = new PostgresQueryError({
 *   severity: "ERROR",
 *   code: "42P01",
 *   message: 'relation "missing_table" does not exist',
 * });
 * console.log(error.message); // relation "missing_table" does not exist
 * console.log(error.code); // "42P01"
 * ```
 */
export class PostgresQueryError extends QueryError {
  /** The error fields reported by the server */
  readonly fields: PostgresErrorFields;

  constructor(fields: PostgresErrorFields) {
    super(fields.message);
    this.fields = fields;
  }

  /** The SQLSTATE code */
  get code(): string {
    return this.fields.code;
  }
}

/**
 * PostgresConnectionError
 *
 * A connection error reported by the Postgres server, such as an
 * authentication failure. The fields reported by the server, such as the
 * SQLSTATE code, are available as
 * {@linkcode PostgresConnectionError.fields}.
 *
 * @example
 * ```ts
 * import { PostgresConnectionError } from "@stdext/database/drivers/postgres";
 *
 * const error = new PostgresConnectionError({
 *   severity: "FATAL",
 *   code: "28P01",
 *   message: 'password authentication failed for user "user"',
 * });
 * console.log(error.code); // "28P01": invalid password
 * ```
 */
export class PostgresConnectionError extends ConnectionError {
  /** The error fields reported by the server */
  readonly fields: PostgresErrorFields;

  constructor(fields: PostgresErrorFields) {
    super(fields.message);
    this.fields = fields;
  }

  /** The SQLSTATE code */
  get code(): string {
    return this.fields.code;
  }
}

/**
 * Parse the fields of an ErrorResponse or NoticeResponse body into a
 * {@linkcode PostgresErrorFields}. Used by the driver to create
 * {@linkcode createError} instances.
 *
 * @param body the body of the response, positioned at the first field
 */
export function parseErrorFields(body: BodyReader): PostgresErrorFields {
  const fields: Partial<PostgresErrorFields> = {};
  let localizedSeverity = "";
  while (true) {
    const type = body.int8();
    if (type === 0) break;
    const key = String.fromCharCode(type);
    const value = body.cstring();
    if (key === "S") localizedSeverity = value;
    else if (FIELDS[key]) fields[FIELDS[key]] = value;
  }
  fields.severity ??= localizedSeverity;
  fields.code ??= "";
  fields.message ??= "";
  return fields as PostgresErrorFields;
}

/**
 * Create the error for an ErrorResponse. Connection exceptions (class 08),
 * authorization failures (class 28) and operator interventions such as a
 * server shutdown (57P) are connection errors, all others are query errors.
 */
export function createError(
  body: BodyReader,
): PostgresQueryError | PostgresConnectionError {
  const fields = parseErrorFields(body);
  if (/^(08|28|57P)/.test(fields.code)) {
    return new PostgresConnectionError(fields);
  }
  return new PostgresQueryError(fields);
}
