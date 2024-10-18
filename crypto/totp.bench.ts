import { generateTotp, verifyTotp } from "./totp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";

Deno.bench("generateTotp()", async () => {
  await generateTotp(secret, 1000000000), "270103";
});

Deno.bench("verifyTotp()", async () => {
  await verifyTotp("270103", secret, 1000000000);
});
