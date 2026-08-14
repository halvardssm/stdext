import type { Driver } from "./core.ts";
import {
  CustomEvent,
  CustomEventListener,
  CustomEventListenerOrEventListenerObject,
  CustomEventTarget,
} from "@stdext/event";
import { DatabaseError } from "./errors.ts";
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

export interface EventDetail {
  driver: Driver;
}
export interface ErrorEventDetail {
  driver: Driver;
  error: DatabaseError;
}

export class DriverEvent<
  T extends DriverEventType = DriverEventType,
  D extends EventDetail = T extends "error" ? ErrorEventDetail : EventDetail,
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
