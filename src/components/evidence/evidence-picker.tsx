"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { X } from "lucide-react";
import type { EvidenceDictionary } from "@/lib/i18n/evidence";

export interface EvidencePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  t: EvidenceDictionary;
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function PhotoPreview({ file, alt }: { file: File; alt: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (image.current) image.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  // Local object URLs stay in the browser and must never pass through image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt={alt} width={320} height={240} />;
}

export function EvidencePicker({
  files,
  onChange,
  disabled = false,
  maxFiles = 3,
  t,
}: EvidencePickerProps) {
  const id = useId();
  // A file change before hydration cannot be replayed reliably. Keep the picker
  // disabled until its preview/validation handlers can receive the selection.
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [error, setError] = useState<
    "fileCount" | "fileType" | "fileSize" | null
  >(null);
  const limit = Math.max(0, Math.min(3, maxFiles));
  return (
    <div className="evidence-picker">
      <label htmlFor={id}>{t.pickerLabel}</label>
      <p className="field-hint" id={`${id}-hint`}>
        {t.hint}
      </p>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={!hydrated || disabled || files.length >= limit}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={!!error}
        onChange={(event) => {
          const added = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (!added.length) return;
          const failure =
            files.length + added.length > limit
              ? "fileCount"
              : added.some((file) => !allowedTypes.has(file.type))
                ? "fileType"
                : added.some(
                      (file) => file.size > 5 * 1024 * 1024 || file.size === 0,
                    )
                  ? "fileSize"
                  : null;
          setError(failure);
          if (!failure) onChange([...files, ...added]);
        }}
      />
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {t.errors[error]}
        </p>
      )}
      {files.length > 0 && (
        <ul className="evidence-previews">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`}>
              <PhotoPreview file={file} alt={`${t.selected} ${index + 1}`} />
              <div className="evidence-selection">
                <span title={file.name}>{file.name}</span>
                <button
                  type="button"
                  className="button"
                  disabled={disabled}
                  aria-label={`${t.remove}: ${file.name}`}
                  onClick={() => {
                    setError(null);
                    onChange(files.filter((_, position) => position !== index));
                  }}
                >
                  <X size={15} aria-hidden="true" />
                  {t.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
