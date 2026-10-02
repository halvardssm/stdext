import type { Client, Driver } from "./core.ts";
import { CustomEvent, CustomEventTarget } from "@stdext/event";
import type { CustomEventListenerOrEventListenerObject } from "@stdext/event";
import type { DatabaseError } from "./errors.ts";
/**
 * Driver event types
 */
export type DriverEventType =
  | "connect"
  | "close"
  | "error";

/**
 * Pool connection event types
 */
export type ClientEventType =
  | DriverEventType
  | "acquire"
  | "release";

/**
 * EventDetail
 *
 * The detail of an event. The `client` is the object that dispatched the
 * event: a {@linkcode Driver} for driver events and a {@linkcode Client} for
 * client events.
 *
 * @template IClient the dispatching object
 */
export interface EventDetail<IClient = Client> {
  /**
   * The object that dispatched the event
   */
  client: IClient;
}

/**
 * ErrorEventDetail
 *
 * The detail of an `error` event.
 *
 * @template IClient the dispatching object
 */
export interface ErrorEventDetail<IClient = Client>
  extends EventDetail<IClient> {
  /**
   * The error that triggered the event
   */
  error: DatabaseError;
}

export class DriverEvent<
  T extends DriverEventType = DriverEventType,
  D extends EventDetail<Driver> = T extends "error" ? ErrorEventDetail<Driver>
    : EventDetail<Driver>,
> extends CustomEvent<T, D> {}

export class ClientEvent<
  T extends ClientEventType = ClientEventType,
  D extends EventDetail = T extends "error" ? ErrorEventDetail : EventDetail,
> extends CustomEvent<T, D> {}

export class DriverEventTarget<
  T extends DriverEventType = DriverEventType,
  E extends CustomEvent<T> = CustomEvent<T>,
  L extends CustomEventListenerOrEventListenerObject<E> =
    CustomEventListenerOrEventListenerObject<E>,
  AO extends AddEventListenerOptions = AddEventListenerOptions,
  RO extends EventListenerOptions = EventListenerOptions,
> extends CustomEventTarget<T, E, L, AO, RO> {}

export class ClientEventTarget<
  T extends ClientEventType = ClientEventType,
  E extends ClientEvent<T> = ClientEvent<T>,
  L extends CustomEventListenerOrEventListenerObject<E> =
    CustomEventListenerOrEventListenerObject<E>,
  AO extends AddEventListenerOptions = AddEventListenerOptions,
  RO extends EventListenerOptions = EventListenerOptions,
> extends CustomEventTarget<T, E, L, AO, RO> {}

/**
 * Eventable
 */
export interface Eventable<
  IEventTarget extends DriverEventTarget = DriverEventTarget,
> {
  /**
   * The EventTarget to reduce inheritance
   */
  eventTarget: IEventTarget;
}
