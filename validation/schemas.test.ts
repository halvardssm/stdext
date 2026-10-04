import type { StandardSchemaV1 } from "@standard-schema/spec";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { array } from "./composites.ts";
import { createSchema, type Schema } from "./core.ts";
import {
  type AnyFunction,
  boolean,
  enumerator,
  float,
  func,
  instanceOf,
  integer,
  literal,
  never,
  null_,
  nullable,
  nullish,
  number,
  optional,
  string,
  symbol,
  unknown,
} from "./schemas.ts";
import { toJSONSchema, validate, validateAsync } from "./utils.ts";
import {
  assertType,
  asyncString,
  type Equals,
  type Input,
  issue,
  kinds,
  messages,
  type Output,
  typeIssue,
  valid,
} from "./_testing.ts";

Deno.test("string", async (t) => {
  await t.step("accepts strings", () => {
    assertEquals(validate(string(), "a"), { value: "a" });
    assertEquals(validate(string(), ""), { value: "" });
  });

  await t.step("rejects everything else", () => {
    for (const value of [1, true, null, undefined, [], {}, Symbol("s")]) {
      assert(!valid(string(), value), String(value));
    }
  });

  await t.step("reports a typed issue", () => {
    assertEquals(validate(string(), 1), {
      issues: [typeIssue("a string", 1, "number")],
    });
    assertEquals(
      validate(string(), null).issues?.[0].message,
      "Expected a string, received null",
    );
    assertEquals(
      validate(string(), []).issues?.[0].message,
      "Expected a string, received array",
    );
  });

  await t.step("exports its JSON Schema", () => {
    assertEquals(toJSONSchema(string(), { io: "input" }), { type: "string" });
    assertEquals(toJSONSchema(string()), { type: "string" });
  });

  await t.step("infers its types", () => {
    const schema = string();
    assertType<Equals<typeof schema, Schema<string, string, "string">>>();
    assertEquals(schema.kind, "string");
  });
});

Deno.test("string constraints", async (t) => {
  await t.step("minLength and maxLength count code points", () => {
    const schema = string({ minLength: 2, maxLength: 3 });
    assertEquals(validate(schema, "ab"), { value: "ab" });
    assertEquals(validate(schema, "a🙂"), { value: "a🙂" }); // 2 code points
    assertEquals(validate(schema, "a🙂b"), { value: "a🙂b" });
    assertEquals(messages(validate(schema, "a")), [
      "Expected a string of at least 2 characters, received 1",
    ]);
    assertEquals(messages(validate(schema, "abcd")), [
      "Expected a string of at most 3 characters, received 4",
    ]);
    assert(!valid(string({ minLength: 2 }), "🙂"));
    assertEquals(
      messages(validate(string({ minLength: 1 }), "")),
      ["Expected a string of at least 1 character, received 0"],
    );
    assert(valid(string({ minLength: 0, maxLength: 0 }), ""));
  });

  await t.step("pattern, as a string or a RegExp", () => {
    for (const pattern of ["^[a-z]+$", /^[a-z]+$/]) {
      const schema = string({ pattern });
      assert(valid(schema, "abc"));
      assertEquals(messages(validate(schema, "ABC")), [
        'Expected a string matching the pattern ^[a-z]+$, received "ABC"',
      ]);
    }
    // not anchored: it matches anywhere in the string
    assert(valid(string({ pattern: "b" }), "abc"));
    assert(!valid(string({ pattern: "^b" }), "abc"));
    // a regular expression can be reused: it keeps no state between calls
    const sticky = string({ pattern: /a/ });
    assert(valid(sticky, "a") && valid(sticky, "a") && valid(sticky, "a"));
  });

  await t.step("format", () => {
    assert(valid(string({ format: "email" }), "a@b.co"));
    assertEquals(messages(validate(string({ format: "email" }), "nope")), [
      'Expected a string of format email, received "nope"',
    ]);
    assert(
      valid(string({ format: "uuid" }), "123e4567-e89b-12d3-a456-426614174000"),
    );
    assert(!valid(string({ format: "date" }), "2023-02-29"));
    assert(valid(string({ format: "date-time" }), "2024-02-29T12:00:00Z"));
    assert(valid(string({ format: "ipv4" }), "192.168.1.1"));
  });

  await t.step("reports every violated constraint", () => {
    const schema = string({ minLength: 5, pattern: "^a", format: "email" });
    assertEquals(kinds(validate(schema, "xy")), [
      "minLength",
      "format",
      "pattern",
    ]);
    assertEquals(
      kinds(validate(string({ maxLength: 1, minLength: 0 }), "ab")),
      ["maxLength"],
    );
    // a value of the wrong type has only the type issue
    assertEquals(kinds(validate(schema, 1)), ["type"]);
  });

  await t.step("issues carry the limit and what was found", () => {
    assertEquals(validate(string({ minLength: 3 }), "ab"), {
      issues: [
        issue(
          "minLength",
          "Expected a string of at least 3 characters, received 2",
          3,
          2,
        ),
      ],
    });
  });

  await t.step("exports the constraints as JSON Schema keywords", () => {
    const expected = {
      type: "string",
      minLength: 1,
      maxLength: 9,
      pattern: "^a",
      format: "email",
    };
    const schema = string({
      minLength: 1,
      maxLength: 9,
      pattern: /^a/,
      format: "email",
    });
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
    assertEquals(toJSONSchema(string({ pattern: "^b" })), {
      type: "string",
      pattern: "^b",
    });
    assertEquals(toJSONSchema(string()), { type: "string" });
  });

  await t.step(
    "rejects options that are not valid when the schema is built",
    () => {
      assertThrows(() => string({ minLength: -1 }), TypeError, "minLength");
      assertThrows(() => string({ maxLength: 1.5 }), TypeError, "maxLength");
      assertThrows(
        () => string({ minLength: 3, maxLength: 2 }),
        TypeError,
        "minLength (3) must not be greater than maxLength (2)",
      );
      assertThrows(
        () => string({ pattern: "(" }),
        TypeError,
        "not a valid regular expression",
      );
      assertThrows(
        () => string({ pattern: /a/i }),
        TypeError,
        "cannot have flags",
      );
      assertThrows(
        // deno-lint-ignore no-explicit-any
        () => string({ format: "nope" as any }),
        TypeError,
        "format nope is not supported",
      );
    },
  );
});

Deno.test("integer", async (t) => {
  await t.step("accepts integers", () => {
    for (const value of [0, 1, -1, 1.0, 1e20, Number.MAX_SAFE_INTEGER]) {
      assert(valid(integer(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [
        1.5,
        NaN,
        Infinity,
        -Infinity,
        "1",
        true,
        null,
        undefined,
      ]
    ) {
      assert(!valid(integer(), value), String(value));
    }
    assertEquals(
      validate(integer(), 1.5).issues?.[0].message,
      "Expected an integer, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(integer(), { io: "input" }), { type: "integer" });
    assertEquals(toJSONSchema(integer()), { type: "integer" });
    const schema = integer();
    assertType<Equals<typeof schema, Schema<number, number, "integer">>>();
  });
});

Deno.test("float", async (t) => {
  await t.step("accepts finite numbers, integers included", () => {
    for (const value of [0, 1, -1.5, 3.14, 1e-9, Number.MAX_VALUE]) {
      assert(valid(float(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [NaN, Infinity, -Infinity, "1.5", true, null, undefined]
    ) {
      assert(!valid(float(), value), String(value));
    }
    assertEquals(
      validate(float(), NaN).issues?.[0].message,
      "Expected a finite number, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(float(), { io: "input" }), { type: "number" });
    assertEquals(toJSONSchema(float()), { type: "number" });
    const schema = float();
    assertType<Equals<typeof schema, Schema<number, number, "float">>>();
  });
});

Deno.test("number", async (t) => {
  await t.step("accepts every JavaScript number", () => {
    for (const value of [0, -0, 1, 1.5, NaN, Infinity, -Infinity]) {
      assert(valid(number(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (const value of ["1", 1n, true, null, undefined, {}]) {
      assert(!valid(number(), value), String(value));
    }
    assertEquals(
      validate(number(), "1").issues?.[0].message,
      "Expected a number, received string",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(number(), { io: "input" }), { type: "number" });
    assertEquals(toJSONSchema(number()), { type: "number" });
    const schema = number();
    assertType<Equals<typeof schema, Schema<number, number, "number">>>();
  });
});

Deno.test("number constraints", async (t) => {
  const schemas = { integer, float, number };

  for (const [name, make] of Object.entries(schemas)) {
    await t.step(`${name}: a range`, () => {
      const schema = make({ minimum: 1, maximum: 10 });
      assertEquals(validate(schema, 1), { value: 1 });
      assertEquals(validate(schema, 10), { value: 10 });
      assertEquals(messages(validate(schema, 0)), [
        "Expected a number of at least 1, received 0",
      ]);
      assertEquals(messages(validate(schema, 11)), [
        "Expected a number of at most 10, received 11",
      ]);
    });

    await t.step(`${name}: an exclusive range`, () => {
      const schema = make({ exclusiveMinimum: 0, exclusiveMaximum: 10 });
      assert(valid(schema, 1) && valid(schema, 9));
      assertEquals(messages(validate(schema, 0)), [
        "Expected a number greater than 0, received 0",
      ]);
      assertEquals(messages(validate(schema, 10)), [
        "Expected a number less than 10, received 10",
      ]);
    });

    await t.step(`${name}: multipleOf`, () => {
      const schema = make({ multipleOf: 5 });
      assert(valid(schema, 10) && valid(schema, 0) && valid(schema, -15));
      assertEquals(messages(validate(schema, 7)), [
        "Expected a multiple of 5, received 7",
      ]);
    });

    await t.step(`${name}: reports every violated constraint`, () => {
      const schema = make({ minimum: 10, multipleOf: 3, exclusiveMaximum: 4 });
      assertEquals(kinds(validate(schema, 4)), [
        "minimum",
        "exclusiveMaximum",
        "multipleOf",
      ]);
      assertEquals(kinds(validate(schema, "4")), ["type"]);
    });

    await t.step(
      `${name}: exports the constraints as JSON Schema keywords`,
      () => {
        const type = name === "integer" ? "integer" : "number";
        const schema = make({
          minimum: 1,
          maximum: 2,
          exclusiveMinimum: 0,
          exclusiveMaximum: 3,
          multipleOf: 1,
        });
        const expected = {
          type,
          minimum: 1,
          maximum: 2,
          exclusiveMinimum: 0,
          exclusiveMaximum: 3,
          multipleOf: 1,
        };
        assertEquals(toJSONSchema(schema, { io: "input" }), expected);
        assertEquals(toJSONSchema(schema), expected);
        assertEquals(toJSONSchema(make()), { type });
      },
    );

    await t.step(`${name}: rejects options that are not valid`, () => {
      assertThrows(() => make({ minimum: NaN }), TypeError, "finite number");
      assertThrows(
        () => make({ maximum: Infinity }),
        TypeError,
        "finite number",
      );
      assertThrows(() => make({ multipleOf: 0 }), TypeError, "greater than 0");
      assertThrows(() => make({ multipleOf: -2 }), TypeError, "greater than 0");
      assertThrows(
        () => make({ minimum: 5, maximum: 1 }),
        TypeError,
        "minimum (5) must not be greater than maximum (1)",
      );
      assertThrows(
        () => make({ exclusiveMinimum: 3, exclusiveMaximum: 3 }),
        TypeError,
        "exclusiveMinimum",
      );
      // equal limits are fine
      assert(valid(make({ minimum: 2, maximum: 2 }), 2));
    });
  }

  await t.step("multipleOf tolerates floating point error", () => {
    assert(valid(float({ multipleOf: 0.1 }), 0.3));
    assert(valid(float({ multipleOf: 0.01 }), 1.37));
    assert(!valid(float({ multipleOf: 0.1 }), 0.35));
    assert(!valid(number({ multipleOf: 0.5 }), Infinity));
  });

  await t.step("the type check comes first", () => {
    assertEquals(messages(validate(integer({ minimum: 1 }), 1.5)), [
      "Expected an integer, received number",
    ]);
    assertEquals(messages(validate(float({ minimum: 1 }), NaN)), [
      "Expected a finite number, received number",
    ]);
  });
});

Deno.test("boolean", async (t) => {
  await t.step("accepts booleans", () => {
    assertEquals(validate(boolean(), true), { value: true });
    assertEquals(validate(boolean(), false), { value: false });
  });

  await t.step("rejects everything else", () => {
    for (const value of [0, 1, "true", "", null, undefined]) {
      assert(!valid(boolean(), value), String(value));
    }
    assertEquals(
      validate(boolean(), 0).issues?.[0].message,
      "Expected a boolean, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(boolean(), { io: "input" }), { type: "boolean" });
    assertEquals(toJSONSchema(boolean()), { type: "boolean" });
    const schema = boolean();
    assertType<Equals<typeof schema, Schema<boolean, boolean, "boolean">>>();
  });
});

Deno.test("symbol", async (t) => {
  await t.step("accepts symbols", () => {
    const local = Symbol("id");
    assertEquals(validate(symbol(), local), { value: local });
    for (const value of [Symbol(), Symbol.for("shared"), Symbol.iterator]) {
      assert(valid(symbol(), value), String(value.description));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of ["id", 1, true, null, undefined, {}, [], Object(Symbol())]
    ) {
      assert(
        !valid(symbol(), value),
        Object.prototype.toString.call(value),
      );
    }
    assertEquals(validate(symbol(), "id"), {
      issues: [typeIssue("a symbol", "id", "string")],
    });
  });

  await t.step("exports a JSON Schema that accepts everything", () => {
    assertEquals(toJSONSchema(symbol(), { io: "input" }), {});
    assertEquals(toJSONSchema(symbol()), {});
  });

  await t.step("infers its types", () => {
    const schema = symbol();
    assertType<Equals<typeof schema, Schema<symbol, symbol, "symbol">>>();
  });
});

Deno.test("func", async (t) => {
  await t.step("accepts functions", () => {
    const fn = () => 1;
    assertEquals(validate(func(), fn), { value: fn });
    class Point {}
    for (
      const value of [
        function () {},
        () => {},
        async () => {},
        function* () {},
        Point,
        Math.max,
        Symbol,
        new Proxy(() => {}, {}),
      ]
    ) {
      assert(valid(func(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [
        "fn",
        1,
        null,
        undefined,
        {},
        [],
        { call() {} },
        Symbol("s"),
      ]
    ) {
      assert(!valid(func(), value), String(value));
    }
    assertEquals(validate(func(), "fn"), {
      issues: [typeIssue("a function", "fn", "string")],
    });
  });

  await t.step("only checks that it is a function", () => {
    assert(valid(func<(a: number, b: string) => boolean>(), () => 1));
  });

  await t.step("exports a JSON Schema that accepts everything", () => {
    assertEquals(toJSONSchema(func(), { io: "input" }), {});
    assertEquals(toJSONSchema(func()), {});
  });

  await t.step("infers the function type", () => {
    const any = func();
    assertType<Equals<Output<typeof any>, AnyFunction>>();
    const typed = func<(index: number) => string>();
    assertType<
      Equals<
        typeof typed,
        Schema<
          (index: number) => string,
          (index: number) => string,
          "function"
        >
      >
    >();
    assertEquals(typed.kind, "function");
  });
});

Deno.test("null_", async (t) => {
  await t.step("accepts only null", () => {
    assertEquals(validate(null_(), null), { value: null });
    for (const value of [undefined, 0, "", false, [], {}]) {
      assert(!valid(null_(), value), String(value));
    }
    assertEquals(
      validate(null_(), undefined).issues?.[0].message,
      "Expected null, received undefined",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(null_(), { io: "input" }), { type: "null" });
    assertEquals(toJSONSchema(null_()), { type: "null" });
    const schema = null_();
    assertType<Equals<typeof schema, Schema<null, null, "null">>>();
  });
});

Deno.test("literal", async (t) => {
  await t.step("accepts only the value", () => {
    assertEquals(validate(literal("admin"), "admin"), { value: "admin" });
    assertEquals(validate(literal(1), 1), { value: 1 });
    assertEquals(validate(literal(true), true), { value: true });
    assertEquals(validate(literal(null), null), { value: null });
  });

  await t.step("compares by value and type", () => {
    assert(!valid(literal("admin"), "user"));
    assert(!valid(literal(1), "1"));
    assert(!valid(literal(1), true));
    assert(!valid(literal(0), false));
    assert(!valid(literal(null), undefined));
    assert(!valid(literal("a"), ["a"]));
  });

  await t.step("reports an issue with the expected value", () => {
    assertEquals(validate(literal("admin"), "user"), {
      issues: [
        issue("literal", 'Expected "admin", received "user"', "admin", "user"),
      ],
    });
    assertEquals(
      validate(literal(1), "1").issues?.[0].message,
      'Expected 1, received "1"',
    );
    assertEquals(
      validate(literal(null), undefined).issues?.[0].message,
      "Expected null, received undefined",
    );
  });

  await t.step("compares numbers with ===", () => {
    assert(valid(literal(0), -0));
    assert(valid(literal(-0), 0));
    // NaN is never equal to itself, so it is never accepted
    assert(!valid(literal(NaN), NaN));
  });

  await t.step("exports a const", () => {
    assertEquals(toJSONSchema(literal("a"), { io: "input" }), { const: "a" });
    assertEquals(toJSONSchema(literal(1)), { const: 1 });
    assertEquals(toJSONSchema(literal(null)), { const: null });
  });

  await t.step("infers the literal type", () => {
    const schema = literal("admin");
    assertType<
      Equals<typeof schema, Schema<"admin", "admin", "literal">>
    >();
    const one = literal(1);
    assertType<Equals<Output<typeof one>, 1>>();
    const yes = literal(true);
    assertType<Equals<Output<typeof yes>, true>>();
  });
});

Deno.test("enumerator", async (t) => {
  await t.step("accepts only the values", () => {
    const schema = enumerator(["on", "off"]);
    assertEquals(validate(schema, "on"), { value: "on" });
    assertEquals(validate(schema, "off"), { value: "off" });
    assert(!valid(schema, "dim"));
    assert(!valid(schema, undefined));
    assert(valid(enumerator([1, 2, null, true]), null));
    assert(!valid(enumerator([1, 2]), "1"));
  });

  await t.step("rejects every value when empty", () => {
    assert(!valid(enumerator([]), "a"));
  });

  await t.step("reports an issue with the expected values", () => {
    assertEquals(validate(enumerator(["on", "off"]), "dim"), {
      issues: [
        issue(
          "enumerator",
          'Expected one of ["on","off"], received "dim"',
          ["on", "off"],
          "dim",
        ),
      ],
    });
  });

  await t.step("compares with ===, like literal", () => {
    assert(valid(enumerator([0]), -0));
    assert(!valid(enumerator([NaN]), NaN));
    assert(!valid(enumerator([1]), new Number(1)));
  });

  await t.step("exports an enum", () => {
    assertEquals(toJSONSchema(enumerator(["a", 1, null]), { io: "input" }), {
      enum: ["a", 1, null],
    });
    assertEquals(toJSONSchema(enumerator(["a"])), { enum: ["a"] });
  });

  await t.step("infers the union of the values", () => {
    const schema = enumerator(["on", "off"]);
    assertType<
      Equals<typeof schema, Schema<"on" | "off", "on" | "off", "enumerator">>
    >();
    const mixed = enumerator(["a", 1, null]);
    assertType<Equals<Output<typeof mixed>, "a" | 1 | null>>();
  });
});

Deno.test("instanceOf", async (t) => {
  class Point {
    constructor(readonly x: number, readonly y: number) {}
  }
  class Point3D extends Point {
    constructor(x: number, y: number, readonly z: number) {
      super(x, y);
    }
  }
  class Other {}
  abstract class Shape {}
  class Circle extends Shape {}

  await t.step("accepts instances of the class", () => {
    const point = new Point(1, 2);
    assertEquals(validate(instanceOf(Point), point), { value: point });
    assert(valid(instanceOf(Date), new Date()));
    assert(valid(instanceOf(Map), new Map()));
    assert(valid(instanceOf(Uint8Array), new Uint8Array(2)));
    assert(valid(instanceOf(Array), []));
    assert(valid(instanceOf(Error), new TypeError("x")));
  });

  await t.step("accepts instances of subclasses", () => {
    assert(valid(instanceOf(Point), new Point3D(1, 2, 3)));
    assert(valid(instanceOf(Shape), new Circle()));
    assert(valid(instanceOf(Object), new Point(1, 2)));
  });

  await t.step("accepts objects created from the prototype", () => {
    assert(valid(instanceOf(Point), Object.create(Point.prototype)));
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [
        { x: 1, y: 2 },
        new Other(),
        new Point3D(1, 2, 3).x,
        "Point",
        null,
        undefined,
        1,
        Point,
      ]
    ) {
      assert(!valid(instanceOf(Point), value), String(value));
    }
    // a superclass instance is not an instance of the subclass
    assert(!valid(instanceOf(Point3D), new Point(1, 2)));
    assert(!valid(instanceOf(Date), "2024-01-01"));
  });

  await t.step("reports the class that was expected and received", () => {
    const received = { x: 1, y: 2 };
    assertEquals(validate(instanceOf(Point), received), {
      issues: [
        issue(
          "instanceOf",
          "Expected an instance of Point, received Object",
          Point,
          received,
        ),
      ],
    });
    assertEquals(
      validate(instanceOf(Point), new Other()).issues?.[0].message,
      "Expected an instance of Point, received Other",
    );
    assertEquals(
      validate(instanceOf(Point), "a").issues?.[0].message,
      "Expected an instance of Point, received string",
    );
    assertEquals(
      validate(instanceOf(Point), null).issues?.[0].message,
      "Expected an instance of Point, received null",
    );
    assertEquals(
      validate(instanceOf(Point), []).issues?.[0].message,
      "Expected an instance of Point, received array",
    );
    assertEquals(
      validate(instanceOf(Point), Object.create(null)).issues?.[0].message,
      "Expected an instance of Point, received object",
    );
  });

  await t.step("handles anonymous classes", () => {
    const anonymous = (() => class {})();
    assertEquals(
      validate(instanceOf(anonymous), 1).issues?.[0].message,
      "Expected an instance of the class, received number",
    );
    assert(valid(instanceOf(anonymous), new anonymous()));
  });

  await t.step("follows a custom Symbol.hasInstance", () => {
    class Even {
      static [Symbol.hasInstance](value: unknown) {
        return typeof value === "number" && value % 2 === 0;
      }
    }
    assert(valid(instanceOf(Even), 2));
    assert(!valid(instanceOf(Even), 3));
  });

  await t.step("exports a JSON Schema that accepts everything", () => {
    assertEquals(toJSONSchema(instanceOf(Point), { io: "input" }), {});
    assertEquals(toJSONSchema(instanceOf(Point)), {});
  });

  await t.step("infers the instance type", () => {
    const point = instanceOf(Point);
    assertType<Equals<typeof point, Schema<Point, Point, "instanceOf">>>();
    const date = instanceOf(Date);
    assertType<Equals<Output<typeof date>, Date>>();
    const shape = instanceOf(Shape);
    assertType<Equals<Output<typeof shape>, Shape>>();
    assertEquals(point.kind, "instanceOf");
  });
});

Deno.test("unknown", async (t) => {
  await t.step("accepts every value", () => {
    for (const value of [1, "a", null, undefined, [], { a: 1 }, NaN]) {
      assert(valid(unknown(), value), String(value));
    }
    const value = { a: 1 };
    assertEquals(validate(unknown(), value), { value });
  });

  await t.step("exports a JSON Schema that accepts everything", () => {
    assertEquals(toJSONSchema(unknown(), { io: "input" }), {});
    assertEquals(toJSONSchema(unknown()), {});
  });

  await t.step("infers its types", () => {
    const schema = unknown();
    assertType<Equals<typeof schema, Schema<unknown, unknown, "unknown">>>();
  });
});

Deno.test("never", async (t) => {
  await t.step("rejects every value", () => {
    for (const value of [1, "a", null, undefined, [], { a: 1 }]) {
      assert(!valid(never(), value), String(value));
    }
    assertEquals(validate(never(), 1), {
      issues: [typeIssue("no value", 1, "number")],
    });
  });

  await t.step("exports a JSON Schema that rejects everything", () => {
    assertEquals(toJSONSchema(never(), { io: "input" }), { not: {} });
    assertEquals(toJSONSchema(never()), { not: {} });
  });

  await t.step("infers never", () => {
    const schema = never();
    assertType<Equals<typeof schema, Schema<never, never, "never">>>();
  });
});

Deno.test("nullable", async (t) => {
  await t.step("accepts null and what the schema accepts", () => {
    assertEquals(validate(nullable(string()), null), { value: null });
    assertEquals(validate(nullable(string()), "a"), { value: "a" });
    assertEquals(validate(nullable(integer()), 1), { value: 1 });
  });

  await t.step("rejects undefined and what the schema rejects", () => {
    assert(!valid(nullable(string()), undefined));
    assert(!valid(nullable(string()), 1));
    assertEquals(validate(nullable(string()), 1), {
      issues: [typeIssue("a string", 1, "number")],
    });
  });

  await t.step("infers its types", () => {
    const schema = nullable(string());
    assertType<
      Equals<typeof schema, Schema<string | null, string | null, "nullable">>
    >();
    assertType<Equals<Output<typeof schema>, string | null>>();
    assertType<Equals<Input<typeof schema>, string | null>>();
  });

  await t.step("exports a JSON Schema with null", () => {
    const expected = { anyOf: [{ type: "string" }, { type: "null" }] };
    assertEquals(toJSONSchema(nullable(string()), { io: "input" }), expected);
    assertEquals(toJSONSchema(nullable(string())), expected);
  });

  await t.step("keeps an input type that differs from the output", () => {
    const length = createSchema("length", {
      validate: (value) =>
        typeof value === "string"
          ? { value: value.length }
          : { issues: [{ message: "Expected a string" }] },
      jsonSchema: {
        input: () => ({ type: "string" }),
        output: () => ({ type: "integer" }),
      },
      types: undefined as unknown as StandardSchemaV1.Types<string, number>,
    });
    const schema = nullable(length);
    assertType<Equals<Input<typeof schema>, string | null>>();
    assertType<Equals<Output<typeof schema>, number | null>>();
    assertEquals(validate(schema, "abc"), { value: 3 });
    assertEquals(toJSONSchema(schema, { io: "input" }), {
      anyOf: [{ type: "string" }, { type: "null" }],
    });
    assertEquals(toJSONSchema(schema, { io: "output" }), {
      anyOf: [{ type: "integer" }, { type: "null" }],
    });
  });

  await t.step("passes the validate options on", () => {
    let received: unknown;
    const inner = createSchema("inner", {
      validate: (value, validateOptions) => {
        received = validateOptions;
        return { value };
      },
      jsonSchema: { input: () => ({}), output: () => ({}) },
    });
    validate(nullable(inner), 1, { libraryOptions: { a: 1 } });
    assertEquals(received, { libraryOptions: { a: 1 } });
  });
});

Deno.test("optional", async (t) => {
  await t.step("accepts undefined and what the schema accepts", () => {
    assertEquals(validate(optional(string()), undefined), { value: undefined });
    assertEquals(validate(optional(string()), "a"), { value: "a" });
    assertEquals(validate(optional(integer()), 1), { value: 1 });
  });

  await t.step("rejects null and what the schema rejects", () => {
    assert(!valid(optional(string()), null));
    assert(!valid(optional(string()), 1));
    assertEquals(
      validate(optional(string()), null).issues?.[0].message,
      "Expected a string, received null",
    );
  });

  await t.step("infers its types", () => {
    const schema = optional(string());
    assertType<
      Equals<
        typeof schema,
        Schema<string | undefined, string | undefined, "optional">
      >
    >();
    assertType<Equals<Output<typeof schema>, string | undefined>>();
  });

  await t.step("exports the JSON Schema of the nested schema", () => {
    assertEquals(toJSONSchema(optional(string()), { io: "input" }), {
      type: "string",
    });
    assertEquals(toJSONSchema(optional(string())), { type: "string" });
  });
});

Deno.test("nullish", async (t) => {
  await t.step("accepts null, undefined and what the schema accepts", () => {
    assertEquals(validate(nullish(string()), null), { value: null });
    assertEquals(validate(nullish(string()), undefined), { value: undefined });
    assertEquals(validate(nullish(string()), "a"), { value: "a" });
  });

  await t.step("rejects what the schema rejects", () => {
    assert(!valid(nullish(string()), 1));
    assertEquals(validate(nullish(string()), 1), {
      issues: [typeIssue("a string", 1, "number")],
    });
  });

  await t.step("is the same as nullable(optional(x))", () => {
    for (const value of [null, undefined, "a", 1, {}]) {
      assertEquals(
        validate(nullish(string()), value),
        validate(nullable(optional(string())), value),
      );
    }
  });

  await t.step("exports a JSON Schema with null", () => {
    const expected = { anyOf: [{ type: "string" }, { type: "null" }] };
    assertEquals(toJSONSchema(nullish(string()), { io: "input" }), expected);
    assertEquals(toJSONSchema(nullish(string())), expected);
  });

  await t.step("infers its types", () => {
    const schema = nullish(string());
    assertType<
      Equals<
        typeof schema,
        Schema<
          string | null | undefined,
          string | null | undefined,
          "nullish"
        >
      >
    >();
  });
});

Deno.test("default values", async (t) => {
  const upper = createSchema("upper", {
    validate: (value) =>
      typeof value === "string"
        ? { value: value.toUpperCase() }
        : { issues: [{ message: "Expected a string" }] },
    jsonSchema: {
      input: () => ({ type: "string" }),
      output: () => ({ type: "string" }),
    },
  });

  await t.step("optional uses the default instead of undefined", () => {
    const schema = optional(string(), { default: "x" });
    assertEquals(validate(schema, undefined), { value: "x" });
    assertEquals(validate(schema, "y"), { value: "y" });
    // null and other values are not replaced
    assert(!valid(schema, null));
    assert(!valid(schema, 1));
  });

  await t.step("a function makes a fresh default every time", () => {
    let calls = 0;
    const schema = optional(array(string()), {
      default: () => {
        calls++;
        return [];
      },
    });
    const first = (validate(schema, undefined) as { value: unknown[] }).value;
    const second = (validate(schema, undefined) as { value: unknown[] }).value;
    assertEquals(calls, 2);
    assert(first !== second);
    assertEquals(first, []);
    // a value that is given does not call it
    validate(schema, ["a"]);
    assertEquals(calls, 2);
  });

  await t.step("the default flows through the schema", () => {
    assertEquals(validate(optional(upper, { default: "abc" }), undefined), {
      value: "ABC",
    });
    // an invalid default is reported by the schema
    const schema = optional(integer({ minimum: 5 }), { default: 1 });
    assertEquals(
      messages(validate(schema, undefined)),
      ["Expected a number of at least 5, received 1"],
    );
  });

  await t.step("works with async schemas", async () => {
    const schema = optional(asyncString, { default: "x" });
    assertEquals(await validateAsync(schema, undefined), { value: "x" });
    assertEquals(await validateAsync(schema, "y"), { value: "y" });
  });

  await t.step("nullish only replaces undefined", () => {
    const schema = nullish(string(), { default: "x" });
    assertEquals(validate(schema, undefined), { value: "x" });
    assertEquals(validate(schema, null), { value: null });
    assertEquals(validate(schema, "y"), { value: "y" });
    assertEquals(
      validate(nullish(string(), { default: () => "z" }), undefined),
      { value: "z" },
    );
  });

  await t.step("is the default of the JSON Schema", () => {
    assertEquals(toJSONSchema(optional(string(), { default: "x" })), {
      type: "string",
      default: "x",
    });
    assertEquals(
      toJSONSchema(optional(array(string()), { default: () => ["a"] }), {
        io: "input",
      }),
      { type: "array", items: { type: "string" }, default: ["a"] },
    );
    assertEquals(toJSONSchema(nullish(integer(), { default: 1 })), {
      anyOf: [{ type: "integer" }, { type: "null" }],
      default: 1,
    });
    assertEquals(toJSONSchema(optional(string())), { type: "string" });
    // a falsy default is still a default
    assertEquals(toJSONSchema(optional(boolean(), { default: false })), {
      type: "boolean",
      default: false,
    });
  });

  await t.step("removes undefined from the output type", () => {
    const withDefault = optional(string(), { default: "x" });
    assertType<
      Equals<
        typeof withDefault,
        Schema<string | undefined, string, "optional">
      >
    >();
    const withFunction = optional(integer(), { default: () => 1 });
    assertType<Equals<Output<typeof withFunction>, number>>();
    const without = optional(string());
    assertType<Equals<Output<typeof without>, string | undefined>>();
    const nullishDefault = nullish(string(), { default: "x" });
    assertType<Equals<Output<typeof nullishDefault>, string | null>>();
    assertType<
      Equals<Input<typeof nullishDefault>, string | null | undefined>
    >();
  });

  await t.step("the default has the input type of the schema", () => {
    // @ts-expect-error a number is not a string
    optional(string(), { default: 1 });
    // @ts-expect-error a function making a number is not a function making a string
    optional(string(), { default: () => 1 });
    // @ts-expect-error nullable has no default
    nullable(string(), { default: "x" });
  });
});

Deno.test("nullable and optional compose and nest async schemas", async (t) => {
  await t.step("nullable(optional(x)) and optional(nullable(x))", () => {
    for (
      const schema of [
        nullable(optional(string())),
        optional(nullable(string())),
      ]
    ) {
      assertEquals(validate(schema, null), { value: null });
      assertEquals(validate(schema, undefined), { value: undefined });
      assertEquals(validate(schema, "a"), { value: "a" });
      assert(!valid(schema, 1));
    }

    const schema = optional(nullable(string()));
    assertType<Equals<Output<typeof schema>, string | null | undefined>>();
    assertEquals(schema.kind, "optional");
    assertEquals(toJSONSchema(schema), {
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });

  await t.step("stays sync for sync schemas", () => {
    assert(!(validateAsync(nullable(string()), "a") instanceof Promise));
    assert(!(validateAsync(optional(string()), "a") instanceof Promise));
  });

  await t.step("passes the result of an async schema through", async () => {
    const asyncString = createSchema("asyncString", {
      validate: (value) =>
        Promise.resolve(
          typeof value === "string"
            ? { value }
            : { issues: [{ message: "Expected a string" }] },
        ),
      jsonSchema: {
        input: () => ({ type: "string" }),
        output: () => ({ type: "string" }),
      },
    });

    const nullableAsync = nullable(asyncString);
    // null never reaches the async schema, so it stays sync
    assertEquals(validate(nullableAsync, null), { value: null });
    assertEquals(await validateAsync(nullableAsync, "a"), { value: "a" });
    assertEquals(await validateAsync(nullableAsync, 1), {
      issues: [{ message: "Expected a string" }],
    });

    const optionalAsync = optional(asyncString);
    assertEquals(validate(optionalAsync, undefined), { value: undefined });
    assertEquals(await validateAsync(optionalAsync, "a"), { value: "a" });
  });
});

Deno.test("schemas accept empty options", () => {
  assertEquals(validate(string({}), "a"), { value: "a" });
  assertEquals(validate(integer({}), 1), { value: 1 });
  assertEquals(validate(float({}), 1.5), { value: 1.5 });
  assertEquals(validate(number({}), 1.5), { value: 1.5 });
  assertEquals(validate(boolean({}), true), { value: true });
  assertEquals(validate(nullable(string(), {}), null), { value: null });
  assertEquals(validate(optional(string(), {}), undefined), {
    value: undefined,
  });
});
