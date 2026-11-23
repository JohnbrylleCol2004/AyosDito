// Match the browser's Origin against the incoming authority. Next's internal
// request URL can use the server's bind hostname after passing through Proxy.
export function hasSameOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.origin === origin &&
      parsed.host === host.toLowerCase()
    );
  } catch {
    return false;
  }
}
