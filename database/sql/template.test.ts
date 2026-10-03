import { assertEquals, assertThrows } from "@std/assert";
import { QueryError } from "./errors.ts";
import { isSqlTemplate, renderStatement, sql } from "./template.ts";

Deno.test("sql", () => {
  const id = 1;
  const name = "Alice";
  const template = sql`SELECT * FROM users WHERE id = ${id} AND name = ${name}`;
  assertEquals(template.strings, [
    "SELECT * FROM users WHERE id = ",
    " AND name = ",
    "",
  ]);
  assertEquals(template.values, [1, "Alice"]);
  assertEquals(Object.isFrozen(template), true);
  assertEquals(sql`SELECT 1`, { strings: ["SELECT 1"], values: [] });
});

Deno.test("isSqlTemplate", () => {
  assertEquals(isSqlTemplate(sql`SELECT ${1}`), true);
  assertEquals(isSqlTemplate({ strings: ["a", "b"], values: [1] }), true);
  assertEquals(isSqlTemplate("SELECT 1"), false);
  assertEquals(isSqlTemplate(null), false);
  assertEquals(isSqlTemplate({ strings: ["a"], values: [1] }), false);
  assertEquals(isSqlTemplate({ strings: [1], values: [] }), false);
});

Deno.test("renderStatement", () => {
  const template = sql`INSERT INTO t VALUES (${1}, ${"a"})`;
  assertEquals(renderStatement(template, undefined, () => "?"), {
    sql: "INSERT INTO t VALUES (?, ?)",
    params: [1, "a"],
  });
  assertEquals(renderStatement(template, undefined, (i) => `$${i + 1}`), {
    sql: "INSERT INTO t VALUES ($1, $2)",
    params: [1, "a"],
  });
  // Text is returned as is
  assertEquals(renderStatement("SELECT ?", [1], () => "?"), {
    sql: "SELECT ?",
    params: [1],
  });
  assertThrows(
    () => renderStatement(template, [1], () => "?"),
    QueryError,
    "Parameters can not be given",
  );
});
