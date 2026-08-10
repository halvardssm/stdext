# @stdext/json

Extends [@std/json](https://jsr.io/@std/json)

The json package, contains helpers for json parsing, querying (jsonpath) and
processing

## Entrypoints

### JSONPath

JSONPath ([RFC9535](https://datatracker.ietf.org/doc/html/rfc9535))

```ts
import { JSONPath } from "@stdext/json";
// OR
import { JSONPath } from "@stdext/json/jsonpath";

const jp = new JSONPath({ a: "b" });
jp.query("$.a"); // "b"
```

### JSON Schema

JSON Schema ([see](https://json-schema.org))

```ts
import type { JSONSchema } from "@stdext/json";
// OR
import type { JSONSchema } from "@stdext/json/json-schema";

const schema: JSONSchema. = /** some schema */
```
