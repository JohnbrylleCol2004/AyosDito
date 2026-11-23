import { defineConfig, devices } from "@playwright/test";
import { supabaseConfig } from "./src/lib/supabase/config";

if (
  !supabaseConfig() &&
  (process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
) {
  console.warn(
    "[AyosDito] Supabase configuration is incomplete or invalid. " +
      "Set NEXT_PUBLIC_SUPABASE_URL to the full Project URL (https://<project-ref>.supabase.co) " +
      "and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to its publishable key in .env.local. " +
      "Setup checks will run; login and live-account checks will be skipped. No environment values are printed.",
  );
}

const port = process.env.E2E_PORT || "3100";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: {
    env: { AYOSDITO_E2E: "1" },
    command: "node scripts/e2e-server.mjs",
    url: baseURL,
    reuseExistingServer: false,
    timeout: process.env.E2E_PRODUCTION === "1" ? 240_000 : 120_000,
  },
});
