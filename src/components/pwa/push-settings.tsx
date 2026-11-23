"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff } from "lucide-react";
import { useDictionary } from "@/components/language-provider";

const subscribe = () => () => {};
const supported = () =>
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
const serverSupported = () => false;
function decodeKey(value: string) {
  const bytes = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, (c) => c.charCodeAt(0));
}
export function PushSettings({
  publicKey,
  locale,
}: {
  publicKey: string | null;
  locale: string;
}) {
  const capable = useSyncExternalStore(subscribe, supported, serverSupported);
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const t = useDictionary();
  useEffect(() => {
    if (capable)
      void navigator.serviceWorker
        .getRegistration()
        .then(async (reg) => {
          const sub = await reg?.pushManager.getSubscription();
          if (!sub) return;
          const response = await fetch("/api/push/subscription", {
            cache: "no-store",
          });
          const data = (await response.json()) as { endpoints?: string[] };
          setEnabled(response.ok && !!data.endpoints?.includes(sub.endpoint));
        })
        .catch(() => {});
  }, [capable]);
  const fil = locale === "fil";
  async function toggle() {
    setBusy(true);
    setError(false);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !publicKey) throw new Error("unavailable");
      const current = await reg.pushManager.getSubscription();
      if (current && enabled) {
        const response = await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: current.endpoint }),
        });
        if (!response.ok) throw new Error("request");
        await current.unsubscribe();
        setEnabled(false);
      } else {
        if ((await Notification.requestPermission()) !== "granted")
          throw new Error("permission");
        const subscription =
          current ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeKey(publicKey),
          }));
        const response = await fetch("/api/push/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        if (!response.ok) {
          await subscription.unsubscribe();
          throw new Error("request");
        }
        setEnabled(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel operations-panel">
      <h2>{fil ? "Mga push alert" : "Push alerts"}</h2>
      <p>
        {fil
          ? "Opsyonal na generic alert kapag may update. Hindi kasama ang pribadong detalye ng ulat."
          : "Optional, generic alerts when a report is updated. Private report details are never included."}
      </p>
      {!publicKey ? (
        <p>
          {fil
            ? "Hindi pa naka-enable ang push alerts sa site na ito."
            : "Push alerts are not enabled for this site yet."}
        </p>
      ) : !capable ? (
        <p>
          {fil
            ? "Gamitin ang naka-install na app o suportadong browser sa HTTPS."
            : "Use the installed app or a supported browser over HTTPS."}
        </p>
      ) : (
        <button
          className="button"
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
        >
          {enabled ? <BellOff size={18} /> : <Bell size={18} />}{" "}
          {enabled
            ? fil
              ? "I-off sa device na ito"
              : "Turn off on this device"
            : fil
              ? "I-enable sa device na ito"
              : "Enable on this device"}
        </button>
      )}
      {error && (
        <p role="alert" className="error-banner">
          {fil
            ? "Hindi ma-update ang push alerts. Suriin ang browser permission at subukang muli."
            : "Could not update push alerts. Check browser permissions and try again."}
        </p>
      )}
      <span className="sr-only">{t.engagement.notifications}</span>
    </section>
  );
}
