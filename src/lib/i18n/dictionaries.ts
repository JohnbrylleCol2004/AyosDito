import { enReports, filReports } from "./reports.ts";
import { enAdmin, filAdmin } from "./admin.ts";
import { enEvidence, filEvidence } from "./evidence.ts";
import { enEngagement, filEngagement } from "./engagement.ts";
import { enAnalytics, filAnalytics } from "./analytics.ts";
import { enPwa, filPwa } from "./pwa.ts";

export const en = {
  pwa: enPwa,
  analytics: enAnalytics,
  evidence: enEvidence,
  engagement: enEngagement,
  adminReports: enAdmin,
  reports: enReports,
  language: "Language",
  switchLanguage: "Gamitin ang Filipino",
  community: "A better barangay starts here.",
  intro:
    "A shared space for residents and barangay officials to keep community concerns moving forward.",
  welcome: "Welcome to AyosDito",
  loginIntro: "Sign in with the demo account provided by your administrator.",
  email: "Email address",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  demo: "Controlled demo",
  demoText:
    "Use fictional information for this demonstration. Ask your administrator for account access.",
  secure: "Your account. Your community.",
  secureText:
    "Your role determines what you can access. Personal information stays protected.",
  foundation: "Phase 1 · Project foundation",
  overview: "Overview",
  dashboard: "My dashboard",
  adminDashboard: "Barangay dashboard",
  resident: "Resident",
  admin: "Administrator",
  signOut: "Sign out",
  navigation: "Main navigation",
  greeting: "Good to see you",
  residentIntro: "Your community concerns, in one place.",
  adminIntro: "A clear view of the concerns your barangay is working on.",
  total: "Total reports",
  pending: "Pending review",
  progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  myReports: "My reports",
  communityReports: "Barangay reports",
  statusOverview: "Reports by status",
  noReports: "No reports yet",
  emptyResident:
    "Your report activity will appear here when issue reporting becomes available.",
  emptyAdmin:
    "Submitted community concerns will appear here when issue reporting becomes available.",
  phaseTitle: "The foundation is in place",
  phaseText:
    "Account access, protected dashboards, and language preferences are available. Issue submission and report management are planned for the next phases.",
  account: "Your account",
  name: "Name",
  role: "Access level",
  zone: "Zone / Purok",
  notSet: "Not assigned",
  privacy: "Only authorized accounts can access this dashboard.",
  connected: "Connected to your barangay",
  status: "Status",
  count: "Reports",
  dataError:
    "We couldn’t load report totals. Please refresh or ask your administrator to check the database setup.",
  setupTitle: "Connect your Supabase project",
  setupText: "AyosDito needs its database connection before you can sign in.",
  setupSteps: [
    "Copy .env.example to .env.local.",
    "Add your Supabase project URL and publishable key.",
    "Run the SQL migration and create the demo accounts using the README.",
    "Restart the development server, then return to sign in.",
  ],
  back: "Back to sign in",
  unavailableTitle: "Your account needs attention",
  unavailableText:
    "Your profile could not be loaded. Ask your administrator to verify the database migration and your account’s profile.",
  errorTitle: "Something went wrong",
  errorText:
    "Please try again. If the problem continues, contact your administrator.",
  retry: "Try again",
  notFound: "This page could not be found",
  home: "Return home",
  skip: "Skip to content",
  errors: {
    email: "Enter a valid email address.",
    password: "Enter your password (up to 1,024 characters).",
    credentials:
      "The email or password is incorrect, or the account is unavailable.",
    connection: "We couldn’t reach the sign-in service. Please try again.",
    profile: "Your account profile is unavailable. Contact your administrator.",
  },
};

type Dictionary = {
  [K in keyof typeof en]: K extends "pwa"
    ? typeof filPwa
    : K extends "analytics"
      ? typeof filAnalytics
      : K extends "evidence"
        ? typeof filEvidence
        : K extends "engagement"
          ? typeof filEngagement
          : K extends "adminReports"
            ? typeof filAdmin
            : K extends "reports"
              ? typeof filReports
              : K extends "errors"
                ? Record<keyof typeof en.errors, string>
                : K extends "setupSteps"
                  ? string[]
                  : string;
};

export const fil: Dictionary = {
  pwa: filPwa,
  analytics: filAnalytics,
  evidence: filEvidence,
  engagement: filEngagement,
  adminReports: filAdmin,
  reports: filReports,
  language: "Wika",
  switchLanguage: "Use English",
  community: "Sama-sama para sa maayos na barangay.",
  intro:
    "Isang lugar para sa mga residente at opisyal upang matutukan ang mga suliranin ng komunidad.",
  welcome: "Maligayang pagdating sa AyosDito",
  loginIntro:
    "Mag-sign in gamit ang demo account na ibinigay ng inyong administrator.",
  email: "Email address",
  password: "Password",
  signIn: "Mag-sign in",
  signingIn: "Nagsa-sign in…",
  demo: "Kontroladong demo",
  demoText:
    "Gumamit ng kathang-isip na impormasyon sa demo na ito. Humingi ng account sa inyong administrator.",
  secure: "Account mo. Komunidad mo.",
  secureText:
    "Nakabatay sa iyong tungkulin ang maaari mong makita. Protektado ang personal na impormasyon.",
  foundation: "Phase 1 · Pundasyon ng proyekto",
  overview: "Pangkalahatan",
  dashboard: "Aking dashboard",
  adminDashboard: "Dashboard ng barangay",
  resident: "Residente",
  admin: "Administrator",
  signOut: "Mag-sign out",
  navigation: "Pangunahing nabigasyon",
  greeting: "Kumusta",
  residentIntro: "Mga suliranin ng inyong komunidad, nasa iisang lugar.",
  adminIntro:
    "Malinaw na pagtingin sa mga suliraning tinututukan ng inyong barangay.",
  total: "Lahat ng ulat",
  pending: "Naghihintay ng pagsusuri",
  progress: "Inaaksyunan",
  resolved: "Nalutas na",
  rejected: "Hindi tinanggap",
  myReports: "Aking mga ulat",
  communityReports: "Mga ulat sa barangay",
  statusOverview: "Mga ulat ayon sa katayuan",
  noReports: "Wala pang mga ulat",
  emptyResident:
    "Makikita rito ang iyong mga ulat kapag maaari nang magsumite ng suliranin.",
  emptyAdmin:
    "Makikita rito ang mga suliranin ng komunidad kapag maaari nang magsumite ng ulat.",
  phaseTitle: "Handa na ang pundasyon",
  phaseText:
    "Maaari nang gamitin ang mga account, protektadong dashboard, at pagpili ng wika. Kasunod na mga phase ang pagsusumite at pamamahala ng ulat.",
  account: "Iyong account",
  name: "Pangalan",
  role: "Uri ng access",
  zone: "Zone / Purok",
  notSet: "Hindi pa itinakda",
  privacy:
    "Mga awtorisadong account lamang ang maaaring makapasok sa dashboard na ito.",
  connected: "Konektado sa inyong barangay",
  status: "Katayuan",
  count: "Mga ulat",
  dataError:
    "Hindi ma-load ang bilang ng mga ulat. I-refresh ang pahina o ipasuri ang database setup sa administrator.",
  setupTitle: "Ikonekta ang iyong Supabase project",
  setupText:
    "Kailangan munang ikonekta ang database ng AyosDito bago makapag-sign in.",
  setupSteps: [
    "Kopyahin ang .env.example bilang .env.local.",
    "Ilagay ang Supabase project URL at publishable key.",
    "Patakbuhin ang SQL migration at gumawa ng demo accounts ayon sa README.",
    "I-restart ang development server at bumalik sa sign in.",
  ],
  back: "Bumalik sa sign in",
  unavailableTitle: "Kailangang suriin ang iyong account",
  unavailableText:
    "Hindi ma-load ang iyong profile. Ipasuri sa administrator ang database migration at ang profile ng iyong account.",
  errorTitle: "May naganap na problema",
  errorText:
    "Subukan muli. Kung magpatuloy ang problema, makipag-ugnayan sa administrator.",
  retry: "Subukan muli",
  notFound: "Hindi makita ang pahinang ito",
  home: "Bumalik sa simula",
  skip: "Lumaktaw sa nilalaman",
  errors: {
    email: "Maglagay ng wastong email address.",
    password: "Ilagay ang iyong password (hanggang 1,024 na character).",
    credentials: "Mali ang email o password, o hindi magamit ang account.",
    connection: "Hindi makakonekta sa sign-in service. Subukan muli.",
    profile:
      "Hindi magamit ang profile ng iyong account. Makipag-ugnayan sa administrator.",
  },
};
export type { Dictionary };
export type Locale = "en" | "fil";
export function dictionary(locale: string): Dictionary {
  return locale === "fil" ? fil : en;
}
