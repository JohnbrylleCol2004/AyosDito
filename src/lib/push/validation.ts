export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
export function parsePushSubscription(
  input: unknown,
): PushSubscriptionInput | null {
  if (!input || typeof input !== "object") return null;
  const { endpoint, keys } = input as Partial<PushSubscriptionInput>;
  if (
    typeof endpoint !== "string" ||
    endpoint.length > 2048 ||
    !keys ||
    typeof keys !== "object"
  )
    return null;
  try {
    const url = new URL(endpoint);
    const permitted =
      url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname.endsWith(".push.services.mozilla.com") ||
      url.hostname === "web.push.apple.com" ||
      url.hostname.endsWith(".notify.windows.com");
    if (
      !permitted ||
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash
    )
      return null;
    for (const [key, length] of [
      [keys.p256dh, 65],
      [keys.auth, 16],
    ] as const) {
      if (typeof key !== "string" || !/^[A-Za-z0-9_-]+$/.test(key)) return null;
      const bytes = Buffer.from(key, "base64url");
      if (bytes.length !== length || bytes.toString("base64url") !== key)
        return null;
    }
    if (Buffer.from(keys.p256dh, "base64url")[0] !== 4) return null;
    return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
  } catch {
    return null;
  }
}
