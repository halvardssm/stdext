import {
  assert,
  assertEquals,
  assertFalse,
  assertMatch,
  assertThrows,
} from "@std/assert";
import { DeferredStack } from "./deferred_stack.ts";

Deno.test("deferred", async (t) => {
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
    e1.release();
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

    e2.release();
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

    e3.release();
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

    (await e4).release();
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

    (await e5).release();
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
    e6.remove();
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
    e7.remove();
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
