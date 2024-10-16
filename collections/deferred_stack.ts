/**
 * DeferredStackOptions
 *
 * Options for DeferredStack
 */
export type DeferredStackOptions<T> = {
  /**
   * The maximum stack size to be allowed.
   */
  maxSize?: number;
  /**
   * The release function to be called when the element is released
   */
  releaseFn?: (element: DeferredStackElement<T>) => Promise<void> | void;
  /**
   * The remove function to be called when the element is removed
   */
  removeFn?: (element: DeferredStackElement<T>) => Promise<void> | void;
};

/**
 * DeferredStack
 *
 * When you have a stack that you want to defer the acquire of an element until it is available.
 *
 * ```ts
 * const deferred = new DeferredStack<number>({ maxSize: 1 });
 * deferred.add(1);
 * const e1 = await deferred.pop();
 * setTimeout(() => e1.release(), 5000);
 * const e2 = await deferred.pop(); // will be queued until e1 is released
 * ```
 */
export class DeferredStack<T> {
  /**
   * The maximum stack size to be allowed, if the stack is full, the acquire will be queued.
   *
   * @default 10
   */
  readonly maxSize: number = 10;
  #releaseFn?: DeferredStackOptions<T>["releaseFn"];
  #removeFn?: DeferredStackOptions<T>["removeFn"];

  /**
   * The list of all elements
   *
   * Cannot be larger than maxSize
   */
  #elements: Array<DeferredStackElement<T>> = [];

  /**
   * The stack of available elements
   */
  #stack: Array<DeferredStackElement<T>> = [];

  /**
   * The queue of requested connections
   */
  readonly queue: Array<PromiseWithResolvers<DeferredStackElement<T>>> = [];

  /**
   * The list of all elements
   */
  get elements(): Array<DeferredStackElement<T>> {
    return this.#elements;
  }

  /**
   * The stack of available elements
   */
  get stack(): Array<DeferredStackElement<T>> {
    return this.#stack;
  }

  /**
   * The number of elements in the stack
   */
  get totalCount(): number {
    return this.#elements.length;
  }

  /**
   * The number of elements in the stack
   */
  get inUseCount(): number {
    return this.#elements.length - this.availableCount;
  }

  /**
   * The number of available elements in the stack
   */
  get availableCount(): number {
    return this.#stack.length;
  }

  /**
   * The number of queued acquires
   */
  get queuedCount(): number {
    return this.queue.length;
  }

  constructor(options?: DeferredStackOptions<T>) {
    this.maxSize = options?.maxSize ?? 10;
    this.#releaseFn = options?.releaseFn;
    this.#removeFn = options?.removeFn;
  }

  /**
   * Add an element to the stack
   *
   * If there are any queued acquires, the first one will be resolved with the pushed element.
   * If the stack is full, an error will be thrown.
   *
   * @throws Error("Max size reached")
   */
  add(element: T): void {
    if (this.#elements.length >= this.maxSize) {
      throw new Error("Max size reached");
    }

    const newElement = new DeferredStackElement<T>({
      value: element,
      releaseFn: async (element) => {
        await this.#release(element);
        await this.#releaseFn?.(element);
      },
      removeFn: async (element) => {
        this.#remove(element);
        await this.#removeFn?.(element);
      },
    });

    this.#elements.push(newElement);

    this.#push(newElement);
  }

  /**
   * Pop an element from the stack
   *
   * If there are no elements in the stack, the acquire will be queued and resolved when an element is pushed.
   */
  pop(): Promise<DeferredStackElement<T>> {
    const element = this.#stack.pop();

    if (element) {
      element._activate();
      return Promise.resolve(element);
    }

    const p = Promise.withResolvers<DeferredStackElement<T>>();

    this.queue.push(p);

    return p.promise;
  }

  /**
   * Push an element to the stack or resolve the first queued acquire
   */
  #push(element: DeferredStackElement<T>): void {
    if (this.queue.length) {
      const p = this.queue.shift()!;
      element._activate();
      p.resolve(element);
    } else {
      this.#stack.push(element);
    }
  }

  /**
   * Release element back to the deferred stack
   *
   * To avoid that previous users of the element can still access it,
   * the element is removed from the stack, and added again.
   */
  async #release(element: DeferredStackElement<T>): Promise<void> {
    const value = element.value;
    await element.remove();
    this.add(value);
  }

  /**
   * Removes element from the deferred stack
   */
  #remove(element: DeferredStackElement<T>): void {
    this.#elements = this.#elements.filter((el) => el._id !== element._id);
    this.#stack = this.#stack.filter((el) => el._id !== element._id);
  }
}

/**
 * DeferredStackElementOptions
 */
export type DeferredStackElementOptions<T> = {
  /**
   * The value of the element
   */
  value: T;
  /**
   * The release function to be called when the element is released
   */
  releaseFn: (element: DeferredStackElement<T>) => Promise<void>;
  /**
   * The remove function to be called when the element is removed
   */
  removeFn: (element: DeferredStackElement<T>) => Promise<void>;
};

/**
 * DeferredStackElement
 *
 * Represents an element in the DeferredStack with helpful methods to manage it.
 *
 * To access the value of the element, use the `value` property.
 */
export class DeferredStackElement<T> {
  /**
   * The unique identifier of the element
   */
  _id: string = crypto.randomUUID();

  /**
   * Whether the element is in use
   */
  #active = false;

  /**
   * Whether the element is disposed and should not be available anymore
   */
  #disposed = false;

  /**
   * The value of the element
   */
  _value: T;

  /**
   * The release function to be called when the element is released
   */
  #releaseFn: DeferredStackElementOptions<T>["releaseFn"];

  /**
   * The remove function to be called when the element is removed
   */
  #removeFn: DeferredStackElementOptions<T>["removeFn"];

  /**
   * Whether the element is in use
   */
  get active(): boolean {
    return this.#active;
  }

  /**
   * Whether the element is disposed and should not be available anymore
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * The value of the element
   *
   * @throws Error("Element is not active")
   * @throws Error("Element is disposed")
   */
  get value(): T {
    if (!this.active) throw new Error("Element is not active");
    if (this.#disposed) throw new Error("Element is disposed");
    return this._value;
  }

  constructor(
    options: DeferredStackElementOptions<T>,
  ) {
    this._value = options.value;
    this.#releaseFn = options.releaseFn;
    this.#removeFn = options.removeFn;
  }

  /**
   * Activates the element
   *
   * Only the DeferredStack should call this method.
   */
  _activate(): void {
    this.#active = true;
  }

  /**
   * Releases the element back to the DeferredStack
   */
  release(): ReturnType<DeferredStackElementOptions<T>["releaseFn"]> {
    return this.#releaseFn(this);
  }

  /**
   * Removes the element from the DeferredStack
   */
  remove(): ReturnType<DeferredStackElementOptions<T>["removeFn"]> {
    this.#active = false;
    this.#disposed = true;
    return this.#removeFn(this);
  }
}
