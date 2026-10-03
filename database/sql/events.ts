import type { Client } from "./core.ts";
import { CustomEvent, CustomEventTarget } from "@stdext/event";
import type { DatabaseError } from "./errors.ts";

/**
 * Client event types
 *
 * - `connect`: a connection of the pool is established
 * - `close`: a connection of the pool is about to be closed
 * - `error`: an error is thrown by an operation
 * - `acquire`: a connection is acquired from the pool
 * - `release`: a connection is released back to the pool
 */
export type ClientEventType =
  | "connect"
  | "close"
  | "error"
  | "acquire"
  | "release";

/**
 * EventDetail
 *
 * The detail of an event, with the client that dispatched it.
 *
 * @template IClient the dispatching client
 */
export interface EventDetail<IClient = Client> {
  /**
   * The client that dispatched the event
   */
  client: IClient;
}

/**
 * ErrorEventDetail
 *
 * The detail of an `error` event.
 *
 * @template IClient the dispatching client
 */
export interface ErrorEventDetail<IClient = Client>
  extends EventDetail<IClient> {
  /**
   * The error that triggered the event
   */
  error: DatabaseError;
}

/**
 * An event dispatched by a client.
 */
export class ClientEvent<
  T extends ClientEventType = ClientEventType,
  D extends EventDetail = T extends "error" ? ErrorEventDetail : EventDetail,
> extends CustomEvent<T, D> {}

/**
 * The event target of a client.
 */
export class ClientEventTarget<
  T extends ClientEventType = ClientEventType,
  E extends ClientEvent<T> = ClientEvent<T>,
> extends CustomEventTarget<T, E> {}

/**
 * Eventable
 *
 * Represents an object that dispatches events.
 */
export interface Eventable<
  IEventTarget extends ClientEventTarget = ClientEventTarget,
> {
  /**
   * The target the events are dispatched on
   */
  eventTarget: IEventTarget;
}
