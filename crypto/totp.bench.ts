import { generateTotp, verifyTotp } from "./totp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";

Deno.bench("generateTotp()", async () => {
  await generateTotp(secret, { time: 1000000000 });
});

Deno.bench("verifyTotp()", async () => {
  await verifyTotp("270103", secret, { time: 1000000000 });
});
