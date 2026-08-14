/**
 * The Event module contain extensions of the existing Web API.
 *
 * It does not add any changes, but adds a better typing experience when implementing custom events
 *
 * @module
 */

/**
 * CustomEvent
 *
 * Extension of the global CustomEvent
 *
 * @see {@link globalThis.CustomEvent}
 *
 * @template T the event type
 * @template D the custom event details
 */
// deno-lint-ignore no-explicit-any
export class CustomEvent<T extends string = string, D = any>
  extends globalThis.CustomEvent<D> {
  /**
   * Typed constructor for CustomEvent
   *
   * @param typeArg the event types that the custom event should support
   * @param eventInitDict typed EventInit
   */
  constructor(typeArg: T, eventInitDict?: CustomEventInit<D>) {
    super(typeArg, eventInitDict);
  }
}

/**
 * CustomEventTarget
 *
 * Type-safe wrapper around EventTarget that provides better typing experience.
 * This class wraps an EventTarget instance and provides type-safe methods.
 *
 * @see {@link globalThis.EventTarget}
 *
 * @template T the event type (string literal)
 * @template E the event type that extends CustomEvent
 * @template L the event listener type
 * @template AO add event listener options type
 * @template RO remove event listener options type
 */
export class CustomEventTarget<
  T extends string = string,
  E extends CustomEvent<T> = CustomEvent<T>,
  L extends CustomEventListenerOrEventListenerObject<E> =
    CustomEventListenerOrEventListenerObject<E>,
  AO extends AddEventListenerOptions = AddEventListenerOptions,
  RO extends EventListenerOptions = EventListenerOptions,
> extends EventTarget {
  /** .
   *
   * Typed addEventListener
   *
   * @inheritdoc
   */
  override addEventListener(
    type: T,
    listener: L | null,
    options?: boolean | AO,
  ): void {
    return super.addEventListener(type, listener, options);
  }

  /** .
   *
   * Typed dispatchEvent
   *
   * @inheritdoc
   */
  override dispatchEvent(event: E): boolean {
    return super.dispatchEvent(event);
  }

  /** .
   *
   * Typed removeEventListener
   *
   * @inheritdoc
   */
  override removeEventListener(
    type: T,
    callback: L | null,
    options?: boolean | RO,
  ): void {
    return super.removeEventListener(type, callback, options);
  }
}

/**
 * CustomEventListener
 *
 * A function type that represents an event listener for a specific event type
 *
 * @template E the event type
 * @param evt the event object
 */
export interface CustomEventListener<E extends Event = Event>
  extends EventListener {
  (evt: E): void;
}

/**
 * CustomEventListenerObject
 *
 * An object that can handle events with a handleEvent method
 *
 * @template E the event type
 */
export interface CustomEventListenerObject<E extends Event = Event>
  extends EventListenerObject {
  /**
   * Handles the event
   *
   * @param evt the event object to handle
   */
  handleEvent(evt: E): void;
}

/**
 * CustomEventListenerOrEventListenerObject
 *
 * Union type representing either a function listener or an object listener
 *
 * @template E the event type
 */
export type CustomEventListenerOrEventListenerObject<E extends Event = Event> =
  | CustomEventListener<E>
  | CustomEventListenerObject<E>;
