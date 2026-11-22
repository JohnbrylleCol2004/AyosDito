import { Languages } from "lucide-react";
import { changeLanguage } from "@/lib/i18n/actions";
import type { Locale, Dictionary } from "@/lib/i18n/dictionaries";

export function LanguageSwitch({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <form action={changeLanguage}>
      <input
        type="hidden"
        name="locale"
        value={locale === "en" ? "fil" : "en"}
      />
      <button className="language-button" aria-label={t.switchLanguage}>
        <Languages size={17} />
        <span>{locale === "en" ? "Filipino" : "English"}</span>
      </button>
    </form>
  );
}
