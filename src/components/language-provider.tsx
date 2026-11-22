"use client";
import { createContext, useContext } from "react";
import { dictionary, type Locale } from "@/lib/i18n/dictionaries";

const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useDictionary() {
  return dictionary(useContext(LanguageContext));
}
