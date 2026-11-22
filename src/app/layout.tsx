import type { Metadata } from "next";
import { getLanguage } from "@/lib/i18n/server";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";
import "./reports.css";
import "./admin.css";
import "./evidence.css";
import "./engagement.css";
import "./analytics.css";

export const metadata: Metadata = {
  title: { default: "AyosDito · Para sa barangay", template: "%s · AyosDito" },
  description:
    "Community issue reporting and resolution tracking for barangay residents and administrators.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getLanguage();
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider locale={locale}>
          <a className="skip-link" href="#main-content">
            {t.skip}
          </a>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
