import { assertEquals, assertRejects } from "@std/assert";
import { ScramClient, ScramError } from "./scram.ts";

// RFC 5802 test vector
const sha1 = {
  serverFirst:
    "r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096",
  clientFinal:
    "c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=",
  serverFinal: "v=rmF9pqV8S7suAoZWja4dJRkFsKQ=",
};

// RFC 7677 test vector
const sha256 = {
  serverFirst:
    "r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096",
  clientFinal:
    "c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=",
  serverFinal: "v=6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=",
};

Deno.test("ScramClient", async (t) => {
  await t.step("SCRAM-SHA-1", async () => {
    const scram = new ScramClient({
      hash: "SHA-1",
      user: "user",
      password: "pencil",
      nonce: "fyko+d2lbbFgONRv9qkxdawL",
    });
    assertEquals(scram.mechanism, "SCRAM-SHA-1");
    assertEquals(scram.clientFirst(), "n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL");
    assertEquals(await scram.clientFinal(sha1.serverFirst), sha1.clientFinal);
    await scram.verify(sha1.serverFinal);
  });

  await t.step("SCRAM-SHA-256", async () => {
    const scram = new ScramClient({
      user: "user",
      password: "pencil",
      nonce: "rOprNGfwEbeRWgbNEkqO",
    });
    assertEquals(scram.mechanism, "SCRAM-SHA-256");
    assertEquals(
      await scram.clientFinal(sha256.serverFirst),
      sha256.clientFinal,
    );
    await scram.verify(sha256.serverFinal);
  });

  await t.step("SCRAM-SHA-512 proofs have the hash length", async () => {
    const scram = new ScramClient({ hash: "SHA-512", password: "pencil" });
    assertEquals(scram.mechanism, "SCRAM-SHA-512");
    const nonce = scram.clientFirst().slice("n,,n=,r=".length);
    const final = await scram.clientFinal(
      `r=${nonce}server,s=${new Uint8Array(16).toBase64()},i=1`,
    );
    assertEquals(final.split(",p=")[1].length, 88); // 64 bytes in base64
  });

  await t.step("escapes the user name", () => {
    const scram = new ScramClient({ user: "a=b,c", password: "", nonce: "n" });
    assertEquals(scram.clientFirst(), "n,,n=a=3Db=2Cc,r=n");
  });

  await t.step("generates a nonce", () => {
    const first = new ScramClient({ password: "pencil" }).clientFirst();
    const second = new ScramClient({ password: "pencil" }).clientFirst();
    assertEquals(first.length, "n,,n=,r=".length + 24);
    assertEquals(first === second, false);
  });

  await t.step("rejects invalid server messages", async () => {
    const options = {
      user: "user",
      password: "pencil",
      nonce: "rOprNGfwEbeRWgbNEkqO",
    };
    const scram = new ScramClient(options);
    await assertRejects(() => scram.verify("v=x"), ScramError, "before");
    await assertRejects(
      () => scram.clientFinal("r=other,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096"),
      ScramError,
    );
    await assertRejects(
      () =>
        scram.clientFinal(
          "r=rOprNGfwEbeRWgbNEkqO,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=0",
        ),
      ScramError,
    );
    await scram.clientFinal(sha256.serverFirst);
    await assertRejects(() => scram.verify("v=invalid!"), ScramError);
    await assertRejects(
      () => scram.verify("v=7rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4="),
      ScramError,
      "signature",
    );
    await assertRejects(
      () => scram.verify("e=invalid-proof"),
      ScramError,
      "invalid-proof",
    );
  });
});
