"use client";
import { useActionState } from "react";
import { reviewMember, type AccountState } from "@/lib/auth/account-actions";
import type { AccountsDictionary } from "@/lib/i18n/accounts";
export function MemberReview({ id, t }: { id: string; t: AccountsDictionary }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    reviewMember,
    {},
  );
  return (
    <form action={action} className="login-form">
      <input type="hidden" name="user_id" value={id} />
      <div className="field">
        <label htmlFor={`note-${id}`}>{t.note}</label>
        <textarea id={`note-${id}`} name="note" maxLength={1000} rows={2} />
      </div>
      {state.error && (
        <p role="alert" className="error-banner">
          {t.error}
        </p>
      )}
      {state.success && <p role="status">{t.reviewed}</p>}
      <div className="page-actions">
        <button
          className="button primary"
          name="decision"
          value="approve"
          disabled={pending}
        >
          {t.approve}
        </button>
        <button
          className="button secondary"
          name="decision"
          value="reject"
          disabled={pending}
        >
          {t.reject}
        </button>
      </div>
    </form>
  );
}
