import type { Metadata, Viewport } from "next";
import { getLanguage } from "@/lib/i18n/server";
import { LanguageProvider } from "@/components/language-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";
import "./reports.css";
import "./admin.css";
import "./evidence.css";
import "./engagement.css";
import "./analytics.css";
import "./pwa.css";

export const metadata: Metadata = {
  applicationName: "AyosDito",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AyosDito" },
  icons: {
    icon: [
      { url: "/icons/ayosdito.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  title: { default: "AyosDito · Para sa barangay", template: "%s · AyosDito" },
  description:
    "Community issue reporting and resolution tracking for barangay residents and administrators.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#087f5b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getLanguage();
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider locale={locale}>
          <PwaProvider>
            <a className="skip-link" href="#main-content">
              {t.skip}
            </a>
            {children}
          </PwaProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
