import { z } from "jsr:@zod/zod";
import {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "jsr:@standard-schema/spec";
import { getDotPath, SchemaError } from "jsr:@standard-schema/utils";
import {
  assertIsContextMetadata,
  isContextMetadata,
  validateContextMetadata,
} from "./asserts.ts";

// export function isSomeObject<T extends StandardJSONSchemaV1>(
//   schema: T,
//   data: StandardJSONSchemaV1.InferInput<T>, // extract input type
// ) {
//   // @ts-expect-error - replace doStuff with your own logic
//   const result = doStuff(schema, data);
//   return result as StandardJSONSchemaV1.InferOutput<T>; // extract output type
// }

// export function standardValidate<T extends StandardSchemaV1>(
//   schema: T,
//   input: StandardSchemaV1.InferInput<T>,
// ):
//   | StandardSchemaV1.Result<unknown>
//   | Promise<StandardSchemaV1.Result<unknown>> {
//   return schema["~standard"].validate(input);
// }

interface StringSchema extends StandardSchemaV1<string> {
  type: "string";
  message: string;
}

// Step 2: Implement the schema interface
function string(message = "Invalid type"): StringSchema {
  return {
    type: "string",
    message,
    "~standard": {
      version: 1,
      vendor: "valizod",
      validate(value) {
        return typeof value === "string"
          ? { value }
          : { issues: [{ message, path: [] }] };
      },
    },
  };
}

Deno.test("validator", () => {
  const res = validateContextMetadata({ columns: ["test"] }, z.fromJSONSchema);
  if (!res.issues) {
    res.value;
  }
  console.log(
    validateContextMetadata({ columns: ["test"] }, z.fromJSONSchema),
  );
  console.log(
    isContextMetadata({ columns: ["test"] }, z.fromJSONSchema),
  );
  console.log(
    assertIsContextMetadata({ columns: ["test"] }, z.fromJSONSchema),
  );

  //   parseData();

  // const zodSchema = z.object({ columns: z.string().array() });

  console.log(
    JSON.stringify(z.toJSONSchema(z.fromJSONSchema(false)), null, 2),
  );

  //   const schema: StandardSchemaV1 = {
  //     type: "object",
  //     properties: { a: { type: "string" } },
  //     required: ["a"],
  //     additionalProperties: false,
  //   };

  //   console.log(
  //     z.fromJSONSchema(schema, { target: "openapi-3.0" }),
  //   );

  //   console.log(isSomeObject(schema, z));
  //   console.log(
  //     // @ts-ignore
  //     standardValidate(zodSchema, { a: 9, b: Symbol.asyncIterator }),
  //   );
});
