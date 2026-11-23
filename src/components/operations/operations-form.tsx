"use client";
import { useActionState, type ReactNode } from "react";
import { saveOperations } from "@/lib/actions/operations";
import type { OperationsDictionary } from "@/lib/i18n/operations";
export function OperationsForm({
  kind,
  reportId,
  version,
  requestId,
  t,
  children,
  submit,
}: {
  kind: "workflow" | "note" | "feedback" | "reopen" | "review";
  reportId: string;
  version?: number;
  requestId?: string;
  t: OperationsDictionary;
  children: ReactNode;
  submit?: string;
}) {
  const [state, action, pending] = useActionState(saveOperations, {});
  return (
    <form action={action} className="engagement-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="report_id" value={reportId} />
      {version !== undefined && (
        <input type="hidden" name="version" value={version} />
      )}
      {requestId && <input type="hidden" name="request_id" value={requestId} />}
      <fieldset disabled={pending}>
        {children}
        {submit && (
          <button className="button primary" type="submit">
            {pending ? t.saving : submit}
          </button>
        )}
      </fieldset>
      {pending && <p role="status">{t.saving}</p>}
      {state.error && (
        <p className="error-banner" role="alert">
          {state.error === "migration"
            ? t.migration
            : state.error === "conflict"
              ? t.conflict
              : state.error === "invalid"
                ? t.invalid
                : t.error}
        </p>
      )}
      {state.saved && <p role="status">{t.saved}</p>}
    </form>
  );
}
