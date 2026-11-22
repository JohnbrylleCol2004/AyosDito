import Link from "next/link";
import { categories, reportStatuses } from "@/types/reports";
import type { AdminFilters } from "@/lib/validations/status-transitions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AdminReportFilters({
  filters,
  t,
}: {
  filters: AdminFilters;
  t: Dictionary;
}) {
  const r = t.reports;
  const a = t.adminReports;
  return (
    <form
      className="report-filters admin-filters panel"
      action="/admin/reports"
      method="get"
    >
      <div className="field filter-search">
        <label htmlFor="admin-search">{r.search}</label>
        <input
          id="admin-search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder={r.searchHint}
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="admin-status">{t.status}</label>
        <select id="admin-status" name="status" defaultValue={filters.status}>
          <option value="">{r.allStatuses}</option>
          {reportStatuses.map((status) => (
            <option key={status} value={status}>
              {r.statuses[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="admin-category">{r.categoryLabel}</label>
        <select
          id="admin-category"
          name="category"
          defaultValue={filters.category}
        >
          <option value="">{r.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {r.categories[category]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="admin-zone">{a.zoneFilter}</label>
        <input
          id="admin-zone"
          name="zone"
          defaultValue={filters.zone}
          maxLength={80}
          aria-describedby="admin-zone-hint"
        />
        <p id="admin-zone-hint" className="field-hint">
          {a.zoneHint}
        </p>
      </div>
      <div className="field">
        <label htmlFor="admin-sort">{r.sort}</label>
        <select id="admin-sort" name="sort" defaultValue={filters.sort}>
          <option value="pending">{a.pendingFirst}</option>
          <option value="newest">{r.newest}</option>
          <option value="oldest">{r.oldest}</option>
        </select>
      </div>
      <div className="filter-actions">
        <button className="button primary">{r.apply}</button>
        <Link className="button" href="/admin/reports">
          {r.reset}
        </Link>
      </div>
    </form>
  );
}
