import type { Locale } from "./dictionaries";
const en = {
  register: "Create resident account",
  registrationIntro:
    "Register with your name and zone. A barangay administrator must approve your account before you can submit or confirm reports.",
  name: "Full name",
  zone: "Zone / purok",
  email: "Email",
  password: "Password",
  confirm: "Confirm password",
  passwordHint:
    "Use at least 12 characters. A unique passphrase is recommended.",
  submit: "Submit registration",
  login: "Back to sign in",
  forgot: "Forgot password?",
  reset: "Reset password",
  newPassword: "Set a new password",
  save: "Save password",
  busy: "Please wait…",
  registered:
    "If registration can proceed, check your email for a confirmation link, then sign in. Administrator approval is also required.",
  recoverySent:
    "If an account exists for this email, a password reset link will be sent. Check your inbox.",
  pending: "Your account is awaiting approval",
  pendingText:
    "A barangay administrator will review your registration. You can check again here after review.",
  rejected: "Your registration was not approved",
  rejectedText:
    "Contact the barangay office if you believe this decision needs review.",
  refresh: "Check approval status",
  members: "Resident approvals",
  membersIntro:
    "Review resident registrations before granting access. Account roles cannot be changed here.",
  approve: "Approve resident",
  reject: "Reject registration",
  note: "Review note (optional, visible to the resident)",
  empty: "No registrations are waiting for review.",
  reviewed: "Registration reviewed.",
  error: "We could not complete this request. Please try again.",
  invalid: "Check the fields and try again.",
  setup:
    "Account email links require a valid SITE_URL setting. Contact the administrator.",
  linkError:
    "This account link is invalid or expired. Request a new link and try again.",
  errors: {
    email: "Enter a valid email address.",
    password: "Use a password with 12–128 characters.",
    confirm: "Passwords must match.",
    name: "Enter your full name (up to 120 characters).",
    zone: "Enter your zone (up to 80 characters).",
  },
};
const fil: typeof en = {
  register: "Gumawa ng resident account",
  registrationIntro:
    "Magparehistro gamit ang pangalan at zone. Kailangang aprubahan ng barangay administrator ang account bago makapag-ulat o makapagkumpirma.",
  name: "Buong pangalan",
  zone: "Zone / purok",
  email: "Email",
  password: "Password",
  confirm: "Ulitin ang password",
  passwordHint:
    "Gumamit ng hindi bababa sa 12 character. Inirerekomenda ang natatanging passphrase.",
  submit: "Ipadala ang rehistrasyon",
  login: "Bumalik sa pag-sign in",
  forgot: "Nakalimutan ang password?",
  reset: "I-reset ang password",
  newPassword: "Magtakda ng bagong password",
  save: "I-save ang password",
  busy: "Sandali…",
  registered:
    "Kung maaaring magpatuloy ang rehistrasyon, tingnan ang email para sa confirmation link at mag-sign in. Kailangan din ang pag-apruba ng administrator.",
  recoverySent:
    "Kung may account para sa email na ito, magpapadala ng password reset link. Tingnan ang inbox.",
  pending: "Naghihintay ng pag-apruba ang account",
  pendingText:
    "Susuriin ng barangay administrator ang iyong rehistrasyon. Maaari mong tingnan muli rito pagkatapos ng pagsusuri.",
  rejected: "Hindi naaprubahan ang rehistrasyon",
  rejectedText:
    "Makipag-ugnayan sa barangay office kung kailangang suriin muli ang desisyon.",
  refresh: "Tingnan ang pag-apruba",
  members: "Pag-apruba ng residente",
  membersIntro:
    "Suriin ang mga rehistrasyon bago payagang gumamit. Hindi mababago rito ang tungkulin ng account.",
  approve: "Aprubahan ang residente",
  reject: "Tanggihan ang rehistrasyon",
  note: "Tala ng pagsusuri (opsyonal, makikita ng residente)",
  empty: "Walang rehistrasyong naghihintay ng pagsusuri.",
  reviewed: "Nasuri na ang rehistrasyon.",
  error: "Hindi makumpleto ang kahilingan. Subukan muli.",
  invalid: "Suriin ang mga field at subukan muli.",
  setup:
    "Kailangan ng wastong SITE_URL para sa mga link sa email. Makipag-ugnayan sa administrator.",
  linkError:
    "Hindi wasto o paso na ang link. Humiling ng bagong link at subukan muli.",
  errors: {
    email: "Maglagay ng wastong email.",
    password: "Gumamit ng password na may 12–128 character.",
    confirm: "Dapat magkapareho ang mga password.",
    name: "Ilagay ang buong pangalan (hanggang 120 character).",
    zone: "Ilagay ang zone (hanggang 80 character).",
  },
};
export type AccountsDictionary = typeof en;
export function accountsDictionary(locale: Locale) {
  return locale === "fil" ? fil : en;
}
