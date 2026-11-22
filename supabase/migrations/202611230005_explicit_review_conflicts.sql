-- Phase 3: avoid PostgREST automatic serialization-failure retries for stale reviews.
-- PT409 is an explicit HTTP conflict, not a transient database serialization failure.
begin;

create or replace function public.transition_report(
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
    raise exception 'Report changed; reload before reviewing' using errcode='PT409';
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

commit;
