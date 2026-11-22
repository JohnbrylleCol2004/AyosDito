"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function changeLanguage(form: FormData) {
  const locale = form.get("locale");
  if (locale !== "en" && locale !== "fil") return;
  (await cookies()).set("ayosdito-language", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
