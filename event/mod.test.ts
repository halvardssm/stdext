import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  CustomEvent,
  type CustomEventListenerObject,
  CustomEventTarget,
} from "./mod.ts";

type ChangeEvent = CustomEvent<"change", { value: number }>;

function target(): CustomEventTarget<"change", ChangeEvent> {
  return new CustomEventTarget();
}

function changeEvent(value: number, init?: CustomEventInit<{ value: number }>) {
  return new CustomEvent("change", { ...init, detail: { value } });
}

/** Inline listeners are contextually typed as `Event | E`; narrow the event */
function changeValue(event: Event | ChangeEvent): number {
  return (event as ChangeEvent).detail.value;
}

Deno.test("CustomEvent", async (t) => {
  await t.step("has the type and detail given to it", () => {
    const event = new CustomEvent("change", { detail: { value: 42 } });
    assertEquals(event.type, "change");
    assertEquals(event.detail, { value: 42 });
  });

  await t.step("extends the global CustomEvent", () => {
    const event = new CustomEvent("change");
    assert(event instanceof globalThis.CustomEvent);
    assert(event instanceof Event);
  });

  await t.step("bubbles and is cancelable when given as options", () => {
    const event = new CustomEvent("change", {
      bubbles: true,
      cancelable: true,
      detail: { value: 42 },
    });
    assert(event.bubbles);
    assert(event.cancelable);
  });
});

Deno.test("CustomEventTarget", async (t) => {
  await t.step("dispatches events to the listeners of their type", () => {
    const targetInstance = target();
    const values: number[] = [];
    targetInstance.addEventListener("change", (event) => {
      values.push(changeValue(event));
    });
    targetInstance.dispatchEvent(changeEvent(1));
    targetInstance.dispatchEvent(changeEvent(2));
    assertEquals(values, [1, 2]);
  });

  await t.step("stops dispatching to removed listeners", () => {
    const targetInstance = target();
    const values: number[] = [];
    const listener = (event: Event | ChangeEvent) =>
      void values.push(changeValue(event));
    targetInstance.addEventListener("change", listener);
    targetInstance.dispatchEvent(changeEvent(1));
    targetInstance.removeEventListener("change", listener);
    targetInstance.dispatchEvent(changeEvent(2));
    assertEquals(values, [1]);
  });

  await t.step("dispatches to listener objects", () => {
    const targetInstance = target();
    const values: number[] = [];
    const listener: CustomEventListenerObject<ChangeEvent> = {
      handleEvent(event) {
        values.push(event.detail.value);
      },
    };
    targetInstance.addEventListener("change", listener);
    targetInstance.dispatchEvent(changeEvent(1));
    assertEquals(values, [1]);
  });

  await t.step("passes add and remove options through", () => {
    const targetInstance = target();
    let calls = 0;
    // A once listener is removed after it ran once.
    targetInstance.addEventListener("change", () => void calls++, {
      once: true,
    });
    targetInstance.dispatchEvent(changeEvent(1));
    targetInstance.dispatchEvent(changeEvent(2));
    assertEquals(calls, 1);
  });

  await t.step("returns whether the event was not canceled", () => {
    const targetInstance = target();
    assert(
      targetInstance.dispatchEvent(changeEvent(1)),
      "Dispatching without listeners is not canceled",
    );

    targetInstance.addEventListener("change", (event) => {
      event.preventDefault();
    });
    assertFalse(
      targetInstance.dispatchEvent(changeEvent(1, { cancelable: true })),
      "A cancelable event that a listener prevents default on is canceled",
    );
    assert(
      targetInstance.dispatchEvent(changeEvent(1)),
      "An event that is not cancelable can not be canceled",
    );
  });

  await t.step("extends the global EventTarget", () => {
    const targetInstance = target();
    assert(targetInstance instanceof EventTarget);
    // The target is usable as a global event target.
    const global: EventTarget = targetInstance;
    let calls = 0;
    global.addEventListener("change", () => void calls++);
    global.dispatchEvent(changeEvent(1));
    assertEquals(calls, 1);
  });
});
