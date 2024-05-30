/**
 * Events
 */
import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type { SqlBase, SqlConnectableBase } from "./core.ts";
import { VERSION } from "./meta.ts";

/**
 * Event types
 */

/**
 * SQLx Client event types
 */
export type SqlClientEventType = "connect" | "close" | "error";

/**
 * SQLx Pool Connection event types
 */
export type SqlPoolConnectionEventType =
  | SqlClientEventType
  | "acquire"
  | "release";

/**
 * EventInits
 */

/**
 * SqlErrorEventInit
 */
export interface SqlErrorEventInit<
  Connectable extends SqlConnectableBase = SqlConnectableBase,
> extends ErrorEventInit {
  connectable?: Connectable;
}

/**
 * SqlPoolEventInit
 *
 * SQLx Pool event init
 */
export interface SqlConnectableEventInit<
  Connectable extends SqlConnectableBase = SqlConnectableBase,
> extends EventInit {
  connectable: Connectable;
}

/**
 * Event classes
 */

/**
 * Base SQLx error event class
 */
export class SqlErrorEvent<
  EventInit extends SqlErrorEventInit = SqlErrorEventInit,
> extends ErrorEvent implements SqlBase {
  readonly sqlxVersion = VERSION;
  static readonly sqlxVersion = VERSION;
  constructor(type: "error", eventInitDict?: EventInit) {
    super(type, eventInitDict);
  }
}

/**
 * Base SQLx event class
 */
export class SqlEvent<
  EventType extends SqlPoolConnectionEventType = SqlPoolConnectionEventType,
  EventInit extends SqlConnectableEventInit = SqlConnectableEventInit,
> extends Event implements SqlBase {
  readonly sqlxVersion = VERSION;
  static readonly sqlxVersion = VERSION;
  constructor(type: EventType, eventInitDict?: EventInit) {
    super(type, eventInitDict);
  }
}

/**
 * SqlClientConnectEvent class
 */
export class SqlConnectableConnectEvent<
  EventInit extends SqlConnectableEventInit = SqlConnectableEventInit,
> extends SqlEvent<"connect", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("connect", eventInitDict);
  }
}

/**
 * SqlConnectionCloseEvent class
 */
export class SqlConnectableCloseEvent<
  EventInit extends SqlConnectableEventInit = SqlConnectableEventInit,
> extends SqlEvent<"close", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("close", eventInitDict);
  }
}

/**
 * SqlPoolConnectionAcquireEvent class
 */
export class SqlPoolConnectableAcquireEvent<
  EventInit extends SqlConnectableEventInit = SqlConnectableEventInit,
> extends SqlEvent<"acquire", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("acquire", eventInitDict);
  }
}

/**
 * SqlPoolConnectionReleaseEvent class
 */
export class SqlPoolConnectableReleaseEvent<
  EventInit extends SqlConnectableEventInit = SqlConnectableEventInit,
> extends SqlEvent<"release", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("release", eventInitDict);
  }
}

/**
 * Event targets
 */

/**
 * SqlEventTarget
 *
 * The EventTarget to be used by SQLx
 */
export class SqlEventTarget<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  EventType extends SqlPoolConnectionEventType = SqlPoolConnectionEventType,
  EventInit extends SqlConnectableEventInit<SqlConnectableBase<Connection>> =
    SqlConnectableEventInit<SqlConnectableBase<Connection>>,
  Event extends SqlEvent<EventType, EventInit> = SqlEvent<
    EventType,
    EventInit
  >,
  Listener extends EventListenerOrEventListenerObject =
    EventListenerOrEventListenerObject,
  ListenerOptions extends AddEventListenerOptions = AddEventListenerOptions,
  RemoveListenerOptions extends EventListenerOptions = EventListenerOptions,
> extends EventTarget {
  /**
   * With typed events.
   *
   * @inheritdoc
   */
  addEventListener(
    type: EventType,
    listener: Listener | null,
    options?: boolean | ListenerOptions,
  ): void {
    return super.addEventListener(type, listener, options);
  }

  /**
   * With typed events.
   *
   * @inheritdoc
   */
  dispatchEvent(event: Event): boolean {
    return super.dispatchEvent(event);
  }

  /**
   * With typed events.
   *
   * @inheritdoc
   */
  removeEventListener(
    type: EventType,
    callback: Listener | null,
    options?: boolean | RemoveListenerOptions,
  ): void {
    return super.removeEventListener(type, callback, options);
  }
}

/**
 * SqlEventable
 */
export interface SqlEventable<
  EventTarget extends SqlEventTarget = SqlEventTarget,
> extends SqlBase {
  /**
   * The EventTarget to reduce inheritance
   */
  eventTarget: EventTarget;
}
