import { generateHotp, verifyHotp } from "./hotp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";

Deno.bench("generateHotp()", async () => {
  await generateHotp(secret, 1000000000), "270103";
});

Deno.bench("verifyHotp()", async () => {
  await verifyHotp("270103", secret, 1000000000);
});
