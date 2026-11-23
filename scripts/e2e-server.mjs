import { spawn, spawnSync } from "node:child_process";

const next = "node_modules/next/dist/bin/next";
const production = process.env.E2E_PRODUCTION === "1";
if (production) {
  const build = spawnSync(process.execPath, [next, "build"], {
    stdio: "inherit",
    env: process.env,
  });
  if (build.error || build.status !== 0) process.exit(build.status || 1);
}
const server = spawn(
  process.execPath,
  [
    next,
    production ? "start" : "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    process.env.E2E_PORT || "3100",
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("error", () => process.exit(1));
server.on("exit", (code) => process.exit(code ?? 1));
