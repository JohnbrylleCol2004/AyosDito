import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Smartphone, Monitor, Globe, Wifi } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { InstallControl } from "@/components/pwa/install-control";
import { getLanguage } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Install" };

export default async function InstallPage() {
  const { locale, t } = await getLanguage();
  const p = t.pwa;
  const devices = [
    {
      name: p.android,
      Icon: Smartphone,
      steps: [p.androidBrowser, p.androidMenu, p.androidConfirm],
    },
    {
      name: p.windows,
      Icon: Monitor,
      steps: [p.windowsBrowser, p.windowsMenu, p.windowsConfirm],
    },
    {
      name: p.ios,
      Icon: Globe,
      steps: [p.iosBrowser, p.iosMenu, p.iosConfirm],
    },
  ];
  return (
    <div className="pwa-page">
      <header className="pwa-header">
        <Link href="/" aria-label="AyosDito">
          <Brand />
        </Link>
        <LanguageSwitch locale={locale} t={t} />
      </header>
      <main id="main-content" className="pwa-main">
        <Link href="/" className="pwa-back">
          <ArrowLeft size={16} aria-hidden="true" />
          {p.back}
        </Link>
        <section className="pwa-intro" aria-labelledby="pwa-title">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={80}
            height={80}
            className="pwa-app-icon"
            priority
          />
          <h1 id="pwa-title">{p.title}</h1>
          <p className="pwa-lead">{p.intro}</p>
          <InstallControl />
        </section>
        <section className="pwa-instructions" aria-labelledby="pwa-devices">
          <h2 id="pwa-devices">{p.devices}</h2>
          <div className="pwa-device-list">
            {devices.map(({ name, Icon, steps }) => (
              <section className="pwa-device" key={name}>
                <h3>
                  <Icon size={21} aria-hidden="true" />
                  {name}
                </h3>
                <ol>
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
        <aside className="pwa-online-note">
          <Wifi size={21} aria-hidden="true" />
          <div>
            <h2>{p.internet}</h2>
            <p>{p.internetBody}</p>
          </div>
        </aside>
        <footer className="pwa-footer">{p.sameAccount}</footer>
      </main>
    </div>
  );
}
