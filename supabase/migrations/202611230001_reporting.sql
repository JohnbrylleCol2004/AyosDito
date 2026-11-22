-- Phase 2: apply AFTER 202611220001_foundation.sql. Existing rows are preserved.
begin;

alter table public.reports add column submission_key uuid;
alter table public.reports add constraint reports_reporter_submission_unique unique (reporter_id, submission_key);
-- NOT VALID preserves historical rows; PostgreSQL still enforces these on all new writes.
alter table public.reports add constraint reports_phase2_lengths check (
  char_length(btrim(title)) between 5 and 120 and
  char_length(btrim(description)) between 20 and 2000 and
  char_length(btrim(zone)) between 1 and 80 and
  (location_details is null or char_length(location_details) <= 200)
) not valid;
create index reports_owner_created_idx on public.reports (reporter_id, created_at desc, id desc);

create function public.create_report(
  p_title text, p_category text, p_description text, p_zone text,
  p_location_details text, p_submission_key uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result_id uuid;
  existing public.reports%rowtype;
begin
  if caller is null or not exists (
    select 1 from public.profiles where id = caller and role = 'resident'
  ) then
    raise exception 'Resident authentication required' using errcode = '42501';
  end if;

  p_title := regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  p_description := regexp_replace(p_description, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  p_zone := regexp_replace(p_zone, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  p_location_details := nullif(regexp_replace(coalesce(p_location_details, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');

  if p_title is null or char_length(p_title) not between 5 and 120 or
     p_description is null or char_length(p_description) not between 20 and 2000 or
     p_zone is null or char_length(p_zone) not between 1 and 80 or
     char_length(coalesce(p_location_details, '')) > 200 or
     p_category is null or p_category not in ('streetlight','road','drainage','waste','public_facility','other') or
     p_submission_key is null then
    raise exception 'Invalid report fields' using errcode = '22023';
  end if;

  -- No browser-supplied owner, status, tracking number or timestamps are accepted.
  insert into public.reports (
    reporter_id, title, description, category, zone, location_details, submission_key,
    status, tracking_no, created_at, updated_at
  ) values (
    caller, p_title, p_description, p_category::public.issue_category, p_zone,
    p_location_details, p_submission_key, 'pending_review',
    public.next_report_tracking_no(), now(), now()
  ) on conflict (reporter_id, submission_key) do nothing
  returning id into result_id;

  if result_id is null then
    -- A new statement sees a concurrently committed retry winner under READ COMMITTED.
    select * into existing from public.reports
      where reporter_id = caller and submission_key = p_submission_key;
    if not found or existing.title is distinct from p_title or
       existing.description is distinct from p_description or
       existing.category::text is distinct from p_category or
       existing.zone is distinct from p_zone or
       existing.location_details is distinct from p_location_details then
      raise exception 'Submission token already used with different data' using errcode = '22023';
    end if;
    result_id := existing.id;
  end if;
  return result_id;
end;
$$;

revoke all on function public.create_report(text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.create_report(text,text,text,text,text,uuid) to authenticated;
-- Direct writes remain forbidden. The controlled RPC is the only resident write entry point.
revoke insert, update, delete on public.reports from public, anon, authenticated;

commit;
