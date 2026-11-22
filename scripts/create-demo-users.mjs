// Run only on a trusted machine. This script is never imported by the web application.
import { createClient } from "@supabase/supabase-js";

// Validate before constructing the SDK client or making any account changes.
// Never include environment values in setup errors.
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
let validProjectUrl = false;
try {
  const parsed = new URL(projectUrl ?? "");
  validProjectUrl =
    /^https?:\/\//i.test(projectUrl ?? "") &&
    ["http:", "https:"].includes(parsed.protocol);
} catch {
  // Missing or malformed URL: print the actionable message below.
}
if (!validProjectUrl) {
  console.error(
    "[AyosDito] Invalid NEXT_PUBLIC_SUPABASE_URL in .env.local.\n" +
      "Copy the full Project URL from your Supabase project's Connect dialog.\n" +
      "Expected format: https://<project-ref>.supabase.co (including https://).\n" +
      "Use the Project URL, not an API key, project name, or dashboard address.\n" +
      "Save .env.local, then rerun npm.cmd run demo:users.\n" +
      "No accounts were created. Environment values are not printed.",
  );
  process.exit(1);
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "DEMO_RESIDENT_EMAIL",
  "DEMO_RESIDENT_PASSWORD",
  "DEMO_ADMIN_EMAIL",
  "DEMO_ADMIN_PASSWORD",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name} in .env.local`);
}
const residentEmail = process.env.DEMO_RESIDENT_EMAIL.trim().toLowerCase();
const adminEmail = process.env.DEMO_ADMIN_EMAIL.trim().toLowerCase();
if (residentEmail === adminEmail)
  throw new Error("Use different resident and administrator emails.");
for (const name of ["DEMO_RESIDENT_PASSWORD", "DEMO_ADMIN_PASSWORD"]) {
  if (process.env[name].length < 12)
    throw new Error(`${name} must have at least 12 characters.`);
}
const supabase = createClient(projectUrl, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Refuse to silently alter existing accounts or reset their passwords.
for (const account of [
  {
    email: residentEmail,
    password: process.env.DEMO_RESIDENT_PASSWORD,
    role: "resident",
    name: "Demo Resident",
  },
  {
    email: adminEmail,
    password: process.env.DEMO_ADMIN_PASSWORD,
    role: "admin",
    name: "Demo Administrator",
  },
]) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.name, zone: "Purok Demo" },
  });
  if (error)
    throw new Error(
      `Could not create ${account.role} account: ${error.message}. Existing accounts are never modified; use the SQL instructions in README if necessary.`,
    );
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ role: account.role })
    .eq("id", data.user.id)
    .select("id")
    .single();
  if (profileError || !profile)
    throw new Error(
      `Account created but ${account.role} profile provisioning failed. Apply the migration and repair this profile using README.`,
    );
  console.log(`Created ${account.role} demo account. Password omitted.`);
}
