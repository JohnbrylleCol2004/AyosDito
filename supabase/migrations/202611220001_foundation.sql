-- Apply once to a fresh Supabase project using the SQL editor or Supabase CLI.
begin;

create type public.app_role as enum ('resident', 'admin');
create type public.report_status as enum ('pending_review', 'in_progress', 'resolved', 'rejected');
create type public.issue_category as enum ('streetlight', 'road', 'drainage', 'waste', 'public_facility', 'other');
create type public.photo_type as enum ('report', 'resolution');
create sequence public.report_tracking_seq;

create function public.next_report_tracking_no() returns text
language plpgsql set search_path = '' as $$
declare value text;
begin
  value := nextval('public.report_tracking_seq')::text;
  return 'AY-' || lpad(value, greatest(6, length(value)), '0');
end;
$$;
revoke all on function public.next_report_tracking_no() from public, anon, authenticated;
grant execute on function public.next_report_tracking_no() to service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role public.app_role not null default 'resident',
  zone text check (char_length(zone) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tracking_no text not null unique default public.next_report_tracking_no(),
  reporter_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 5 and 160),
  description text not null check (char_length(description) between 10 and 5000),
  category public.issue_category not null,
  zone text not null check (char_length(zone) between 1 and 80),
  location_details text check (char_length(location_details) <= 500),
  status public.report_status not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  old_status public.report_status not null,
  new_status public.report_status not null,
  note text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  photo_type public.photo_type not null,
  created_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports(reporter_id);
create index reports_status_created_idx on public.reports(status, created_at desc);
create index report_updates_report_idx on public.report_updates(report_id, created_at);
create index report_updates_admin_idx on public.report_updates(admin_id);
create index report_confirmations_user_idx on public.report_confirmations(user_id);
create index report_photos_report_idx on public.report_photos(report_id);
create index report_photos_uploader_idx on public.report_photos(uploaded_by);

-- Fixed search_path and no user-controlled role metadata. New accounts are ALWAYS residents.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role, zone)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''), 'Demo Resident'),
    'resident',
    nullif(left(trim(new.raw_user_meta_data ->> 'zone'), 80), '')
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- A fixed boolean query avoids exposing profiles or recursively invoking their RLS policy.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.touch_report_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_report_updated_at() from public, anon, authenticated;
create trigger touch_report_updated_at before update on public.reports
for each row execute function public.touch_report_updated_at();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_updates enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.report_photos enable row level security;

revoke all on public.profiles, public.reports, public.report_updates, public.report_confirmations, public.report_photos from public, anon, authenticated;
revoke all on sequence public.report_tracking_seq from public, anon, authenticated;
grant select on public.profiles, public.reports, public.report_updates, public.report_confirmations, public.report_photos to authenticated;
-- Privileged provisioning and future backend maintenance only.
grant all on public.profiles, public.reports, public.report_updates, public.report_confirmations, public.report_photos to service_role;
grant usage, select on sequence public.report_tracking_seq to service_role;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
create policy reports_read on public.reports for select to authenticated
using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy updates_read on public.report_updates for select to authenticated
using (exists(select 1 from public.reports r where r.id = report_id));
create policy photos_read on public.report_photos for select to authenticated
using (exists(select 1 from public.reports r where r.id = report_id));
-- A resident sees only their own confirmation; never other residents' identities.
create policy confirmations_read on public.report_confirmations for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Deliberately no INSERT/UPDATE/DELETE policies in Phase 1, including profile edits.
-- Later phases add narrowly scoped transactional functions and a privacy-safe community endpoint.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);
-- No object policies: both reads and uploads remain closed until the reporting phase.

commit;
