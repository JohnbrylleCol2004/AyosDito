"use client";
import { useActionState } from "react";
import {
  registerResident,
  requestPasswordReset,
  updatePassword,
  type AccountState,
} from "@/lib/auth/account-actions";
import type { AccountsDictionary } from "@/lib/i18n/accounts";
export function AccountForm({
  mode,
  t,
}: {
  mode: "register" | "recovery" | "password";
  t: AccountsDictionary;
}) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    mode === "register"
      ? registerResident
      : mode === "recovery"
        ? requestPasswordReset
        : updatePassword,
    {},
  );
  if (state.success)
    return (
      <p className="success-banner" role="status">
        {mode === "register" ? t.registered : t.recoverySent}
      </p>
    );
  const fields = [
    ...(mode === "register" ? ["full_name", "zone"] : []),
    ...(mode !== "password" ? ["email"] : []),
    ...(mode !== "recovery" ? ["password", "confirm_password"] : []),
  ];
  return (
    <form action={action} className="login-form">
      {fields.map((field) => {
        const key =
          field === "full_name"
            ? "name"
            : field === "confirm_password"
              ? "confirm"
              : (field as "zone" | "email" | "password");
        return (
          <div className="field" key={field}>
            <label htmlFor={field}>{t[key]}</label>
            <input
              id={field}
              name={field}
              type={
                field.includes("password")
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              required
              maxLength={
                field === "full_name"
                  ? 240
                  : field === "zone"
                    ? 160
                    : field === "email"
                      ? 254
                      : 128
              }
              minLength={field.includes("password") ? 12 : undefined}
              autoComplete={
                field.includes("password")
                  ? "new-password"
                  : field === "full_name"
                    ? "name"
                    : field === "email"
                      ? "email"
                      : "address-level4"
              }
              aria-invalid={state.error === key}
              aria-describedby={
                field.includes("password") ? "password-hint" : undefined
              }
            />
          </div>
        );
      })}
      {mode !== "recovery" && <p id="password-hint">{t.passwordHint}</p>}
      {state.error && (
        <p className="error-banner" role="alert">
          {state.error in t.errors
            ? t.errors[state.error as keyof typeof t.errors]
            : t[state.error as "error" | "setup" | "invalid"]}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending
          ? t.busy
          : mode === "register"
            ? t.submit
            : mode === "recovery"
              ? t.reset
              : t.save}
      </button>
    </form>
  );
}
