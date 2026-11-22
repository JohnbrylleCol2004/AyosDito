export const categories = [
  "streetlight",
  "road",
  "drainage",
  "waste",
  "public_facility",
  "other",
] as const;
export const reportStatuses = [
  "pending_review",
  "in_progress",
  "resolved",
  "rejected",
] as const;
export type Category = (typeof categories)[number];
export type ReportStatus = (typeof reportStatuses)[number];
export type ReportInput = {
  title: string;
  category: string;
  description: string;
  zone: string;
  location_details: string;
  submission_key: string;
};
export type ReportField = keyof ReportInput;
export type ReportErrors = Partial<Record<ReportField, boolean>>;
export type Report = {
  id: string;
  tracking_no: string;
  title: string;
  description: string;
  category: Category;
  zone: string;
  location_details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};
export type ReportUpdate = {
  id: string;
  old_status: ReportStatus;
  new_status: ReportStatus;
  note: string;
  created_at: string;
};
export type ReportFilters = {
  q: string;
  category: Category | "";
  status: ReportStatus | "";
  sort: "newest" | "oldest";
  page: number;
};
export const PAGE_SIZE = 12;
