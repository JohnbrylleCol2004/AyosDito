export type ExportLocale = "en" | "fil";
export function monthRange(month: string) {
  if (!/^(?:20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const next =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    start: `${month}-01T00:00:00+08:00`,
    end: `${next}-01T00:00:00+08:00`,
  };
}
export function parseExportRequest(params: URLSearchParams) {
  const month = params.get("month") ?? "",
    format = params.get("format");
  const range = monthRange(month);
  if (!range || (format !== "csv" && format !== "pdf")) return null;
  return {
    month,
    format,
    locale: params.get("locale") === "fil" ? ("fil" as const) : ("en" as const),
    ...range,
  };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export type ExportRow = {
  tracking_no: string;
  title: string;
  category: string;
  zone: string;
  status: string;
  created_at: string;
};
export function monthlyCsv(rows: ExportRow[], locale: ExportLocale) {
  const headers =
    locale === "fil"
      ? [
          "Numero ng ulat",
          "Pamagat",
          "Kategorya",
          "Pook",
          "Katayuan",
          "Petsa (UTC)",
        ]
      : [
          "Tracking number",
          "Title",
          "Category",
          "Zone",
          "Status",
          "Created (UTC)",
        ];
  return (
    "\uFEFF" +
    [
      headers,
      ...rows.map((r) => [
        r.tracking_no,
        r.title,
        r.category,
        r.zone,
        r.status,
        r.created_at,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
export type MonthlySummary = {
  total: number;
  statuses: Record<string, number>;
  categories: Record<string, number>;
};
