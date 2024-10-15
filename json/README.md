# @stdext/json

The json package, contains helpers for json parsing, querying (jsonpath) and
processing

## Entrypoints

### JSONPath

JSONPath ([RFC9535](https://datatracker.ietf.org/doc/html/rfc9535))

```ts
import { JSONPath } from "@stdext/json";
const jp = new JSONPath({ a: "b" });
jp.query("$.a"); // "b"
```
