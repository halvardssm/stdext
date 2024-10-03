import type { DriverQueryNext } from "./driver.ts";

/**
 * Takes a row object and returns a mapped object
 */
export function getObjectFromRow<
  Output extends Record<string, unknown> = Record<string, unknown>,
  Row extends DriverQueryNext = DriverQueryNext,
>(row: Row): Output {
  const rowObject: Output = {} as Output;

  for (let i = 0; i < row.columns.length; i++) {
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    rowObject[row.columns[i]] = row.values[i];
  }

  return rowObject;
}

/**
 * Takes a row iterable and maps only the values
 */
export async function* mapArrayIterable<
  Output extends Array<unknown> = Array<unknown>,
  Row extends DriverQueryNext = DriverQueryNext,
>(q: AsyncIterable<Row>): AsyncGenerator<Output> {
  for await (const row of q) {
    yield row.values as Output;
  }
}

/**
 * Takes a row iterable and maps an object
 */
export async function* mapObjectIterable<
  Output extends Record<string, unknown> = Record<string, unknown>,
  Row extends DriverQueryNext = DriverQueryNext,
>(q: AsyncIterable<Row>): AsyncGenerator<Output> {
  for await (const row of q) {
    yield getObjectFromRow<Output, Row>(row);
  }
}

// export function getObjectsFromRows<
//   Output extends Record<string, unknown> = Record<string, unknown>,
//   Row extends DriverQueryNext = DriverQueryNext,
// >(rows: Row[]): Output[] {
//   return rows.map(getObjectFromRow<Output, Row>);
// }

// export function getObjectsFromIterable<
//   Output extends Record<string, unknown> = Record<string, unknown>,
//   Row extends DriverQueryNext = DriverQueryNext,
// >(q: AsyncIterable<Row>): Promise<Output[]> {
//   return Array.fromAsync(mapObjectIterable<Output,Row>(q));
// }

// export async function getFirstFromIterable<
//   Row extends DriverQueryNext = DriverQueryNext,
// >(q: AsyncIterable<Row>): Promise<Row | null> {
//   const res = await Array.fromAsync(q);

//   return res[0] ?? null;
// }

// export async function getFirstObjectFromIterable<
//   Output extends Record<string, unknown> = Record<string, unknown>,
//   Row extends DriverQueryNext = DriverQueryNext,
// >(q: AsyncIterable<Row>): Promise<Output | null> {
//   const res = await getFirstFromIterable(q);

//   if (!res) {
//     return null;
//   }

//   return getObjectFromRow<Output, Row>(res);
// }
