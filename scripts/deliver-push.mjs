if (!process.env.SITE_URL || !process.env.PUSH_CRON_SECRET)
  throw new Error(
    "Set SITE_URL and PUSH_CRON_SECRET privately before running delivery.",
  );
const url = new URL("/api/push/deliver", process.env.SITE_URL);
const response = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.PUSH_CRON_SECRET}` },
  signal: AbortSignal.timeout(55000),
});
if (!response.ok)
  throw new Error(
    `Push worker returned HTTP ${response.status}. Check server configuration; no secret values are printed.`,
  );
console.log(await response.json());
