/**
 * Events
 */
import type {
  Driver,
  DriverConnectionOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";
import type { DriverConnectable } from "./driver.ts";

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
  Connectable extends DriverConnectable = DriverConnectable,
> extends ErrorEventInit {
  connectable?: Connectable;
}

/**
 * DriverConnectableEventInit
 *
 * SQLx Connectable event init
 */
export interface SqlConnectionEventInit<
  DConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  DQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  DParameterType extends DriverParameterType = DriverParameterType,
  DQueryValues extends DriverQueryValues = DriverQueryValues,
  DQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    DConnectionOptions,
    DQueryOptions,
    DParameterType,
    DQueryValues,
    DQueryMeta
  > = Driver<
    DConnectionOptions,
    DQueryOptions,
    DParameterType,
    DQueryValues,
    DQueryMeta
  >,
> extends EventInit {
  connection: Connection;
}

/**
 * Event classes
 */

/**
 * Base SQLx error event class
 */
export class SqlErrorEvent<
  EventInit extends SqlErrorEventInit = SqlErrorEventInit,
> extends ErrorEvent {
  constructor(type: "error", eventInitDict?: EventInit) {
    super(type, eventInitDict);
  }
}

/**
 * Base SQLx event class
 */
export class SqlEvent<
  EventType extends SqlPoolConnectionEventType = SqlPoolConnectionEventType,
  EventInit extends SqlConnectionEventInit = SqlConnectionEventInit,
> extends Event {
  constructor(type: EventType, eventInitDict?: EventInit) {
    super(type, eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is established
 */
export class SqlConnectEvent<
  ConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions = DriverQueryOptions,
  ParameterType extends DriverParameterType = DriverParameterType,
  QueryValues extends DriverQueryValues = DriverQueryValues,
  QueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  > = Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  >,
  EventInit extends SqlConnectionEventInit<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  > = SqlConnectionEventInit<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  >,
> extends SqlEvent<"connect", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("connect", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is about to be closed
 */
export class SqlCloseEvent<
  EventInit extends SqlConnectionEventInit = SqlConnectionEventInit,
> extends SqlEvent<"close", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("close", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is acquired from the pool
 */
export class SqlAcquireEvent<
  EventInit extends SqlConnectionEventInit = SqlConnectionEventInit,
> extends SqlEvent<"acquire", EventInit> {
  constructor(eventInitDict: EventInit) {
    super("acquire", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is released back to the pool
 */
export class SqlReleaseEvent<
  EventInit extends SqlConnectionEventInit = SqlConnectionEventInit,
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
  ConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions = DriverQueryOptions,
  ParameterType extends DriverParameterType = DriverParameterType,
  QueryValues extends DriverQueryValues = DriverQueryValues,
  QueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  > = Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  >,
  EventType extends SqlPoolConnectionEventType = SqlPoolConnectionEventType,
  EventInit extends SqlConnectionEventInit<Connection> = SqlConnectionEventInit<
    Connection
  >,
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
> {
  /**
   * The EventTarget to reduce inheritance
   */
  eventTarget: EventTarget;
}
