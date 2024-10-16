# @stdext/collections

The collections package contains commonly used utilities and structures.

## Entrypoints

### Deferred Stack

Contains the DeferredStack utility class.

```ts
const deferred = new DeferredStack<number>({ maxSize: 1 });
deferred.add(1);
const e1 = await deferred.pop();
setTimeout(() => e1.release(), 5000);
const e2 = await deferred.pop(); // will be queued until e1 is released
```
