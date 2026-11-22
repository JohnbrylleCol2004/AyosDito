import Link from "next/link";
import {
  categories,
  reportStatuses,
  type ReportFilters as Filters,
} from "@/types/reports";
import type { ReportsDictionary } from "@/lib/i18n/reports";

export function ReportFilters({
  filters,
  t,
}: {
  filters: Filters;
  t: ReportsDictionary;
}) {
  return (
    <form className="report-filters panel" action="/reports" method="get">
      <div className="field filter-search">
        <label htmlFor="report-search">{t.search}</label>
        <input
          id="report-search"
          name="q"
          defaultValue={filters.q}
          placeholder={t.searchHint}
          maxLength={120}
          type="search"
        />
      </div>
      <div className="field">
        <label htmlFor="filter-category">{t.categoryLabel}</label>
        <select
          id="filter-category"
          name="category"
          defaultValue={filters.category}
        >
          <option value="">{t.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {t.categories[category]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-status">{t.allStatuses}</label>
        <select id="filter-status" name="status" defaultValue={filters.status}>
          <option value="">{t.allStatuses}</option>
          {reportStatuses.map((status) => (
            <option key={status} value={status}>
              {t.statuses[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-sort">{t.sort}</label>
        <select id="filter-sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">{t.newest}</option>
          <option value="oldest">{t.oldest}</option>
        </select>
      </div>
      <div className="filter-actions">
        <button className="button primary">{t.apply}</button>
        <Link className="button" href="/reports">
          {t.reset}
        </Link>
      </div>
    </form>
  );
}
