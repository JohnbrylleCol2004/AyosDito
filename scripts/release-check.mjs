import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const browser = process.argv.includes("--browser");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];
if (browser)
  required.push(
    "DEMO_RESIDENT_EMAIL",
    "DEMO_RESIDENT_PASSWORD",
    "DEMO_ADMIN_EMAIL",
    "DEMO_ADMIN_PASSWORD",
  );
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(
    `Release verification needs: ${missing.join(", ")}. Values are never printed.`,
  );
  process.exit(1);
}
try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error();
} catch {
  console.error(
    "Release verification requires a valid HTTP(S) Supabase Project URL.",
  );
  process.exit(1);
}
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this through npm run release:check.");
function run(script, args = [], env = {}) {
  console.log(`\nRelease check: ${script}`);
  const result = spawnSync(process.execPath, [npm, "run", script, ...args], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
for (const script of ["format:check", "lint", "test", "build", "typecheck"])
  run(script);
if (browser) run("test:e2e", [], { E2E_PRODUCTION: "1" });
function scan(dir) {
  if (!existsSync(dir)) throw new Error(`Missing client build: ${dir}`);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.(js|map)$/.test(entry.name)) {
      const content = readFileSync(path, "utf8");
      for (const name of [
        "SUPABASE_SECRET_KEY",
        "DEMO_RESIDENT_PASSWORD",
        "DEMO_ADMIN_PASSWORD",
        "VAPID_PRIVATE_KEY",
        "PUSH_CRON_SECRET",
      ]) {
        if (process.env[name] && content.includes(process.env[name])) {
          console.error(
            `Private value detected in client output (${name}); release blocked.`,
          );
          process.exit(1);
        }
      }
    }
  }
}
scan(".next/static");
if (browser) scan(".next-e2e/static");
console.log(
  "\nRelease checks passed; private values were not found in client bundles. This does not deploy the app.",
);
