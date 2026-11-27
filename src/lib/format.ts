import type { Locale } from "./i18n/dictionaries.ts";

export function formatReportDate(value: string, locale: Locale, time = false) {
  return new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", {
    dateStyle: "medium",
    timeStyle: time ? "short" : undefined,
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
