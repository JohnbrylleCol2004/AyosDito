export const enAdmin = {
  phase: "Phase 3 · Report management",
  dashboard: "Barangay dashboard",
  intro:
    "Review community concerns and keep residents informed of official progress.",
  manage: "Manage reports",
  reviewQueue: "Reports requiring review",
  recent: "Recently submitted",
  updated: "Recently updated",
  categories: "Reports by category",
  listIntro: "Review submitted concerns and record official decisions.",
  reporter: "Reporter",
  reporterZone: "Reporter’s zone / purok",
  reporterId: "Reporter account ID",
  notAvailable: "Not available",
  view: "Review report",
  zoneFilter: "Filter by zone / purok",
  zoneHint: "Exact zone / purok; leave blank for all",
  pendingFirst: "Pending review first",
  noReports: "No reports to show",
  noReportsHint: "Reports matching this view will appear here when available.",
  review: "Review and update",
  back: "Back to report management",
  target: "Next status",
  note: "Official note",
  noteHint:
    "Required, 1–2,000 characters. This note is visible to the resident.",
  acceptanceNote: "Action / acceptance note",
  rejectionNote: "Reason for rejection",
  resolutionNote: "Completion / resolution note",
  accept: "Accept / start progress",
  reject: "Reject report",
  resolve: "Mark as resolved",
  reviewChange: "Review change",
  confirm: "Confirm change",
  cancel: "Keep editing",
  confirming: "Confirm this official update",
  confirmText:
    "Check the selected status and note before confirming. The resident will see this note, and the status change cannot be undone in this phase.",
  updating: "Saving official update…",
  terminal: "This report is closed. No further status changes are available.",
  success: "The status and official audit entry were saved successfully.",
  stale:
    "This report changed while you were reviewing it. Reload the page and review the latest status before trying again.",
  invalid:
    "This status change is not permitted. Reload and review the available actions.",
  saveError:
    "We couldn’t save the update. Your note is preserved. Refresh the report to check whether it was saved before retrying.",
  migrationError:
    "Admin management is not ready. Ask your administrator to apply the Phase 3 migration.",
  loadError:
    "We couldn’t load this administration view. Refresh and try again.",
  refresh: "Reload report",
  validation: {
    report_id: "The report reference is invalid. Reload the page.",
    target: "Choose an available next status.",
    note: "Enter an official note with 1–2,000 characters.",
    version: "The report version is invalid. Reload the page.",
    confirmed: "Review and confirm the change before saving.",
  },
};
type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>;
};
export type AdminDictionary = Translation<typeof enAdmin>;
export const filAdmin: AdminDictionary = {
  phase: "Phase 3 · Pamamahala ng ulat",
  dashboard: "Dashboard ng barangay",
  intro:
    "Suriin ang mga suliranin at ipaalam sa residente ang opisyal na pag-usad.",
  manage: "Pamahalaan ang mga ulat",
  reviewQueue: "Mga ulat na dapat suriin",
  recent: "Mga bagong isinumite",
  updated: "Mga huling na-update",
  categories: "Mga ulat ayon sa kategorya",
  listIntro: "Suriin ang mga suliranin at itala ang mga opisyal na desisyon.",
  reporter: "Nag-ulat",
  reporterZone: "Zone / purok ng nag-ulat",
  reporterId: "Account ID ng nag-ulat",
  notAvailable: "Hindi magamit",
  view: "Suriin ang ulat",
  zoneFilter: "I-filter ayon sa zone / purok",
  zoneHint: "Eksaktong zone / purok; iwanang blangko para sa lahat",
  pendingFirst: "Unahin ang naghihintay ng pagsusuri",
  noReports: "Walang ulat na maipapakita",
  noReportsHint:
    "Makikita rito ang mga ulat na tumutugma sa napiling pagtingin.",
  review: "Suriin at i-update",
  back: "Bumalik sa pamamahala ng ulat",
  target: "Susunod na katayuan",
  note: "Opisyal na tala",
  noteHint:
    "Kailangan, 1–2,000 character. Makikita ng residente ang talang ito.",
  acceptanceNote: "Tala ng aksyon / pagtanggap",
  rejectionNote: "Dahilan ng hindi pagtanggap",
  resolutionNote: "Tala ng pagkumpleto / paglutas",
  accept: "Tanggapin / simulan ang aksyon",
  reject: "Hindi tanggapin ang ulat",
  resolve: "Markahang nalutas na",
  reviewChange: "Suriin ang pagbabago",
  confirm: "Kumpirmahin ang pagbabago",
  cancel: "Ipagpatuloy ang pag-edit",
  confirming: "Kumpirmahin ang opisyal na update",
  confirmText:
    "Suriin ang katayuan at tala bago kumpirmahin. Makikita ito ng residente at hindi na maibabalik ang dating katayuan sa phase na ito.",
  updating: "Sine-save ang opisyal na update…",
  terminal: "Sarado na ang ulat. Wala nang maaaring baguhin sa katayuan.",
  success: "Nai-save na ang katayuan at opisyal na audit entry.",
  stale:
    "Nagbago ang ulat habang sinusuri mo ito. I-reload ang pahina at suriin ang pinakabagong katayuan bago subukan muli.",
  invalid:
    "Hindi pinapayagan ang pagbabagong ito. I-reload at suriin ang mga maaaring aksyon.",
  saveError:
    "Hindi mai-save ang update. Nananatili ang iyong tala. I-refresh muna ang ulat upang makita kung nai-save ito bago subukan muli.",
  migrationError:
    "Hindi pa handa ang pamamahala. Ipa-apply sa administrator ang Phase 3 migration.",
  loadError:
    "Hindi ma-load ang pahinang ito ng administrasyon. I-refresh at subukan muli.",
  refresh: "I-reload ang ulat",
  validation: {
    report_id: "Hindi wasto ang report reference. I-reload ang pahina.",
    target: "Pumili ng pinapayagang susunod na katayuan.",
    note: "Maglagay ng opisyal na tala na may 1–2,000 character.",
    version: "Hindi wasto ang bersyon ng ulat. I-reload ang pahina.",
    confirmed: "Suriin at kumpirmahin muna ang pagbabago.",
  },
};
