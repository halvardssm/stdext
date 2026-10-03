import { assertEquals } from "@std/assert";
import { md5Password } from "./_auth.ts";

Deno.test("md5Password", async () => {
  // Computed by Postgres:
  // SELECT 'md5' || md5(convert_to(md5('passworduser'), 'UTF8') || '\x01020304'::bytea)
  assertEquals(
    await md5Password("user", "password", new Uint8Array([1, 2, 3, 4])),
    "md5a3576f1ae039b8996bc4fc2720f9c71a",
  );
});
