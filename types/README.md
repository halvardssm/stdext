# @stdext/types

The types package, contains general purpose type helpers.

## Examples

```ts
import { ValueOf } from "jsr:@stdext/types";

const SOME_MAP = {
  a: "b",
  c: "d",
};

type SomeMapValues = ValueOf<typeof SOME_MAP>; // "b" | "d"
```
