import { parseCredentials } from "./rules.ts";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export function homeForProfile(profile: {
  role: string;
  approval_status: ApprovalStatus;
}) {
  if (profile.approval_status !== "approved") return "/account-pending";
  return profile.role === "admin" ? "/admin" : "/dashboard";
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export function parseRegistration(form: FormData):
  | {
      ok: true;
      email: string;
      password: string;
      full_name: string;
      zone: string;
    }
  | { ok: false; field: "email" | "password" | "confirm" | "name" | "zone" } {
  const credentials = parseCredentials(form.get("email"), form.get("password"));
  if (!credentials.ok) return { ok: false as const, field: credentials.field };
  if (!validPassword(credentials.password))
    return { ok: false as const, field: "password" };
  if (credentials.password !== form.get("confirm_password"))
    return { ok: false as const, field: "confirm" };
  const name = form.get("full_name"),
    zone = form.get("zone");
  if (typeof name !== "string" || !name.trim() || [...name.trim()].length > 120)
    return { ok: false as const, field: "name" };
  if (typeof zone !== "string" || !zone.trim() || [...zone.trim()].length > 80)
    return { ok: false as const, field: "zone" };
  return { ...credentials, full_name: name.trim(), zone: zone.trim() };
}
export function safeAuthNext(value: unknown) {
  return value === "/auth/reset-password" ? value : "/account-pending";
}
export function canonicalSiteUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const explicit = env.SITE_URL?.trim();
  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  // Trusted deployment configuration only: never infer email destinations from
  // Origin/Host/forwarded headers or an ephemeral preview deployment URL.
  if (
    !explicit &&
    productionHost &&
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(productionHost)
  )
    return null;
  const value =
    explicit ||
    (productionHost
      ? `https://${productionHost}`
      : env.NODE_ENV !== "production"
        ? "http://localhost:3000"
        : "");
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" &&
        !(env.NODE_ENV !== "production" && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function parseMemberReview(form: FormData) {
  const id = form.get("user_id"),
    decision = form.get("decision"),
    note = form.get("note");
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    (decision !== "approve" && decision !== "reject") ||
    typeof note !== "string" ||
    [...note.trim()].length > 1000
  )
    return null;
  return {
    p_user_id: id,
    p_approved: decision === "approve",
    p_note: note.trim() || null,
  };
}
