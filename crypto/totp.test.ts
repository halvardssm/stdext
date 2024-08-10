import { assert, assertEquals } from "@std/assert";
import { generateTotp, verifyTotp } from "./totp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";
const t = 1704067200000;

Deno.test("generateTotp()", async () => {
  console.log();
  assertEquals(await generateTotp(secret, 0, t), "342743");
  assertEquals(await generateTotp(secret, 944996400, t), "149729");
  assertEquals(await generateTotp(secret, 976618800, t), "372018");
  assertEquals(await generateTotp(secret, 1723245550, t), "665341");
  assertEquals(await generateTotp(secret, t, t), "187492");
});

Deno.test("verifyTotp()", async () => {
  assert(await verifyTotp("342743", secret, 0, t));
  assert(await verifyTotp("149729", secret, 944996400, t));
  assert(await verifyTotp("372018", secret, 976618800, t));
  assert(await verifyTotp("665341", secret, 1723245550, t));
  assert(await verifyTotp("187492", secret, t, t));
});
