import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { DeferredStack } from "./deferred_stack.ts";

Deno.test("collections/deferred_stack/DeferredStack", async (t) => {
  await t.step("fill and empty x2", async () => {
    const deferred = new DeferredStack<number>({ maxSize: 2 });
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 0);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 0);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 0);

    deferred.add(1);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 1);
    assertEquals(deferred.stack.length, 1);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 1);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 1);
    assertEquals(deferred.queuedCount, 0);

    deferred.add(2);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 2);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 2);
    assertEquals(deferred.queuedCount, 0);

    assertThrows(() => deferred.add(3), Error, "Max size reached");
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 2);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 2);
    assertEquals(deferred.queuedCount, 0);

    const e1 = await deferred.pop();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 1);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 1);
    assertEquals(deferred.availableCount, 1);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, true);
    assertEquals(e1.value, 2);
    await e1.release();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 2);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 2);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertThrows(() => e1.value, Error, "Element is not active");

    const e2 = await deferred.pop();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 1);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 1);
    assertEquals(deferred.availableCount, 1);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, true);
    assertEquals(e2.value, 2);

    const e3 = await deferred.pop();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 2);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e3.active, true);
    assertEquals(e3.value, 1);

    let e4Resolved = false;
    let e5Resolved = false;

    const e4 = deferred.pop().then((r) => {
      e4Resolved = true;
      return r;
    });
    assertFalse(e4Resolved);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 1);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 2);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 1);

    const e5 = deferred.pop().then((r) => {
      e5Resolved = true;
      return r;
    });
    assertFalse(e5Resolved);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 2);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 2);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 2);

    await e2.release();
    await e4;
    assert(e4Resolved);
    assertFalse(e5Resolved);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 1);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 2);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 1);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);

    await e3.release();
    await e5;
    assert(e5Resolved);
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 2);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);
    assertEquals(e3.active, false);

    await (await e4).release();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 1);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 1);
    assertEquals(deferred.availableCount, 1);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);
    assertEquals(e3.active, false);
    assertEquals((await e4).active, false);

    await (await e5).release();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 2);
    assertEquals(deferred.stack.length, 2);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 2);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 2);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);
    assertEquals(e3.active, false);
    assertEquals((await e4).active, false);
    assertEquals((await e5).active, false);

    const e6 = await deferred.pop();
    await e6.remove();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 1);
    assertEquals(deferred.stack.length, 1);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 1);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 1);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);
    assertEquals(e3.active, false);
    assertEquals((await e4).active, false);
    assertEquals((await e5).active, false);
    assertEquals(e6.active, false);

    const e7 = await deferred.pop();
    await e7.remove();
    assertEquals(deferred.maxSize, 2);
    assertEquals(deferred.elements.length, 0);
    assertEquals(deferred.stack.length, 0);
    assertEquals(deferred.queue.length, 0);
    assertEquals(deferred.totalCount, 0);
    assertEquals(deferred.inUseCount, 0);
    assertEquals(deferred.availableCount, 0);
    assertEquals(deferred.queuedCount, 0);
    assertEquals(e1.active, false);
    assertEquals(e2.active, false);
    assertEquals(e3.active, false);
    assertEquals((await e4).active, false);
    assertEquals((await e5).active, false);
    assertEquals(e6.active, false);
    assertEquals(e7.active, false);
  });
});

Deno.test("collections/deferred_stack/DeferredStack callbacks", async (t) => {
  await t.step("release and remove call their own callback", async () => {
    const released: number[] = [];
    const removed: number[] = [];
    const deferred = new DeferredStack<number>({
      releaseFn: (value) => {
        released.push(value);
      },
      removeFn: (value) => {
        removed.push(value);
      },
    });
    deferred.add(1);
    deferred.add(2);

    const e1 = await deferred.pop();
    await e1.release();
    assertEquals(released, [2]);
    assertEquals(removed, []);

    const e2 = await deferred.pop();
    await e2.remove();
    assertEquals(released, [2]);
    assertEquals(removed, [2]);
  });

  await t.step("release and remove are idempotent", async () => {
    let calls = 0;
    const deferred = new DeferredStack<number>({
      releaseFn: () => {
        calls++;
      },
      removeFn: () => {
        calls++;
      },
    });
    deferred.add(1);
    const e1 = await deferred.pop();
    await e1.release();
    await e1.release();
    await e1.remove();
    assertEquals(calls, 1);
    assertEquals(deferred.totalCount, 1);
    assertEquals(deferred.availableCount, 1);
  });
});

Deno.test("collections/deferred_stack/DeferredStack values", async () => {
  const deferred = new DeferredStack<number>();
  deferred.add(1);
  deferred.add(2);
  const e1 = await deferred.pop();
  assertEquals(deferred.values, [1, 2]);
  await e1.remove();
  assertEquals(deferred.values, [1]);
});

Deno.test("collections/deferred_stack/DeferredStack pop signal", async (t) => {
  await t.step("rejects when already aborted", async () => {
    const deferred = new DeferredStack<number>();
    deferred.add(1);
    const reason = new Error("aborted");
    await assertRejects(
      () => deferred.pop({ signal: AbortSignal.abort(reason) }),
      Error,
      "aborted",
    );
    assertEquals(deferred.availableCount, 1);
  });

  await t.step("removes an aborted pop from the queue", async () => {
    const deferred = new DeferredStack<number>({ maxSize: 1 });
    deferred.add(1);
    const e1 = await deferred.pop();
    const controller = new AbortController();
    const pending = deferred.pop({ signal: controller.signal });
    assertEquals(deferred.queuedCount, 1);
    controller.abort(new Error("aborted"));
    await assertRejects(() => pending, Error, "aborted");
    assertEquals(deferred.queuedCount, 0);

    // The released element is not handed to the aborted pop.
    await e1.release();
    assertEquals(deferred.availableCount, 1);
  });

  await t.step("resolves before the signal aborts", async () => {
    const deferred = new DeferredStack<number>({ maxSize: 1 });
    deferred.add(1);
    const e1 = await deferred.pop();
    const controller = new AbortController();
    const pending = deferred.pop({ signal: controller.signal });
    await e1.release();
    const e2 = await pending;
    controller.abort();
    assertEquals(e2.value, 1);
  });
});

Deno.test("collections/deferred_stack/DeferredStack clear", async (t) => {
  await t.step("removes all elements and rejects the queue", async () => {
    const removed: number[] = [];
    const deferred = new DeferredStack<number>({
      maxSize: 2,
      removeFn: (value) => {
        removed.push(value);
      },
    });
    deferred.add(1);
    deferred.add(2);
    const e1 = await deferred.pop();
    const e2 = await deferred.pop();
    const pending = deferred.pop();

    await deferred.clear(new Error("closed"));
    await assertRejects(() => pending, Error, "closed");
    assertEquals(removed.sort(), [1, 2]);
    assertEquals(deferred.totalCount, 0);
    assertEquals(deferred.queuedCount, 0);
    assert(e1.disposed);
    assertFalse(e1.active);

    // Elements disposed by clear are not added back.
    await e1.release();
    await e2.remove();
    assertEquals(deferred.totalCount, 0);
    assertEquals(removed.length, 2);

    // The stack can be used again.
    deferred.add(3);
    assertEquals((await deferred.pop()).value, 3);
  });

  await t.step("rejects with a default reason", async () => {
    const deferred = new DeferredStack<number>({ maxSize: 1 });
    deferred.add(1);
    await deferred.pop();
    const pending = deferred.pop();
    await deferred.clear();
    await assertRejects(() => pending, Error, "cleared");
  });

  await t.step("aggregates errors of the remove function", async () => {
    const deferred = new DeferredStack<number>({
      removeFn: (value) => {
        if (value === 1) throw new Error("failed");
      },
    });
    deferred.add(1);
    deferred.add(2);
    await assertRejects(() => deferred.clear(), AggregateError);
    assertEquals(deferred.totalCount, 0);
  });
});
