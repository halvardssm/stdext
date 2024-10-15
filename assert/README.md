# @stdext/assert

The assert package, contains validators and assertions

```ts
import { assertIsString, isString } from "@stdext/assert";

if (isString(someVar)) {
  // Returns true if a value is a string
  // someVar will typewise be a string from now on
}

assertIsString(someVar); // Throws if the value is not a string
// someVar will typewise be a string from now on
```