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
 * Client event types
 */
export type ClientEventType = "connect" | "close" | "error";

/**
 * Pool connection event types
 */
export type PoolConnectionEventType =
  | ClientEventType
  | "acquire"
  | "release";

/**
 * EventInits
 */

/**
 * SqlErrorEventInit
 */
export interface SqlErrorEventInit<
  IConnectable extends DriverConnectable = DriverConnectable,
> extends ErrorEventInit {
  connectable?: IConnectable;
}

/**
 * DriverConnectableEventInit
 *
 * IConnectable event init
 */
export interface DriverEventInit<
  IConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  IParameterType extends DriverParameterType = DriverParameterType,
  IQueryValues extends DriverQueryValues = DriverQueryValues,
  IQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  IDriver extends Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  > = Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  >,
> extends EventInit {
  connection: IDriver;
}

/**
 * Event classes
 */

/**
 * Base error event class
 */
export class SqlErrorEvent<
  IEventInit extends SqlErrorEventInit = SqlErrorEventInit,
> extends ErrorEvent {
  constructor(type: "error", eventInitDict?: IEventInit) {
    super(type, eventInitDict);
  }
}

/**
 * Base event class
 */
export class SqlEvent<
  IEventType extends PoolConnectionEventType = PoolConnectionEventType,
  IEventInit extends DriverEventInit = DriverEventInit,
> extends Event {
  constructor(type: IEventType, eventInitDict?: IEventInit) {
    super(type, eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is established
 */
export class ConnectEvent<
  IEventInit extends DriverEventInit = DriverEventInit,
> extends SqlEvent<"connect", IEventInit> {
  constructor(eventInitDict: IEventInit) {
    super("connect", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is about to be closed
 */
export class CloseEvent<
  IEventInit extends DriverEventInit = DriverEventInit,
> extends SqlEvent<"close", IEventInit> {
  constructor(eventInitDict: IEventInit) {
    super("close", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is acquired from the pool
 */
export class AcquireEvent<
  IEventInit extends DriverEventInit = DriverEventInit,
> extends SqlEvent<"acquire", IEventInit> {
  constructor(eventInitDict: IEventInit) {
    super("acquire", eventInitDict);
  }
}

/**
 * Gets dispatched when a connection is released back to the pool
 */
export class ReleaseEvent<
  IEventInit extends DriverEventInit = DriverEventInit,
> extends SqlEvent<"release", IEventInit> {
  constructor(eventInitDict: IEventInit) {
    super("release", eventInitDict);
  }
}

/**
 * Event targets
 */

/**
 * EventTarget
 *
 * The EventTarget to be used
 */
export class SqlEventTarget<
  IConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  IParameterType extends DriverParameterType = DriverParameterType,
  IQueryValues extends DriverQueryValues = DriverQueryValues,
  IQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  IDriver extends Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  > = Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  >,
  IEventType extends PoolConnectionEventType = PoolConnectionEventType,
  IEventInit extends DriverEventInit<IDriver> = DriverEventInit<
    IDriver
  >,
  IEvent extends SqlEvent<IEventType, IEventInit> = SqlEvent<
    IEventType,
    IEventInit
  >,
  IListener extends EventListenerOrEventListenerObject =
    EventListenerOrEventListenerObject,
  IListenerOptions extends AddEventListenerOptions = AddEventListenerOptions,
  IRemoveListenerOptions extends EventListenerOptions = EventListenerOptions,
> extends EventTarget {
  /**
   * With typed events.
   *
   * @inheritdoc
   */
  addEventListener(
    type: IEventType,
    listener: IListener | null,
    options?: boolean | IListenerOptions,
  ): void {
    return super.addEventListener(type, listener, options);
  }

  /**
   * With typed events.
   *
   * @inheritdoc
   */
  dispatchEvent(event: IEvent): boolean {
    return super.dispatchEvent(event);
  }

  /**
   * With typed events.
   *
   * @inheritdoc
   */
  removeEventListener(
    type: IEventType,
    callback: IListener | null,
    options?: boolean | IRemoveListenerOptions,
  ): void {
    return super.removeEventListener(type, callback, options);
  }
}

/**
 * Eventable
 */
export interface Eventable<
  IEventTarget extends SqlEventTarget = SqlEventTarget,
> {
  /**
   * The EventTarget to reduce inheritance
   */
  eventTarget: IEventTarget;
}
