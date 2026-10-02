import type { ResultIterableContext, ResultObject } from "./core.ts";

/**
 * Row
 *
 * A single row as returned by a database driver, before it is mapped to a
 * record. This is the low-level row protocol that drivers use to construct a
 * {@linkcode ResultIterableContext} with {@linkcode createResultIterableContext}.
 */
export interface Row {
  /**
   * The column names, in the same order as the values
   */
  columns: string[];
  /**
   * The values, in the same order as the columns
   */
  values: unknown[];
  /**
   * Additional information about the row, such as the column types. The
   * content depends on the driver and database.
   */
  meta?: Record<string, unknown>;
}

/**
 * Map a single {@linkcode Row} to a record mapping column names to values.
 *
 * If there are more columns than values, the missing values are `undefined`.
 * If there are more values than columns, the extra values are ignored.
 *
 * @param row the row to map
 *
 * @example
 * ```ts
 * import { getObjectFromRow } from "@stdext/database/sql";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   getObjectFromRow({ columns: ["a", "b"], values: ["c", 1] }),
 *   { a: "c", b: 1 },
 * );
 * ```
 */
export function getObjectFromRow(row: Row): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const { columns, values } = row;
  for (let i = 0; i < columns.length; i++) {
    record[columns[i]] = values[i];
  }
  return record;
}

/**
 * Create a {@linkcode ResultIterableContext} from a stream of
 * {@linkcode Row}s. This is a helper for driver authors implementing the
 * return value of the query methods.
 *
 * Rows are buffered as they are lazily fetched, so the context can be
 * iterated and collected in any combination: rows already fetched are
 * replayed from the buffer, and the collect methods drain any remaining
 * rows. Note that the buffered rows are kept in memory, so for a massive
 * amount of rows, iterate the context once instead of collecting it.
 *
 * The context is asynchronously disposable: disposing stops fetching, and
 * rows already fetched remain buffered and can still be replayed.
 *
 * The first row is consumed to resolve the columns of the
 * {@linkcode ResultIterableContext.metadata}, so the returned context is
 * available as soon as the first row arrives. When there are no rows, the
 * metadata columns are empty.
 *
 * @param rows the rows returned by the database
 * @returns the result context
 *
 * @example
 * ```ts
 * import { createResultIterableContext } from "@stdext/database/sql";
 *
 * async function* rows() {
 *   yield { columns: ["a"], values: ["b"] };
 * }
 *
 * const ctx = await createResultIterableContext(rows());
 * for await (const row of ctx) {
 *   console.log(row.toRecord());
 * }
 * console.log(await ctx.toRecords());
 * ```
 */
export async function createResultIterableContext(
  rows: AsyncIterable<Row>,
): Promise<ResultIterableContext> {
  const source = rows[Symbol.asyncIterator]();

  // Rows are buffered as they are fetched, so the context can be iterated
  // and collected in any combination.
  const buffer: ResultObject[] = [];
  let done = false;
  let columns: string[] = [];

  async function next(): Promise<IteratorResult<Row>> {
    const result = await source.next();
    if (result.done) {
      done = true;
    } else if (columns.length === 0) {
      columns = result.value.columns;
    }
    return result;
  }

  async function* iterate(): AsyncGenerator<ResultObject> {
    for (let i = 0;; i++) {
      if (i < buffer.length) {
        yield buffer[i];
        continue;
      }
      if (done) return;
      const result = await next();
      if (result.done) return;
      const row = result.value;
      const object: ResultObject = {
        values: row.values,
        toRecord: () => getObjectFromRow(row),
      };
      buffer.push(object);
      yield object;
    }
  }

  async function collect<T>(
    mapper: (row: ResultObject) => T,
  ): Promise<T[]> {
    const values: T[] = [];
    for await (const row of iterate()) {
      values.push(mapper(row));
    }
    return values;
  }

  // The first row is primed into the buffer so that the columns in the
  // metadata are known when the context is returned.
  const first = await next();
  if (!first.done) {
    const row = first.value;
    buffer.push({
      values: row.values,
      toRecord: () => getObjectFromRow(row),
    });
  }

  return {
    metadata: { columns },
    async *[Symbol.asyncIterator]() {
      yield* iterate();
    },
    async [Symbol.asyncDispose](): Promise<void> {
      // Stops fetching further rows. Rows already fetched remain in the
      // buffer and can still be replayed.
      done = true;
      await source.return?.(undefined);
    },
    toValues: () => collect((row) => row.values),
    toRecords: () => collect((row) => row.toRecord()),
    toRecord: (values) => getObjectFromRow({ columns, values }),
  };
}
