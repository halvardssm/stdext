import ffi from "./ffi.ts";
import { fromFileUrl } from "@std/path";
import {
  SQLITE3_DONE,
  SQLITE3_OPEN_CREATE,
  SQLITE3_OPEN_MEMORY,
  SQLITE3_OPEN_READONLY,
  SQLITE3_OPEN_READWRITE,
  SQLITE3_ROW,
  SQLITE_BLOB,
  SQLITE_FLOAT,
  SQLITE_INTEGER,
  SQLITE_STMTSTATUS_AUTOINDEX,
  SQLITE_STMTSTATUS_FILTER_HIT,
  SQLITE_STMTSTATUS_FILTER_MISS,
  SQLITE_STMTSTATUS_FULLSCAN_STEP,
  SQLITE_STMTSTATUS_MEMUSED,
  SQLITE_STMTSTATUS_REPREPARE,
  SQLITE_STMTSTATUS_RUN,
  SQLITE_STMTSTATUS_SORT,
  SQLITE_STMTSTATUS_VM_STEP,
  SQLITE_TEXT,
} from "./constants.ts";
import { readCstr, toCString, unwrap } from "./util.ts";
import {
  type Driver,
  type DriverConnectable,
  type DriverConnectionOptions,
  type DriverInternalOptions,
  type DriverParameterType,
  type DriverQueryMeta,
  type DriverQueryNext,
  type DriverQueryOptions,
  type DriverQueryValues,
  SqlError,
} from "../../sql/mod.ts";
import type { PartialBy } from "@stdext/types";

const {
  sqlite3_open_v2,
  sqlite3_prepare_v2,
  sqlite3_reset,
  sqlite3_clear_bindings,
  sqlite3_step,
  sqlite3_column_count,
  sqlite3_column_type,
  sqlite3_column_value,
  sqlite3_value_subtype,
  sqlite3_column_text,
  sqlite3_finalize,
  sqlite3_column_int64,
  sqlite3_column_double,
  sqlite3_column_blob,
  sqlite3_column_bytes,
  sqlite3_column_name,
  sqlite3_expanded_sql,
  sqlite3_bind_parameter_count,
  sqlite3_bind_int,
  sqlite3_bind_int64,
  sqlite3_bind_text,
  sqlite3_bind_blob,
  sqlite3_bind_double,
  sqlite3_bind_parameter_index,
  sqlite3_sql,
  sqlite3_stmt_readonly,
  sqlite3_bind_parameter_name,
  sqlite3_changes,
  sqlite3_column_int,
  sqlite3_stmt_status,
  sqlite3_close_v2,
} = ffi;

/** Types that can be possibly serialized as SQLite bind values */
export type BindValue =
  | number
  | string
  | symbol
  | bigint
  | boolean
  | null
  | undefined
  | Date
  | Uint8Array
  | BindValue[]
  | { [key: string]: BindValue };

type StmtStatusOp =
  | typeof SQLITE_STMTSTATUS_FULLSCAN_STEP
  | typeof SQLITE_STMTSTATUS_SORT
  | typeof SQLITE_STMTSTATUS_AUTOINDEX
  | typeof SQLITE_STMTSTATUS_VM_STEP
  | typeof SQLITE_STMTSTATUS_REPREPARE
  | typeof SQLITE_STMTSTATUS_RUN
  | typeof SQLITE_STMTSTATUS_FILTER_MISS
  | typeof SQLITE_STMTSTATUS_FILTER_HIT
  | typeof SQLITE_STMTSTATUS_MEMUSED;

export type BindParameters = BindValue[] | Record<string, BindValue>;
export type RestBindParameters = BindValue[] | [BindParameters];

/** Maps sqlite_stmt* pointers to sqlite* db pointers. */
export const STATEMENTS_TO_DB = new Map<Deno.PointerValue, Deno.PointerValue>();

const emptyStringBuffer = new Uint8Array(1);

const statementFinalizer = new FinalizationRegistry(
  (ptr: Deno.PointerValue) => {
    if (STATEMENTS_TO_DB.has(ptr)) {
      sqlite3_finalize(ptr);
      STATEMENTS_TO_DB.delete(ptr);
    }
  },
);

// https://github.com/sqlite/sqlite/blob/195611d8e6fc0bba559a49e91e6ceb42e4bdd6ba/src/json.c#L125-L126
const JSON_SUBTYPE = 74;

const BIG_MAX = BigInt(Number.MAX_SAFE_INTEGER);

type ColumnType = string | number | null | bigint | Uint8Array;

/** Types that can be possibly serialized as SQLite bind values */
export type ParameterType =
  | number
  | string
  | symbol
  | bigint
  | boolean
  | null
  | undefined
  | Date
  | Uint8Array;
// | ParameterType[]
// | { [key: string]: ParameterType };

export type SQLiteDriverParameterType = DriverParameterType<ParameterType>;
export type SQLiteDriverQueryValues = DriverQueryValues<Array<ColumnType>>;

export interface SQLiteDriverQueryMeta extends DriverQueryMeta {}

export interface SQLiteDriverConnectionOptions extends DriverConnectionOptions {
  /** Whether to open database only in read-only mode. By default, this is false. */
  readonly?: boolean;
  /** Whether to create a new database file at specified path if one does not exist already. By default this is true. */
  create?: boolean;
  /** Raw SQLite C API flags. Specifying this ignores all other options. */
  flags?: number;
  /** Opens an in-memory database. */
  memory?: boolean;
  /** Whether to support BigInt columns. False by default, integers larger than 32 bit will be inaccurate. */
  int64?: boolean;
  /** Apply agressive optimizations that are not possible with concurrent clients. */
  unsafeConcurrency?: boolean;
  /** Enable or disable extension loading */
  enableLoadExtension?: boolean;
  /** Whether to parse JSON columns as JS objects. True by default. */
  parseJson?: boolean;
}

export interface SQLiteDriverQueryOptions extends DriverQueryOptions {}
export type SQLiteDriverInternalOptions = DriverInternalOptions<
  SQLiteDriverConnectionOptions,
  SQLiteDriverQueryOptions
>;
export type SQLiteDriverOptions = PartialBy<
  SQLiteDriverInternalOptions,
  "connectionOptions" | "queryOptions"
>;

/**
 * Represents a SQLite3 database connection.
 *
 * Example:
 * ```ts
 * // Open a database from file, creates if doesn't exist.
 * const db = new SQLiteDriver("myfile.db");
 *
 * // Open an in-memory database.
 * const db = new SQLiteDriver(":memory:");
 *
 * // Open a read-only database.
 * const db = new SQLiteDriver("myfile.db", { readonly: true });
 *
 * // Or open using File URL
 * const db = new SQLiteDriver(new URL("./myfile.db", import.meta.url));
 * ```
 */
export class SQLiteDriver implements
  Driver<
    SQLiteDriverConnectionOptions,
    SQLiteDriverQueryOptions
  > {
  readonly connectionUrl: string;
  readonly options: SQLiteDriverInternalOptions;

  #handle: Deno.PointerValue | null = null;
  #flags: number;

  get connected(): boolean {
    return !!this.#handle;
  }

  /** Unsafe Raw (pointer) to the sqlite object */
  get handle(): Deno.PointerValue {
    if (!this.connected) throw new SqlError("SQLiteDriver is not connected");
    return this.#handle;
  }

  get unsafeConcurrency(): boolean {
    return this.options.connectionOptions.unsafeConcurrency ?? false;
  }
  get int64(): boolean {
    return this.options.connectionOptions.unsafeConcurrency ?? false;
  }
  get parseJson(): boolean {
    return this.options.connectionOptions.parseJson ?? true;
  }

  constructor(connectionUrl: string | URL, options: SQLiteDriverOptions = {}) {
    this.connectionUrl = connectionUrl instanceof URL
      ? fromFileUrl(connectionUrl)
      : connectionUrl;

    this.options = {
      connectionOptions: options.connectionOptions ?? {},
      queryOptions: options.queryOptions ?? {},
    };

    this.#flags = 0;

    if (this.options.connectionOptions.flags !== undefined) {
      this.#flags = this.options.connectionOptions.flags;
    } else {
      if (this.options.connectionOptions.memory) {
        this.#flags |= SQLITE3_OPEN_MEMORY;
      }

      if (this.options.connectionOptions.readonly ?? false) {
        this.#flags |= SQLITE3_OPEN_READONLY;
      } else {
        this.#flags |= SQLITE3_OPEN_READWRITE;
      }

      if (
        (this.options.connectionOptions.create ?? true) &&
        !this.options.connectionOptions.readonly
      ) {
        this.#flags |= SQLITE3_OPEN_CREATE;
      }
    }
  }

  connect(): Promise<void> {
    const pHandle = new BigUint64Array(1);
    const result = sqlite3_open_v2(
      toCString(this.connectionUrl),
      pHandle,
      this.#flags,
      null,
    );
    this.#handle = Deno.UnsafePointer.create(pHandle[0]);
    if (result !== 0) sqlite3_close_v2(this.handle);
    unwrap(result);

    return Promise.resolve();
  }

  ping(): Promise<void> {
    if (!this.connected) {
      throw new SqlError("SQLiteDriver not connected");
    }

    return Promise.resolve();
  }

  prepare() {
    const pHandle = new BigUint64Array(1);
    const cString = toCString(sql);
    unwrap(
      sqlite3_prepare_v2(
        this.handle,
        cString,
        cString.byteLength,
        pHandle,
        null,
      ),
      this.handle,
    );
    const preparedStatementHandle = Deno.UnsafePointer.create(pHandle[0]);
    STATEMENTS_TO_DB.set(preparedStatementHandle, this.handle);
    this.#finalizerToken = { handle: preparedStatementHandle };
    statementFinalizer.register(
      this,
      preparedStatementHandle,
      this.#finalizerToken,
    );

    this.#bindParameterCount = sqlite3_bind_parameter_count(
      preparedStatementHandle,
    );
  }

  async *query<
    Values extends SQLiteDriverQueryValues = SQLiteDriverQueryValues,
    Meta extends SQLiteDriverQueryMeta = SQLiteDriverQueryMeta,
  >(
    sql: string,
    params: SQLiteDriverParameterType[] = [],
    _options?: SQLiteDriverQueryOptions,
  ): AsyncGenerator<DriverQueryNext<Values, Meta>> {
    // const pHandle = new BigUint64Array(1);
    // const cString = toCString(sql);
    // unwrap(
    // 	sqlite3_prepare_v2(
    // 		this.handle,
    // 		cString,
    // 		cString.byteLength,
    // 		pHandle,
    // 		null,
    // 	),
    // 	this.handle,
    // );
    // const preparedStatementHandle = Deno.UnsafePointer.create(pHandle[0]);
    // STATEMENTS_TO_DB.set(preparedStatementHandle, this.handle);
    // this.#finalizerToken = { handle: preparedStatementHandle };
    // statementFinalizer.register(
    // 	this,
    // 	preparedStatementHandle,
    // 	this.#finalizerToken,
    // );

    // this.#bindParameterCount = sqlite3_bind_parameter_count(
    // 	preparedStatementHandle,
    // );

    // asdf

    this.#begin();

    if (params.length) {
      this.#bindAll(params);
    }

    const columnNames = this.columnNames();

    const getRowArray = (
      h: Deno.PointerValue,
      int64: boolean,
      parseJson: boolean,
    ) => {
      return Array.from(Array(columnNames.length)).map((_, i) =>
        this.getColumn(h, i, int64, parseJson)
      );
    };

    let status = sqlite3_step(this.handle);

    while (status === SQLITE3_ROW) {
      const row = getRowArray(this.handle, this.int64, this.parseJson);
      yield {
        columns: columnNames,
        values: row,
        meta: {},
      };
      status = sqlite3_step(this.handle);
    }

    if (this.hasArgs && !this.#bound && params.length) {
      this.#bindRefs.clear();
    }
    if (status !== SQLITE3_DONE) {
      unwrap(status, this.handle);
    }
    sqlite3_reset(this.handle);
  }

  close(): Promise<void> {
    if (!this.connected) return Promise.resolve();

    for (const [stmt, db] of STATEMENTS_TO_DB) {
      if (db === this.#handle) {
        sqlite3_finalize(stmt);
        STATEMENTS_TO_DB.delete(stmt);
      }
    }

    unwrap(sqlite3_close_v2(this.#handle));

    this.#handle = null;

    return Promise.resolve();
  }

  [Symbol.for("Deno.customInspect")](): string {
    return `SQLiteDriver { path: ${this.connectionUrl} }`;
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  getColumn(
    handle: Deno.PointerValue,
    i: number,
    int64: boolean,
    parseJson: boolean,
  ): ColumnType {
    const ty = sqlite3_column_type(handle, i);

    if (ty === SQLITE_INTEGER && !int64) return sqlite3_column_int(handle, i);

    switch (ty) {
      case SQLITE_TEXT: {
        const ptr = sqlite3_column_text(handle, i);
        if (ptr === null) return null;
        const text = readCstr(ptr, 0);
        const value = sqlite3_column_value(handle, i);
        const subtype = sqlite3_value_subtype(value);
        if (subtype === JSON_SUBTYPE && parseJson) {
          try {
            return JSON.parse(text);
          } catch (_error) {
            return text;
          }
        }
        return text;
      }

      case SQLITE_INTEGER: {
        const val = sqlite3_column_int64(handle, i);
        if (val < -BIG_MAX || val > BIG_MAX) {
          return val;
        }
        return Number(val);
      }

      case SQLITE_FLOAT: {
        return sqlite3_column_double(handle, i);
      }

      case SQLITE_BLOB: {
        const ptr = sqlite3_column_blob(handle, i);

        if (ptr === null) {
          return new Uint8Array();
        }

        const bytes = sqlite3_column_bytes(handle, i);
        return new Uint8Array(
          Deno.UnsafePointerView.getArrayBuffer(ptr, bytes).slice(0),
        );
      }

      default: {
        return null;
      }
    }
  }

  #finalizerToken: { handle: Deno.PointerValue };
  #bound = false;
  #unsafeConcurrency: boolean = false;

  #bindParameterCount: number;

  #bindRefs: Set<any> = new Set();

  #columnNames: string[] | undefined;

  get hasArgs(): boolean {
    return !!this.#bindParameterCount;
  }

  /** SQL string including bindings */
  get expandedSql(): string {
    return readCstr(sqlite3_expanded_sql(this.handle)!);
  }

  /** The SQL string that we passed when creating statement */
  get sql(): string {
    return readCstr(sqlite3_sql(this.handle)!);
  }

  /** Whether this statement doesn't make any direct changes to the DB */
  get readonly(): boolean {
    return sqlite3_stmt_readonly(this.handle) !== 0;
  }
  /** Number of parameters (to be) bound */
  get bindParameterCount(): number {
    return this.#bindParameterCount;
  }

  /** Get bind parameter name by index */
  bindParameterName(i: number): string {
    return readCstr(sqlite3_bind_parameter_name(this.handle, i)!);
  }

  /** Get bind parameter index by name */
  bindParameterIndex(name: string): number {
    if (name[0] !== ":" && name[0] !== "@" && name[0] !== "$") {
      name = ":" + name;
    }
    return sqlite3_bind_parameter_index(this.handle, toCString(name));
  }

  #begin(): void {
    sqlite3_reset(this.handle);
    if (!this.#bound && this.hasArgs) {
      sqlite3_clear_bindings(this.handle);
      this.#bindRefs.clear();
    }
  }

  /**
   * Bind parameters to the statement. This method can only be called once
   * to set the parameters to be same throughout the statement. You cannot
   * change the parameters after this method is called.
   *
   * This method is merely just for optimization to avoid binding parameters
   * each time in prepared statement.
   */
  bind(...params: RestBindParameters): this {
    this.#bindAll(params);
    this.#bound = true;
    return this;
  }

  #bindAll(params: RestBindParameters | BindParameters): void {
    if (this.#bound) throw new Error("Statement already bound to values");
    if (
      typeof params[0] === "object" &&
      params[0] !== null &&
      !(params[0] instanceof Uint8Array) &&
      !(params[0] instanceof Date)
    ) {
      params = params[0];
    }
    if (Array.isArray(params)) {
      for (let i = 0; i < params.length; i++) {
        this.#bind(i, (params as BindValue[])[i]);
      }
    } else {
      for (const [name, param] of Object.entries(params)) {
        const i = this.bindParameterIndex(name);
        if (i === 0) {
          throw new Error(`No such parameter "${name}"`);
        }
        this.#bind(i - 1, param as BindValue);
      }
    }
  }

  #bind(i: number, param: BindValue): void {
    switch (typeof param) {
      case "number": {
        if (Number.isInteger(param)) {
          if (
            Number.isSafeInteger(param) &&
            param >= -(2 ** 31) &&
            param < 2 ** 31
          ) {
            unwrap(sqlite3_bind_int(this.handle, i + 1, param));
          } else {
            unwrap(sqlite3_bind_int64(this.handle, i + 1, BigInt(param)));
          }
        } else {
          unwrap(sqlite3_bind_double(this.handle, i + 1, param));
        }
        break;
      }
      case "string": {
        if (param === "") {
          // Empty string is encoded as empty buffer in Deno. And as of
          // right now (Deno 1.29.1), ffi layer converts it to NULL pointer,
          // which causes sqlite3_bind_text to bind the NULL value instead
          // of an empty string. As a workaround let's use a special
          // non-empty buffer, but specify zero length.
          unwrap(
            sqlite3_bind_text(this.handle, i + 1, emptyStringBuffer, 0, null),
          );
        } else {
          const str = new TextEncoder().encode(param);
          this.#bindRefs.add(str);
          unwrap(
            sqlite3_bind_text(this.handle, i + 1, str, str.byteLength, null),
          );
        }
        break;
      }
      case "object": {
        if (param === null) {
          // pass
        } else if (param instanceof Uint8Array) {
          this.#bindRefs.add(param);
          unwrap(
            sqlite3_bind_blob(
              this.handle,
              i + 1,
              param.byteLength === 0
                ? emptyStringBuffer
                : (param as BufferSource),
              param.byteLength,
              null,
            ),
          );
        } else if (param instanceof Date) {
          const cstring = toCString(param.toISOString());
          this.#bindRefs.add(cstring);
          unwrap(sqlite3_bind_text(this.handle, i + 1, cstring, -1, null));
        } else {
          const cstring = toCString(JSON.stringify(param));
          this.#bindRefs.add(cstring);
          unwrap(sqlite3_bind_text(this.handle, i + 1, cstring, -1, null));
        }
        break;
      }

      case "bigint": {
        unwrap(sqlite3_bind_int64(this.handle, i + 1, param));
        break;
      }

      case "boolean":
        unwrap(sqlite3_bind_int(this.handle, i + 1, param ? 1 : 0));
        break;

      case "undefined":
        // pass
        break;

      default: {
        throw new Error(`Value of unsupported type: ${Deno.inspect(param)}`);
      }
    }
  }

  getRowObject(): (
    h: Deno.PointerValue,
    int64: boolean,
    parseJson: boolean,
  ) => Record<string, ColumnType> {
    if (!this.#rowObjectFn || !this.#unsafeConcurrency) {
      const columnNames = this.columnNames();
      this.#rowObjectFn = (
        h: Deno.PointerValue,
        int64: boolean,
        parseJson: boolean,
      ) =>
        columnNames.reduce(
          (prev, curr, i) => {
            prev[curr] = this.getColumn(h, i, int64, parseJson);
            return prev;
          },
          {} as Record<string, ColumnType>,
        );
    }

    return this.#rowObjectFn;
  }

  columnNames(): string[] {
    if (!this.#columnNames || !this.#unsafeConcurrency) {
      const columnCount = sqlite3_column_count(this.handle);
      const columnNames = new Array(columnCount);
      for (let i = 0; i < columnCount; i++) {
        columnNames[i] = readCstr(sqlite3_column_name(this.handle, i)!);
      }
      this.#columnNames = columnNames;
    }
    return this.#columnNames!;
  }

  #status(op: StmtStatusOp, reset?: boolean): number {
    return sqlite3_stmt_status(this.handle, op, reset ? 1 : 0);
  }

  /** This is the number of times that SQLite has stepped forward in a table as part of a full table scan.
   * Large numbers for this counter may indicate opportunities for performance improvement through careful use of indices. */
  statusFullscanStep(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_FULLSCAN_STEP, reset);
  }

  /** This is the number of sort operations that have occurred.
   * A non-zero value in this counter may indicate an opportunity to improve performance through careful use of indices. */
  statusSort(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_SORT, reset);
  }

  /** This is the number of rows inserted into transient indices that were created automatically in order to help joins run faster.
   * A non-zero value in this counter may indicate an opportunity to improve performance by adding permanent indices that do not need to be reinitialized each time the statement is run. */
  statusAutoindex(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_AUTOINDEX, reset);
  }

  /** This is the number of virtual machine operations executed by the prepared statement if that number is less than or equal to 2147483647.
   * The number of virtual machine operations can be used as a proxy for the total work done by the prepared statement.
   * If the number of virtual machine operations exceeds 2147483647 then the value returned by this statement status code is undefined. */
  statusVmStep(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_VM_STEP, reset);
  }

  /** This is the number of times that the prepare statement has been automatically regenerated due to schema changes or changes to bound parameters that might affect the query plan. */
  statusReprepare(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_REPREPARE, reset);
  }

  /** This is the number of times that the prepared statement has been run.
   * A single "run" for the purposes of this counter is one or more calls to sqlite3_step() followed by a call to sqlite3_reset().
   * The counter is incremented on the first sqlite3_step() call of each cycle. */
  statusRun(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_RUN, reset);
  }

  /** This is the number of times that a join step was bypassed because a Bloom filter returned not-found. */
  statusFilterMiss(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_FILTER_MISS, reset);
  }

  /** The corresponding SQLITE_STMTSTATUS_FILTER_MISS value is the number of times that the Bloom filter returned a find,
   * and thus the join step had to be processed as normal. */
  statusFilterHit(reset?: boolean): number {
    return this.#status(SQLITE_STMTSTATUS_FILTER_HIT, reset);
  }

  /** This is the approximate number of bytes of heap memory used to store the prepared statement.
   * This value is not actually a counter. */
  statusMemused(): number {
    return this.#status(SQLITE_STMTSTATUS_MEMUSED);
  }

  /** Free up the statement object. */
  finalize(): void {
    if (!STATEMENTS_TO_DB.has(this.handle)) return;
    this.#bindRefs.clear();
    statementFinalizer.unregister(this.#finalizerToken);
    STATEMENTS_TO_DB.delete(this.handle);
    unwrap(sqlite3_finalize(this.handle));
  }

  /** Coerces the statement to a string, which in this case is expanded SQL. */
  toString(): string {
    return readCstr(sqlite3_expanded_sql(this.handle)!);
  }

  /** Iterate over resultant rows from query. */
  *iter(...params: RestBindParameters): IterableIterator<any> {
    this.#begin();
    this.#bindAll(params);
    const getRowObject = this.getRowObject();

    let status = sqlite3_step(this.handle);
    while (status === SQLITE3_ROW) {
      yield getRowObject(this.handle, this.int64, this.parseJson);
      status = sqlite3_step(this.handle);
    }
    if (status !== SQLITE3_DONE) {
      unwrap(status, this.handle);
    }
    sqlite3_reset(this.handle);
  }

  [Symbol.iterator](): IterableIterator<any> {
    return this.iter();
  }

  [Symbol.dispose](): void {
    this.finalize();
  }

  [Symbol.for("Deno.customInspect")](): string {
    return `Statement { ${this.expandedSql} }`;
  }

  // /** Simply run the query without retrieving any output there may be. */
  // run(...params: RestBindParameters): number {
  //   const handle = this.#handle;
  //   this.#begin();
  //   if (this.hasArgs) {
  //     this.#bindAll(params);
  //   }
  //   const status = sqlite3_step(handle);
  //   if (this.hasArgs && !this.#bound && params.length) {
  //     this.#bindRefs.clear();
  //   }
  //   if (status !== SQLITE3_ROW && status !== SQLITE3_DONE) {
  //     unwrap(status, this.driver.handle);
  //   }
  //   sqlite3_reset(handle);
  //   return sqlite3_changes(this.driver.handle);
  // }

  // /**
  //  * Run the query and return the resulting rows where rows are array of columns.
  //  */
  // values<T extends ColumnType[] = ColumnType[]>(
  //   ...params: RestBindParameters
  // ): T[] {
  //   const handle = this.#handle;
  //   this.#begin();
  //   if (this.hasArgs) {
  //     this.#bindAll(params);
  //   }

  //   const columnCount = sqlite3_column_count(handle);
  //   const result: T[] = [];
  //   const getRowArray = (
  //     h: Deno.PointerValue,
  //     int64: boolean,
  //     parseJson: boolean,
  //   ) => {
  //     return Array.from(Array(columnCount)).map((_, i) =>
  //       this.getColumn(h, i, int64, parseJson)
  //     ) as T;
  //   };
  //   let status = sqlite3_step(handle);
  //   while (status === SQLITE3_ROW) {
  //     result.push(
  //       getRowArray(
  //         handle,
  //         this.int64 ?? this.driver.int64,
  //         this.parseJson ?? this.driver.parseJson,
  //       ),
  //     );
  //     status = sqlite3_step(handle);
  //   }
  //   if (this.hasArgs && !this.#bound && params.length) {
  //     this.#bindRefs.clear();
  //   }
  //   if (status !== SQLITE3_DONE) {
  //     unwrap(status, this.driver.handle);
  //   }
  //   sqlite3_reset(handle);
  //   return result;
  // }

  // /**
  //  * Run the query and return the resulting rows where rows are objects
  //  * mapping column name to their corresponding values.
  //  */
  // all<T extends Record<string, ColumnType> = Record<string, ColumnType>>(
  //   ...params: RestBindParameters
  // ): T[] {
  //   const handle = this.#handle;
  //   const int64 = this.int64 ?? this.driver.int64;
  //   const parseJson = this.parseJson ?? this.driver.parseJson;
  //   this.#begin();
  //   if (this.hasArgs) {
  //     this.#bindAll(params);
  //   }
  //   const getRowObject = this.getRowObject();
  //   const result: T[] = [];
  //   let status = sqlite3_step(handle);
  //   while (status === SQLITE3_ROW) {
  //     result.push(getRowObject(handle, int64, parseJson) as T);
  //     status = sqlite3_step(handle);
  //   }
  //   if (this.hasArgs && !this.#bound && params.length) {
  //     this.#bindRefs.clear();
  //   }
  //   if (status !== SQLITE3_DONE) {
  //     unwrap(status, this.driver.handle);
  //   }
  //   sqlite3_reset(handle);
  //   return result as T[];
  // }

  // /** Fetch only first row as an array, if any. */
  // value<T extends Array<unknown>>(
  //   ...params: RestBindParameters
  // ): T | undefined {
  //   const handle = this.#handle;
  //   const arr = new Array(sqlite3_column_count(handle));
  //   sqlite3_reset(handle);

  //   if (this.hasArgs && !this.#bound) {
  //     sqlite3_clear_bindings(handle);
  //     this.#bindRefs.clear();
  //     if (params.length) {
  //       this.#bindAll(params);
  //     }
  //   }

  //   const status = sqlite3_step(handle);

  //   if (this.hasArgs && !this.#bound && params.length) {
  //     this.#bindRefs.clear();
  //   }

  //   if (status === SQLITE3_ROW) {
  //     for (let i = 0; i < arr.length; i++) {
  //       arr[i] = this.getColumn(handle, i, this.int64, this.parseJson);
  //     }
  //     sqlite3_reset(this.#handle);
  //     return arr as T;
  //   } else if (status === SQLITE3_DONE) {
  //     return;
  //   } else {
  //     unwrap(status, this.driver.handle);
  //   }
  // }

  // /** Fetch only first row as an object, if any. */
  // get<T extends Record<string, ColumnType> = Record<string, ColumnType>>(
  //   ...params: RestBindParameters
  // ): T | undefined {
  //   const handle = this.#handle;
  //   const columnNames = this.columnNames();

  //   const row: Record<string, unknown> = {};
  //   sqlite3_reset(handle);

  //   if (this.hasArgs && !this.#bound) {
  //     sqlite3_clear_bindings(handle);
  //     this.#bindRefs.clear();
  //     if (params.length) {
  //       this.#bindAll(params);
  //     }
  //   }

  //   const status = sqlite3_step(handle);

  //   if (this.hasArgs && !this.#bound && params.length) {
  //     this.#bindRefs.clear();
  //   }

  //   if (status === SQLITE3_ROW) {
  //     for (let i = 0; i < columnNames.length; i++) {
  //       row[columnNames[i]] = this.getColumn(handle, i, this.int64, this.parseJson);
  //     }
  //     sqlite3_reset(this.#handle);
  //     return row as T;
  //   } else if (status === SQLITE3_DONE) {
  //     return;
  //   } else {
  //     unwrap(status, this.driver.handle);
  //   }
  // }
}

export class SQLiteDriverConnectable implements
  DriverConnectable<
    SQLiteDriverConnectionOptions,
    SQLiteDriverQueryOptions,
    SQLiteDriverParameterType,
    SQLiteDriverQueryValues,
    SQLiteDriverQueryMeta,
    SQLiteDriver
  > {
  readonly options: SQLiteDriver["options"];
  readonly connection: SQLiteDriver;

  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: SQLiteDriverConnectable["connection"],
    options: SQLiteDriverConnectable["options"],
  ) {
    this.connection = connection;
    this.options = options;
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.connection.close();
  }
}
