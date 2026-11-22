-- Phase 2 follow-up: literal punctuation-safe search and consistent Unicode trimming.
begin;

create function public.trim_report_text(value text) returns text
language sql immutable strict set search_path = '' as $$
  select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
revoke all on function public.trim_report_text(text) from public, anon, authenticated;

create function public.search_my_reports(p_search text default '')
returns setof public.reports
language sql stable security invoker set search_path = '' as $$
  select r.* from public.reports r
  where r.reporter_id = (select auth.uid())
    and char_length(p_search) <= 120
    and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'resident')
    and (p_search = '' or strpos(lower(r.title), lower(p_search)) > 0
         or strpos(lower(r.tracking_no), lower(p_search)) > 0);
$$;
revoke all on function public.search_my_reports(text) from public, anon, authenticated;
grant execute on function public.search_my_reports(text) to authenticated;

-- Replacement create_report definition follows below, retaining its existing grants.

create or replace function public.create_report(
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

  p_title := public.trim_report_text(p_title);
  p_description := public.trim_report_text(p_description);
  p_zone := public.trim_report_text(p_zone);
  p_location_details := nullif(public.trim_report_text(coalesce(p_location_details, '')), '');

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


commit;
