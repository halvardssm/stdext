/**
 * Flips a map or object, Record<K, V> will become Record<V, K>
 */
// deno-lint-ignore no-explicit-any
export type FlipMap<T extends Record<keyof T, keyof any>> = {
  [K in keyof T as T[K]]: K;
};

/**
 * Make properties K in T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make properties K in T required
 */
export type RequiredBy<T, K extends keyof T> =
  & Omit<T, K>
  & Required<Pick<T, K>>;

/**
 * Make properties K in T required, and the rest partial
 */
export type RequiredPartialBy<T, K extends keyof T> =
  & RequiredBy<
    Pick<T, K>,
    K
  >
  & Partial<Omit<T, K>>;

/**
 * Make properties K in T readonly
 */
export type ReadonlyBy<T, K extends keyof T> =
  & Omit<T, K>
  & Readonly<Pick<T, K>>;

/**
 * Makes an object with readonly properties writable
 */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Make properties K in T writable
 */
export type WriteableBy<T, K extends keyof T> =
  & Omit<T, K>
  & Writeable<Pick<T, K>>;

/**
 * Gets the values of an object
 */
export type ValueOf<T> = T[keyof T];
