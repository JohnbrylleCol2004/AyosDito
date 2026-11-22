export type Role = "resident" | "admin";

export function canAccessAdmin(role: unknown): boolean {
  return role === "admin";
}

export function homeForRole(role: unknown): "/admin" | "/dashboard" | null {
  return role === "admin"
    ? "/admin"
    : role === "resident"
      ? "/dashboard"
      : null;
}

export function parseCredentials(
  email: unknown,
  password: unknown,
):
  | { ok: true; email: string; password: string }
  | { ok: false; field: "email" | "password" } {
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return { ok: false, field: "email" };
  }
  if (typeof password !== "string" || !password || password.length > 1024) {
    return { ok: false, field: "password" };
  }
  return { ok: true, email: email.trim().toLowerCase(), password };
}
