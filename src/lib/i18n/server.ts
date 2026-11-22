import "server-only";
import { cookies } from "next/headers";
import { dictionary, type Locale } from "./dictionaries";

export async function getLanguage() {
  const locale: Locale =
    (await cookies()).get("ayosdito-language")?.value === "fil" ? "fil" : "en";
  return { locale, t: dictionary(locale) };
}
