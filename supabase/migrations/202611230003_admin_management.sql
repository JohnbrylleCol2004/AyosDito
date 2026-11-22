-- Phase 3: apply after all Phase 1 and Phase 2 migrations.
begin;
alter table public.reports add column status_version bigint not null default 0 check (status_version >= 0);
create index reports_updated_idx on public.reports (updated_at desc, id desc);

-- Use the actual database clock. The RPC reads the resulting timestamp for its audit entry.
create or replace function public.touch_report_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create function public.transition_report(
  p_report_id uuid, p_new_status text, p_note text, p_expected_version bigint
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  current_report public.reports%rowtype;
  changed_at timestamptz;
  update_id uuid;
begin
  if caller is null or not exists(select 1 from public.profiles where id=caller and role='admin') then
    raise exception 'Administrator authentication required' using errcode='42501';
  end if;
  p_note := public.trim_report_text(p_note);
  if p_note is null or char_length(p_note) not between 1 and 2000 or
     p_report_id is null or p_expected_version is null or p_expected_version < 0 or
     p_new_status is null or p_new_status not in ('in_progress','resolved','rejected') then
    raise exception 'Invalid transition input' using errcode='22023';
  end if;

  select * into current_report from public.reports where id=p_report_id for update;
  if not found then raise exception 'Report not found' using errcode='P0002'; end if;
  if current_report.status_version <> p_expected_version then
    raise exception 'Report changed; reload before reviewing' using errcode='40001';
  end if;
  if not ((current_report.status='pending_review' and p_new_status in ('in_progress','rejected')) or
          (current_report.status='in_progress' and p_new_status='resolved')) then
    raise exception 'Transition is not permitted' using errcode='22023';
  end if;

  update public.reports set status=p_new_status::public.report_status,
    status_version=status_version+1 where id=p_report_id returning updated_at into changed_at;
  insert into public.report_updates(report_id,admin_id,old_status,new_status,note,created_at)
  values(p_report_id,caller,current_report.status,p_new_status::public.report_status,p_note,changed_at)
  returning id into update_id;
  return update_id;
end;
$$;
revoke all on function public.transition_report(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.transition_report(uuid,text,text,bigint) to authenticated;

create function public.search_admin_reports(p_search text default '') returns setof public.reports
language sql stable security invoker set search_path = '' as $$
  select r.* from public.reports r where (select public.is_admin())
    and char_length(p_search) <= 120
    and (p_search='' or strpos(lower(r.title),lower(p_search))>0 or strpos(lower(r.tracking_no),lower(p_search))>0);
$$;
revoke all on function public.search_admin_reports(text) from public, anon, authenticated;
grant execute on function public.search_admin_reports(text) to authenticated;

create function public.admin_report_stats() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator authentication required' using errcode='42501';
  end if;
  with visible as (select status,category from public.reports),
  category_counts as (select category,count(*) as total from visible group by category)
  select jsonb_build_object(
    'total',count(*),
    'pending_review',count(*) filter(where status='pending_review'),
    'in_progress',count(*) filter(where status='in_progress'),
    'resolved',count(*) filter(where status='resolved'),
    'rejected',count(*) filter(where status='rejected'),
    'categories',(select coalesce(jsonb_object_agg(category,total),'{}'::jsonb) from category_counts)
  ) into result from visible;
  return result;
end;
$$;
revoke all on function public.admin_report_stats() from public, anon, authenticated;
grant execute on function public.admin_report_stats() to authenticated;

-- No direct app-client writes, including audit edits/deletes. RLS policies are unchanged.
revoke insert, update, delete on public.reports, public.report_updates from public, anon, authenticated;
commit;
