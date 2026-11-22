"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { LoaderCircle, RefreshCw, Upload } from "lucide-react";
import { EvidencePicker } from "@/components/evidence/evidence-picker";
import type { EvidenceDictionary } from "@/lib/i18n/evidence";

export interface EvidencePhoto {
  id: string;
  url: string | null;
  photo_type: "report" | "resolution";
  created_at: string;
}

export interface EvidenceManagerProps {
  reportId: string;
  kind: "report" | "resolution";
  canUpload: boolean;
  photos: EvidencePhoto[];
  residentCount: number;
  page: number;
  pages: number;
  t: EvidenceDictionary;
  locale?: string;
}

function EvidencePhotoView({
  photo,
  t,
  locale,
}: {
  photo: EvidencePhoto;
  t: EvidenceDictionary;
  locale: string;
}) {
  const [failed, setFailed] = useState(false);
  const date = new Date(photo.created_at);
  return (
    <li className="evidence-photo">
      {photo.url && !failed ? (
        <a
          href={photo.url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          aria-label={t.view}
        >
          <Image
            src={photo.url}
            alt={
              photo.photo_type === "resolution"
                ? t.resolutionPhotos
                : t.reportPhotos
            }
            width={640}
            height={480}
            unoptimized
            onError={() => setFailed(true)}
            referrerPolicy="no-referrer"
          />
        </a>
      ) : (
        <p className="evidence-unavailable">{t.unavailable}</p>
      )}
      {!Number.isNaN(date.getTime()) && (
        <time dateTime={photo.created_at}>
          {date.toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "Asia/Manila",
          })}
        </time>
      )}
    </li>
  );
}

export function EvidenceManager({
  reportId,
  kind,
  canUpload,
  photos,
  residentCount,
  page,
  pages,
  t,
  locale = "en",
}: EvidenceManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [files, setFiles] = useState<File[]>([]);
  const requestKey = useRef("");
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<keyof EvidenceDictionary["errors"] | null>(
    null,
  );
  const [uploaded, setUploaded] = useState(false);
  const available =
    kind === "report" ? Math.max(0, Math.min(3, 3 - residentCount)) : 3;

  async function upload() {
    if (
      inFlight.current ||
      !canUpload ||
      !files.length ||
      files.length > available
    )
      return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setUploaded(false);
    const body = new FormData();
    files.forEach((file) => body.append("photos", file));
    body.set("photo_type", kind);
    body.set("request_key", requestKey.current);
    try {
      const response = await fetch(
        `/api/reports/${encodeURIComponent(reportId)}/evidence`,
        {
          method: "POST",
          body,
          credentials: "same-origin",
        },
      );
      const result: unknown = await response.json();
      if (
        response.ok &&
        typeof result === "object" &&
        result !== null &&
        "ok" in result &&
        result.ok === true
      ) {
        setFiles([]);
        requestKey.current = "";
        setUploaded(true);
        startRefresh(() => router.refresh());
      } else {
        const code =
          typeof result === "object" && result !== null && "error" in result
            ? result.error
            : null;
        setError(
          typeof code === "string" && Object.hasOwn(t.errors, code)
            ? (code as keyof EvidenceDictionary["errors"])
            : "uploadFailed",
        );
      }
    } catch {
      setError("uploadFailed");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section className="panel evidence-manager" aria-label={t.title}>
      <h2>{t.title}</h2>
      <p className="field-hint">{t.privateHint}</p>
      <div className="evidence-refresh">
        <p className="field-hint">{t.refreshHint}</p>
        <button
          type="button"
          className="button"
          disabled={pending || refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={refreshing ? "spin" : undefined}
          />
          {t.refresh}
        </button>
      </div>
      {(["report", "resolution"] as const).map((group) => {
        const items = photos.filter((photo) => photo.photo_type === group);
        return (
          <div className={`evidence-group evidence-group-${group}`} key={group}>
            <h3>{group === "report" ? t.reportPhotos : t.resolutionPhotos}</h3>
            {group === "resolution" && (
              <p className="field-hint">{t.resolutionHint}</p>
            )}
            {items.length ? (
              <ul className="evidence-gallery">
                {items.map((photo) => (
                  <EvidencePhotoView
                    key={`${photo.id}-${photo.url}`}
                    photo={photo}
                    t={t}
                    locale={locale}
                  />
                ))}
              </ul>
            ) : (
              <p className="field-hint">{t.empty}</p>
            )}
          </div>
        );
      })}
      {pages > 1 && (
        <nav className="evidence-pagination" aria-label={t.page}>
          {page > 1 && (
            <Link
              className="button"
              href={`${pathname}?photos=${page - 1}`}
              scroll={false}
            >
              {t.previous}
            </Link>
          )}
          <span aria-current="page">
            {t.page} {page} {t.of} {pages}
          </span>
          {page < pages && (
            <Link
              className="button"
              href={`${pathname}?photos=${page + 1}`}
              scroll={false}
            >
              {t.next}
            </Link>
          )}
        </nav>
      )}
      {canUpload && available > 0 && (
        <div className="evidence-upload">
          <EvidencePicker
            files={files}
            onChange={(next) => {
              requestKey.current = crypto.randomUUID();
              setFiles(next);
              setError(null);
              setUploaded(false);
            }}
            disabled={pending || refreshing}
            maxFiles={available}
            t={t}
          />
          <button
            className="button primary"
            type="button"
            disabled={
              pending || refreshing || !files.length || files.length > available
            }
            onClick={upload}
          >
            {pending ? (
              <LoaderCircle size={17} className="spin" aria-hidden="true" />
            ) : (
              <Upload size={17} aria-hidden="true" />
            )}
            {pending ? t.uploading : t.upload}
          </button>
        </div>
      )}
      {canUpload && kind === "report" && available === 0 && (
        <p className="field-hint">{t.full}</p>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {t.errors[error]}
        </p>
      )}
      {uploaded && (
        <p className="evidence-success" role="status">
          {t.uploaded}
        </p>
      )}
    </section>
  );
}
