"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LiveUpdates({
  userId,
  admin = false,
  locale = "en",
}: {
  userId: string;
  admin?: boolean;
  locale?: string;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  useEffect(() => {
    const db = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const refresh = () => {
      if (!active || document.visibilityState === "hidden") return;
      if (
        document.activeElement?.matches(
          "input, textarea, select, [contenteditable=true]",
        )
      ) {
        timer = setTimeout(refresh, 1500);
        return;
      }
      router.refresh();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 500);
    };
    const channel = db
      .channel(`private-updates-${admin ? "admin" : "resident"}-${userId}`)
      .on("system", {}, (payload: { extension?: string; status?: string }) => {
        if (!active || payload.extension !== "postgres_changes") return;
        const ready = payload.status === "ok";
        setLive(ready);
        // Channel join can finish before PostgreSQL replication is listening.
        // Reconcile changes that may have committed during that startup window.
        if (ready) schedule();
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_events",
          filter: `recipient_id=eq.${userId}`,
        },
        schedule,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_events",
          filter: `recipient_id=eq.${userId}`,
        },
        schedule,
      );
    // SSR sign-in writes cookies before the browser SDK finishes initialization.
    // Authenticate the socket explicitly before joining; an anonymous first join
    // cannot subscribe to this private table and will not receive its updates.
    void (async () => {
      const { data, error } = await db.auth.getSession();
      if (!active || error || !data.session) return;
      await db.realtime.setAuth(data.session.access_token);
      if (!active) return;
      channel.subscribe((status) => {
        if (active && status !== "SUBSCRIBED") setLive(false);
      });
    })().catch(() => {
      if (active) setLive(false);
    });
    // Focus/interval recovery covers offline/reconnect and providers with Realtime disabled.
    const interval = setInterval(schedule, 30_000);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", schedule);
      void db.removeChannel(channel);
    };
  }, [userId, admin, router]);
  return (
    <span className="live-status" role="status">
      {live
        ? locale === "fil"
          ? "Live updates"
          : "Live updates"
        : locale === "fil"
          ? "Regular na ina-update"
          : "Updates checked regularly"}
    </span>
  );
}
