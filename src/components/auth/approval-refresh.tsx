"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
export function ApprovalRefresh({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (Date.now() - last > 3000) {
        last = Date.now();
        router.refresh();
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return (
    <button
      className="button secondary"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {label}
    </button>
  );
}
