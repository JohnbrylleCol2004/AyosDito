import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { MonthlySummary, ExportLocale } from "./format.ts";
export async function buildMonthlyPdf(
  month: string,
  summary: MonthlySummary,
  locale: ExportLocale,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`AyosDito monthly summary ${month}`);
  pdf.setLanguage(locale === "fil" ? "fil-PH" : "en-PH");
  pdf.setAuthor("AyosDito");
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.07, 0.16, 0.12),
    green = rgb(0.08, 0.3, 0.2),
    muted = rgb(0.3, 0.36, 0.32);
  const text = (
    value: string,
    y: number,
    size = 12,
    strong = false,
    color = ink,
  ) =>
    page.drawText(value, {
      x: 48,
      y,
      size,
      font: strong ? bold : regular,
      color,
    });
  page.drawRectangle({ x: 0, y: 734, width: 596, height: 108, color: green });
  text("AyosDito", 792, 25, true, rgb(1, 1, 1));
  text(
    locale === "fil" ? "Buwanang ulat ng serbisyo" : "Monthly service report",
    762,
    14,
    false,
    rgb(1, 1, 1),
  );
  text(month, 697, 24, true);
  text(
    locale === "fil"
      ? "Mga ulat na natanggap sa buwang ito (oras ng Maynila)."
      : "Reports received during this month (Manila time).",
    672,
    11,
    false,
    muted,
  );
  text(locale === "fil" ? "Kabuuang ulat" : "Total reports", 619, 13, true);
  page.drawText(String(summary.total), {
    x: 459,
    y: 613,
    size: 28,
    font: bold,
    color: green,
  });
  const labels =
    locale === "fil"
      ? ["Naghihintay ng pagsusuri", "Isinasagawa", "Nalutas", "Tinanggihan"]
      : ["Pending review", "In progress", "Resolved", "Rejected"];
  ["pending_review", "in_progress", "resolved", "rejected"].forEach(
    (key, i) => {
      const y = 570 - i * 35;
      text(labels[i], y);
      page.drawText(String(summary.statuses[key] ?? 0), {
        x: 475,
        y,
        size: 12,
        font: bold,
        color: ink,
      });
    },
  );
  text(locale === "fil" ? "Ayon sa kategorya" : "By category", 392, 14, true);
  const cats =
    locale === "fil"
      ? [
          "Ilaw sa kalye",
          "Kalsada",
          "Daluyan ng tubig",
          "Basura",
          "Pampublikong pasilidad",
          "Iba pa",
        ]
      : [
          "Streetlight",
          "Road",
          "Drainage",
          "Waste",
          "Public facility",
          "Other",
        ];
  [
    "streetlight",
    "road",
    "drainage",
    "waste",
    "public_facility",
    "other",
  ].forEach((key, i) => {
    const y = 355 - i * 29;
    text(cats[i], y, 11);
    page.drawText(String(summary.categories[key] ?? 0), {
      x: 475,
      y,
      size: 11,
      font: bold,
      color: ink,
    });
  });
  text(
    locale === "fil"
      ? "Ang mga katayuan ay batay sa oras ng pag-export."
      : "Statuses reflect the time of export.",
    113,
    10,
    false,
    muted,
  );
  text(
    locale === "fil"
      ? "Para lamang sa awtorisadong administrador."
      : "For authorized administrators only.",
    95,
    10,
    false,
    muted,
  );
  page.drawLine({
    start: { x: 48, y: 72 },
    end: { x: 547, y: 72 },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.81),
  });
  text("AyosDito / 1", 51, 9, false, muted);
  return pdf.save();
}
