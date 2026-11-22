export const enAnalytics = {
  title: "Community reporting trends",
  hint: "Based on available report data. Monthly counts use Philippine time.",
  zones: "Reports by zone · top 12",
  months: "Monthly submissions · last 12 months",
  average: "Average resolution time",
  hours: "hours",
  samples: "resolved reports with official completion timestamps",
  insufficient:
    "At least 3 completed reports with official timestamps are needed.",
  empty: "No report data is available yet.",
  error:
    "We couldn’t load community analytics. Refresh or check the Phase 4 migration.",
  month: "Month",
  count: "Reports",
};
export const filAnalytics: Record<keyof typeof enAnalytics, string> = {
  title: "Mga trend ng pag-uulat sa komunidad",
  hint: "Batay sa available na datos ng ulat. Oras ng Pilipinas ang gamit sa buwanang bilang.",
  zones: "Mga ulat ayon sa zone · nangungunang 12",
  months: "Buwanang pagsusumite · huling 12 buwan",
  average: "Karaniwang oras ng paglutas",
  hours: "oras",
  samples: "nalutas na ulat na may opisyal na oras ng pagkumpleto",
  insufficient:
    "Kailangan ng hindi bababa sa 3 nalutas na ulat na may opisyal na oras.",
  empty: "Wala pang datos ng ulat.",
  error:
    "Hindi ma-load ang analytics. I-refresh o suriin ang Phase 4 migration.",
  month: "Buwan",
  count: "Mga ulat",
};
