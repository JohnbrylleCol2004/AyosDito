"use client";

import { CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { usePwa } from "./pwa-provider";
import { useDictionary } from "@/components/language-provider";

export function InstallControl() {
  const app = usePwa();
  const { pwa: t } = useDictionary();
  const ready = app.installed || app.standalone;
  const status = app.standalone
    ? t.standalone
    : app.installed
      ? t.installed
      : app.message
        ? t[app.message]
        : t.manual;
  return (
    <div className="pwa-install-control">
      {(app.available || app.installing) && !ready && (
        <button
          type="button"
          className="button primary"
          onClick={() => void app.install()}
          disabled={app.installing}
        >
          {app.installing ? (
            <LoaderCircle size={18} aria-hidden="true" className="spin" />
          ) : (
            <Download size={18} aria-hidden="true" />
          )}
          {app.installing ? t.installing : t.install}
        </button>
      )}
      <p role="status">
        {ready && <CheckCircle2 size={18} aria-hidden="true" />}
        {status}
      </p>
    </div>
  );
}
