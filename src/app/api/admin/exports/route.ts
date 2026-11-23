import { currentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseExportRequest,
  monthlyCsv,
  type ExportRow,
  type MonthlySummary,
} from "@/lib/exports/format";
import { buildMonthlyPdf } from "@/lib/exports/pdf";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};
const failure = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers });
export async function GET(request: Request) {
  const profile = await currentProfile();
  if (
    !profile ||
    profile.role !== "admin" ||
    profile.approval_status !== "approved"
  )
    return failure("Approved administrator access required.", 403);
  const input = parseExportRequest(new URL(request.url).searchParams);
  if (!input)
    return failure(
      "Choose a month YYYY-MM (2000-2199) and csv or pdf format.",
      400,
    );
  const db = await createClient();
  const setup =
    "Export setup requires migration 202611240009_service_operations.sql. Ask the project administrator to apply it, then retry.";
  const errorResponse = (code?: string) =>
    failure(
      ["PGRST202", "PGRST205", "42883", "42P01"].includes(code ?? "")
        ? setup
        : "Export could not be read. Retry after checking your connection.",
      503,
    );
  if (input.format === "pdf") {
    const { data, error } = await db.rpc("admin_monthly_export_summary", {
      p_month: input.month,
    });
    if (error || !data) return errorResponse(error?.code);
    const bytes = await buildMonthlyPdf(
      input.month,
      data as MonthlySummary,
      input.locale,
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ayosdito-${input.month}-summary.pdf"`,
      },
    });
  }
  const base = () =>
    db
      .from("reports")
      .select("tracking_no,title,category,zone,status,created_at")
      .gte("created_at", input.start)
      .lt("created_at", input.end);
  const count = await db
    .from("reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", input.start)
    .lt("created_at", input.end);
  if (count.error || count.count === null)
    return errorResponse(count.error?.code);
  if (count.count > 5000)
    return failure(
      "This month exceeds the 5,000-row CSV limit. Download the aggregated PDF or request a scoped database export from the project administrator.",
      422,
    );
  const rows: ExportRow[] = [];
  for (let offset = 0; offset < count.count; offset += 500) {
    const { data, error } = await base()
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, Math.min(offset + 499, count.count - 1));
    if (error || !data) return errorResponse(error?.code);
    rows.push(...(data as ExportRow[]));
  }
  if (rows.length !== count.count)
    return failure("Report count changed during export. Please retry.", 409);
  return new Response(monthlyCsv(rows, input.locale), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ayosdito-${input.month}.csv"`,
    },
  });
}
