"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signIn, type LoginState } from "@/lib/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LoginForm({ t }: { t: Dictionary }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );
  const fieldError =
    state.error === "email" || state.error === "password" ? state.error : null;
  return (
    <form action={action} className="login-form" noValidate>
      <div className="field">
        <label htmlFor="email">{t.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          maxLength={254}
          required
          aria-invalid={fieldError === "email"}
          aria-describedby={fieldError === "email" ? "email-error" : undefined}
        />
        {fieldError === "email" && (
          <p id="email-error" className="field-error" role="alert">
            {t.errors.email}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="password">{t.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
          aria-invalid={fieldError === "password"}
          aria-describedby={
            fieldError === "password" ? "password-error" : undefined
          }
        />
        {fieldError === "password" && (
          <p id="password-error" className="field-error" role="alert">
            {t.errors.password}
          </p>
        )}
      </div>
      {state.error && !fieldError && (
        <p className="error-banner" role="alert">
          {t.errors[state.error]}
        </p>
      )}
      <button
        type="submit"
        className="button primary login-submit"
        disabled={pending}
      >
        {pending ? (
          <>
            <LoaderCircle size={18} className="spin" />
            {t.signingIn}
          </>
        ) : (
          <>
            {t.signIn}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
