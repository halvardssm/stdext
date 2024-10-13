/**
 * The token object
 */
export type StringTokenizerToken<Type = string, Value = string> = {
  /**
   * A token type
   */
  type: Type;
  /**
   * The token value
   */
  value: Value;
  /**
   * The index where the token starts
   */
  index: number;
};

/**
 * Key for the matcher, takes a string, regex or a function
 */
export type StringTokenizerKeyMatcher =
  | string
  | RegExp
  | ((value: string, index: number) => boolean);

/**
 * The return type can be either a token or an touple with the token as the
 * first value andthe amount to increment the index with as the second argument
 *
 * @example token
 * ```ts
 * { type: "someType", value: "a", index: 5 }
 * ```
 *
 * @example tuple with token and index, index will be incremented by 3
 * ```ts
 * [{ type: "someType", value: "abc", index: 5 }, 3]
 * ```
 */
export type StringTokenizerHandlerReturnType<Type = string, Value = string> =
  | StringTokenizerToken<Type, Value>
  | [StringTokenizerToken<Type, Value>]
  | [StringTokenizerToken<Type, Value>, number | undefined];

/**
 * Handler for the matched token
 *
 * @param value the current value at the given index
 * @param index the current index
 * @param data a clone of the full data string
 */
export type StringTokenizerHandler<Type = string, Value = string> = (
  value: string,
  index: number,
  data: string,
) => StringTokenizerHandlerReturnType<Type, Value>;

/**
 * Matcher object that contains a key to match the value against and a handler
 */
export type StringTokenizerMatcher<Type = string, Value = string> = {
  key: StringTokenizerKeyMatcher;
  handler: StringTokenizerHandler<Type, Value>;
};
export type StringTokenizerOptions<Type = string, Value = string> = {
  /**
   * The data to tokenize
   */
  data: string;
  /**
   * The matchers, will be checked in order
   */
  matchers: StringTokenizerMatcher<Type, Value>[];
  /**
   * A default handler in case no matcher matches
   */
  defaultHandler?: StringTokenizerHandler<Type, Value>;
};

/**
 * General purpose string tokenizer
 *
 * @example
 * ```ts
 * const t = new StringTokenizer({
 *   data: "testa",
 *   matchers: [
 *     {
 *       key: (v, i) => v === "t" && i === 3,
 *       handler: (v, i) => ({
 *         index: i,
 *         type: "function",
 *         value: v,
 *       }),
 *     },
 *     {
 *       key: "t",
 *       handler: (v, i) => ([
 *         {
 *           index: i,
 *           type: "string",
 *           value: v,
 *         },
 *         2
 *       ]),
 *     },
 *     {
 *       key: /[es]/,
 *       handler: (v, i) => ({
 *         index: i,
 *         type: "regex",
 *         value: v,
 *       }),
 *     },
 *   ],
 *   defualtHandler:(v, i) => ({
 *     index: i,
 *     type: "default",
 *     value: v,
 *   }),
 * });
 *
 * const tokens = t.tokenize();
 * ```
 */
export class StringTokenizer<Type = string, Value = string> {
  readonly #data: string;
  readonly #matchers: StringTokenizerMatcher<Type, Value>[];
  readonly #defaultHandler?: StringTokenizerHandler<Type, Value>;

  #index = 0;

  get #currentChar(): string {
    return this.#data[this.#index];
  }

  constructor(options: StringTokenizerOptions<Type, Value>) {
    this.#data = options.data;
    this.#matchers = options.matchers;
    this.#defaultHandler = options.defaultHandler;
  }

  #incrementIndex(value = 1): void {
    this.#index += value;
  }

  tokenize(): StringTokenizerToken<Type, Value>[] {
    this.#index = 0;
    const tokens: StringTokenizerToken<Type, Value>[] = [];

    while (this.#index < this.#data.length) {
      const token = this.#match();
      let increment = 1;

      if (Array.isArray(token)) {
        tokens.push(token[0]);
        if (token[1] !== undefined) {
          increment = token[1];
        }
      } else {
        tokens.push(token);
      }

      this.#incrementIndex(increment);
    }

    return tokens;
  }

  #match(): StringTokenizerHandlerReturnType<Type, Value> {
    for (const matcher of this.#matchers) {
      if (
        typeof matcher.key === "string" &&
          matcher.key === this.#currentChar ||
        matcher.key instanceof RegExp &&
          matcher.key.test(this.#currentChar) ||
        typeof matcher.key === "function" &&
          matcher.key(this.#currentChar, this.#index)
      ) {
        return matcher.handler(
          this.#currentChar,
          this.#index,
          this.#data,
        ) as StringTokenizerHandlerReturnType<Type, Value>;
      }
    }

    if (this.#defaultHandler) {
      return this.#defaultHandler(
        this.#currentChar,
        this.#index,
        this.#data,
      ) as StringTokenizerHandlerReturnType<Type, Value>;
    }

    throw new Error(
      `No matchers matched the value '${this.#currentChar}', and a default handler was not set.`,
    );
  }
}
