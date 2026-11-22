"use client";
import { useActionState } from "react";
import { markRead } from "@/lib/actions/engagement";
import type { EngagementDictionary } from "@/lib/i18n/engagement";
export function ReadButton({
  id,
  t,
}: {
  id?: string;
  t: EngagementDictionary;
}) {
  const [state, action, pending] = useActionState(markRead, {});
  return (
    <form action={action}>
      <input type="hidden" name="notification_id" value={id ?? ""} />
      <button className="button" disabled={pending}>
        {pending ? t.saving : id ? t.markRead : t.markAllRead}
      </button>
      {state.error && (
        <p role="alert" className="field-error">
          {t.error}
        </p>
      )}
    </form>
  );
}
