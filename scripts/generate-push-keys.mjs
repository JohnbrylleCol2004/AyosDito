import * as webpush from "web-push";
import { randomBytes } from "node:crypto";
import { readFile, appendFile } from "node:fs/promises";
const keys = webpush.generateVAPIDKeys();
if (process.argv.includes("--write-env")) {
  const existing = await readFile(".env.local", "utf8").catch(() => "");
  const values = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: "https://ayosdito.vercel.app",
    PUSH_CRON_SECRET: randomBytes(32).toString("hex"),
  };
  const missing = Object.entries(values).filter(
    ([name]) => !new RegExp(`^${name}=.+$`, "m").test(existing),
  );
  if (
    missing.some(([name]) => name === "VAPID_PRIVATE_KEY") !==
    missing.some(([name]) => name === "NEXT_PUBLIC_VAPID_PUBLIC_KEY")
  )
    throw new Error(
      "Existing VAPID pair is incomplete. Preserve existing subscriptions and repair the pair explicitly.",
    );
  if (missing.length)
    await appendFile(
      ".env.local",
      "\n# Web Push configuration (private; do not commit)\n" +
        missing.map(([name, value]) => `${name}=${value}`).join("\n") +
        "\n",
    );
  console.log(
    `Configured ${missing.length} missing local push environment entries. No values printed; existing entries preserved.`,
  );
  process.exit(0);
}
console.log(
  "Copy these values privately to your environment settings. Never commit the private key.",
);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:your-admin@example.com");
