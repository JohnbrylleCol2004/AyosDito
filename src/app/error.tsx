"use client";
import { useDictionary } from "@/components/language-provider";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useDictionary();
  return (
    <main className="notice-page" id="main-content">
      <section className="notice-card">
        <h1>{t.errorTitle}</h1>
        <p>{t.errorText}</p>
        <button className="button primary" onClick={reset}>
          {t.retry}
        </button>
      </section>
    </main>
  );
}
