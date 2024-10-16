/**
 * Flips a map or object, Record<K, V> will become Record<V, K>
 */
// deno-lint-ignore no-explicit-any
export type FlipMap<T extends Record<keyof T, keyof any>> = {
  [K in keyof T as T[K]]: K;
};

/**
 * Make properties K in T optional
 *
 * @example
 * ```ts
 * type A = { a: string, b: string }
 * type B = PartialBy<A, "b"> // { a: string, b?: string }
 * ```
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make properties K in T required
 *
 * @example
 * ```ts
 * type A = { a?: string, b?: string }
 * type B = RequiredBy<A, "b"> // { a?: string, b: string }
 * ```
 */
export type RequiredBy<T, K extends keyof T> =
  & Omit<T, K>
  & Required<Pick<T, K>>;

/**
 * Make properties K in T required, and the rest partial
 *
 * @example
 * ```ts
 * type A = { a: string, b?: string, c?: string }
 * type B = RequiredPartialBy<A, "b"> // { a?: string, b: string, c?: string }
 * ```
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
 * Gets the values of a Record
 *
 * @example With type
 * ```ts
 * type A = { a: "hello", b: "world" }
 * type B = ValueOf<A> // "hello"|"world"
 * ```
 *
 * @example With object
 * ```ts
 * const a = { a: "hello", b: "world" } as const
 * type B = ValueOf<typeof a> // "hello"|"world"
 * ```
 */
export type ValueOf<T> = T[keyof T];

/**
 * Represents a generic constructor
 *
 * @example As argument
 * ```ts
 * import type { AnyConstructor } from "@stdext/typings";
 *
 * function(SomeClass: AnyConstructor){
 *  const c = new SomeClass()
 * }
 * ```
 *
 * @example For other type
 * ```ts
 * import type { AnyConstructor } from "@stdext/typings";
 *
 * type SomeConstructor = AnyConstructor<SomeClass, [string, SomeOptions]>
 * ```
 */
// deno-lint-ignore no-explicit-any
export type AnyConstructor<T, A extends any[] = any[]> = new (...args: A) => T;
