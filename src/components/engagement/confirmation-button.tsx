"use client";
import { useActionState } from "react";
import { saveConfirmation } from "@/lib/actions/engagement";
import type { EngagementDictionary } from "@/lib/i18n/engagement";
export function ConfirmationButton({
  id,
  confirmed,
  t,
}: {
  id: string;
  confirmed: boolean;
  t: EngagementDictionary;
}) {
  const [state, action, pending] = useActionState(saveConfirmation, {});
  return (
    <form action={action}>
      <input type="hidden" name="report_id" value={id} />
      <input type="hidden" name="confirmed" value={String(!confirmed)} />
      <button className="button" disabled={pending}>
        {pending ? t.saving : confirmed ? t.remove : t.confirm}
      </button>
      {state.error && (
        <p role="alert" className="field-error">
          {t.error}
        </p>
      )}
    </form>
  );
}
