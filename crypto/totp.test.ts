import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { generateTotp, verifyTotp } from "./totp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";
const time = 1704067200000;

Deno.test("generateTotp()", async () => {
  assertEquals(await generateTotp(secret, { time }), "342743");
  assertEquals(
    await generateTotp(secret, { epoch: 944996400, time }),
    "149729",
  );
  assertEquals(
    await generateTotp(secret, { epoch: 976618800, time }),
    "372018",
  );
  assertEquals(
    await generateTotp(secret, { epoch: 1723245550, time }),
    "665341",
  );
  assertEquals(await generateTotp(secret, { epoch: time, time }), "187492");
});

Deno.test("generateTotp() defaults to the current time", async () => {
  const before = await generateTotp(secret, { time: Date.now() });
  const now = await generateTotp(secret);
  const after = await generateTotp(secret, { time: Date.now() });
  assert(now === before || now === after);
});

Deno.test("generateTotp() RFC 6238 test vectors", async () => {
  const encoder = new TextEncoder();
  const keys = {
    "SHA-1": encoder.encode("12345678901234567890"),
    "SHA-256": encoder.encode("12345678901234567890123456789012"),
    "SHA-512": encoder.encode(
      "1234567890123456789012345678901234567890123456789012345678901234",
    ),
  } as const;
  const vectors: [number, Record<keyof typeof keys, string>][] = [
    [59, { "SHA-1": "94287082", "SHA-256": "46119246", "SHA-512": "90693936" }],
    [1111111109, {
      "SHA-1": "07081804",
      "SHA-256": "68084774",
      "SHA-512": "25091201",
    }],
    [1234567890, {
      "SHA-1": "89005924",
      "SHA-256": "91819424",
      "SHA-512": "93441116",
    }],
    [20000000000, {
      "SHA-1": "65353130",
      "SHA-256": "77737706",
      "SHA-512": "47863826",
    }],
  ];
  for (const [seconds, expected] of vectors) {
    for (const hash of ["SHA-1", "SHA-256", "SHA-512"] as const) {
      assertEquals(
        await generateTotp(keys[hash], {
          time: seconds * 1000,
          digits: 8,
          hash,
        }),
        expected[hash],
        `${hash} at ${seconds}`,
      );
    }
  }
});

Deno.test("generateTotp() period", async () => {
  // With a 60 second period, 59 and 0 seconds are in the same time step.
  assertEquals(
    await generateTotp(secret, { time: 59000, period: 60 }),
    await generateTotp(secret, { time: 0, period: 60 }),
  );
  await assertRejects(
    () => generateTotp(secret, { period: 0 }),
    RangeError,
    "'period'",
  );
});

Deno.test("verifyTotp()", async () => {
  assert(await verifyTotp("342743", secret, { time }));
  assert(await verifyTotp("149729", secret, { epoch: 944996400, time }));
  assert(await verifyTotp("372018", secret, { epoch: 976618800, time }));
  assert(await verifyTotp("665341", secret, { epoch: 1723245550, time }));
  assert(await verifyTotp("187492", secret, { epoch: time, time }));
  assertFalse(await verifyTotp("342744", secret, { time }));
  assert(await verifyTotp(await generateTotp(secret), secret));
});
