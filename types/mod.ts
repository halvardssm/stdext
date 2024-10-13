/**
 * Flips a map or object, Record<K, V> will become Record<V, K>
 */
// deno-lint-ignore no-explicit-any
export type FlipMap<T extends Record<keyof T, keyof any>> = {
  [K in keyof T as T[K]]: K;
};

/**
 * Makes an object with readonly properties writable
 */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Gets the values of an object
 */
export type ValueOf<T> = T[keyof T];
