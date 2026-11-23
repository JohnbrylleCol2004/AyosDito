-- Private service operations. No application role receives direct write privileges.
begin;
create function public.operations_actor_approved() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(to_jsonb(p)->>'approval_status','approved')='approved');
$$;
revoke all on function public.operations_actor_approved() from public,anon;
grant execute on function public.operations_actor_approved() to authenticated;

create table public.report_workflows (
 report_id uuid primary key references public.reports(id) on delete cascade,
 assignee_id uuid references public.profiles(id),
 responsible_office text check(char_length(responsible_office) between 1 and 120),
 target_date date,
 duplicate_of uuid references public.reports(id),
 version bigint not null default 0 check(version>=0),
 check(duplicate_of is distinct from report_id)
);
create index report_workflows_due_idx on public.report_workflows(target_date,report_id);
create table public.report_internal_notes (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports(id) on delete cascade,
 admin_id uuid not null references public.profiles(id),note text not null check(char_length(note) between 1 and 2000),created_at timestamptz not null default now()
);
create table public.report_feedback (
 report_id uuid primary key references public.reports(id) on delete cascade,
 resident_id uuid not null references public.profiles(id),rating integer not null check(rating between 1 and 5),
 comment text check(char_length(comment)<=2000),updated_at timestamptz not null default now()
);
create table public.report_reopen_requests (
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.reports(id) on delete cascade,
 resident_id uuid not null references public.profiles(id),reason text not null check(char_length(reason) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references public.profiles(id),review_note text check(char_length(review_note) between 1 and 2000)
);
create unique index report_reopen_pending_idx on public.report_reopen_requests(report_id) where status='pending';
create table public.report_locations (
 report_id uuid primary key references public.reports(id) on delete cascade,
 latitude numeric not null check(latitude between -90 and 90),longitude numeric not null check(longitude between -180 and 180),updated_at timestamptz not null default now()
);
create table public.community_map_pins (
 report_id uuid primary key references public.reports(id) on delete cascade,
 latitude numeric(5,2) not null check(latitude between -90 and 90),longitude numeric(6,2) not null check(longitude between -180 and 180)
);
-- A definer predicate permits anon projection access without granting private report SELECT.
create function public.is_map_report_public(p_report_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.reports where id=p_report_id and is_public and status in ('in_progress','resolved'));
$$;
revoke all on function public.is_map_report_public(uuid) from public;
grant execute on function public.is_map_report_public(uuid) to anon,authenticated;
alter table public.report_workflows enable row level security;
alter table public.report_internal_notes enable row level security;
alter table public.report_feedback enable row level security;
alter table public.report_reopen_requests enable row level security;
alter table public.report_locations enable row level security;
alter table public.community_map_pins enable row level security;
revoke all on public.report_workflows,public.report_internal_notes,public.report_feedback,public.report_reopen_requests,public.report_locations,public.community_map_pins from public,anon,authenticated;
grant select on public.report_workflows,public.report_internal_notes,public.report_feedback,public.report_reopen_requests,public.report_locations,public.community_map_pins to authenticated;
grant select on public.community_map_pins to anon;
grant all on public.report_workflows,public.report_internal_notes,public.report_feedback,public.report_reopen_requests,public.report_locations,public.community_map_pins to service_role;
create policy workflows_admin on public.report_workflows for select to authenticated using((select public.is_admin()));
create policy notes_admin on public.report_internal_notes for select to authenticated using((select public.is_admin()));
create policy feedback_private on public.report_feedback for select to authenticated using(resident_id=(select auth.uid()) or (select public.is_admin()));
create policy reopen_private on public.report_reopen_requests for select to authenticated using(resident_id=(select auth.uid()) or (select public.is_admin()));
create policy locations_private on public.report_locations for select to authenticated using(exists(select 1 from public.reports r where r.id=report_id and (r.reporter_id=(select auth.uid()) or (select public.is_admin()))));
create policy map_public on public.community_map_pins for select to anon,authenticated using(public.is_map_report_public(report_id));

create function public.set_report_workflow(p_report_id uuid,p_assignee_id uuid,p_responsible_office text,p_target_date date,p_duplicate_of uuid,p_expected_version bigint) returns bigint
language plpgsql security definer set search_path='' as $$
declare current_version bigint;
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 -- Serialize graph mutations, including concurrent links between different reports.
 perform pg_advisory_xact_lock(240009);
 perform 1 from public.reports where id=p_report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='P0002'; end if;
 insert into public.report_workflows(report_id) values(p_report_id) on conflict do nothing;
 select version into current_version from public.report_workflows where report_id=p_report_id for update;
 if p_expected_version is null or current_version<>p_expected_version then raise exception 'Workflow changed; reload before saving' using errcode='PT409'; end if;
 p_responsible_office:=nullif(public.trim_report_text(p_responsible_office),'');
 if (p_responsible_office is not null and char_length(p_responsible_office)>120) or
 (p_assignee_id is not null and not exists(select 1 from public.profiles p where p.id=p_assignee_id and p.role='admin' and coalesce(to_jsonb(p)->>'approval_status','approved')='approved')) then raise exception 'Invalid office or administrator' using errcode='22023'; end if;
 if p_duplicate_of is not null then
  if not exists(select 1 from public.reports where id=p_duplicate_of) or exists(
   with recursive chain(id) as (select p_duplicate_of union select w.duplicate_of from public.report_workflows w join chain c on c.id=w.report_id where w.duplicate_of is not null)
   select 1 from chain where id=p_report_id
  ) then raise exception 'Invalid duplicate link or cycle' using errcode='22023'; end if;
 end if;
 update public.report_workflows set assignee_id=p_assignee_id,responsible_office=p_responsible_office,target_date=p_target_date,duplicate_of=p_duplicate_of,version=version+1 where report_id=p_report_id returning version into current_version;
 return current_version;
end; $$;
create function public.add_report_internal_note(p_report_id uuid,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 p_note:=public.trim_report_text(p_note);
 if p_note is null or char_length(p_note) not between 1 and 2000 then raise exception 'Note must contain 1 to 2000 characters' using errcode='22023'; end if;
 insert into public.report_internal_notes(report_id,admin_id,note) values(p_report_id,auth.uid(),p_note) returning id into new_id; return new_id;
end; $$;
create function public.save_report_feedback(p_report_id uuid,p_rating integer,p_comment text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.operations_actor_approved() then raise exception 'Approved resident required' using errcode='42501'; end if;
 perform 1 from public.reports r join public.profiles p on p.id=r.reporter_id where r.id=p_report_id and r.reporter_id=auth.uid() and p.role='resident' and r.status='resolved' for update of r;
 if not found then raise exception 'Only the owner of a resolved report can give feedback' using errcode='42501'; end if;
 p_comment:=nullif(public.trim_report_text(p_comment),'');
 if p_rating is null or p_rating not between 1 and 5 or char_length(p_comment)>2000 then raise exception 'Invalid feedback' using errcode='22023'; end if;
 insert into public.report_feedback(report_id,resident_id,rating,comment) values(p_report_id,auth.uid(),p_rating,p_comment)
 on conflict(report_id) do update set rating=excluded.rating,comment=excluded.comment,updated_at=clock_timestamp();
end; $$;
create function public.request_report_reopen(p_report_id uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null or not public.operations_actor_approved() then raise exception 'Approved resident required' using errcode='42501'; end if;
 perform 1 from public.reports r join public.profiles p on p.id=r.reporter_id where r.id=p_report_id and r.reporter_id=auth.uid() and p.role='resident' and r.status='resolved' for update of r;
 if not found then raise exception 'Only the owner of a resolved report can request reopening' using errcode='42501'; end if;
 p_reason:=public.trim_report_text(p_reason);
 if p_reason is null or char_length(p_reason) not between 10 and 2000 then raise exception 'Reason must contain 10 to 2000 characters' using errcode='22023'; end if;
 if exists(select 1 from public.report_reopen_requests where report_id=p_report_id and status='pending') then raise exception 'A request is already pending' using errcode='PT409'; end if;
 insert into public.report_reopen_requests(report_id,resident_id,reason) values(p_report_id,auth.uid(),p_reason) returning id into new_id; return new_id;
end; $$;
create function public.review_report_reopen(p_request_id uuid,p_approve boolean,p_note text,p_expected_version bigint) returns void language plpgsql security definer set search_path='' as $$
declare request_row public.report_reopen_requests%rowtype; current_report public.reports%rowtype; current_version bigint; changed_at timestamptz;
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 select * into request_row from public.report_reopen_requests where id=p_request_id;
 if not found then raise exception 'Request unavailable' using errcode='P0002'; end if;
 -- Lock reports before workflows/requests, matching the assignment lock order.
 select * into current_report from public.reports where id=request_row.report_id for update;
 insert into public.report_workflows(report_id) values(request_row.report_id) on conflict do nothing;
 select version into current_version from public.report_workflows where report_id=request_row.report_id for update;
 select * into request_row from public.report_reopen_requests where id=p_request_id for update;
 if p_expected_version is null or current_version<>p_expected_version or request_row.status<>'pending' or current_report.status<>'resolved' then raise exception 'Request or workflow changed; reload before reviewing' using errcode='PT409'; end if;
 p_note:=public.trim_report_text(p_note);
 if p_approve is null or p_note is null or char_length(p_note) not between 1 and 2000 then raise exception 'A review decision and note are required' using errcode='22023'; end if;
 update public.report_reopen_requests set status=case when p_approve then 'approved' else 'rejected' end,review_note=p_note,reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=p_request_id;
 update public.report_workflows set version=version+1 where report_id=request_row.report_id;
 if p_approve then
  update public.reports set status='in_progress',status_version=status_version+1,is_public=false where id=request_row.report_id returning updated_at into changed_at;
  insert into public.report_updates(report_id,admin_id,old_status,new_status,note,created_at) values(request_row.report_id,auth.uid(),'resolved','in_progress',p_note,changed_at);
 end if;
end; $$;
create function public.save_report_location(p_report_id uuid,p_latitude numeric,p_longitude numeric) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.operations_actor_approved() then raise exception 'Approved account required' using errcode='42501'; end if;
 perform 1 from public.reports where id=p_report_id and (public.is_admin() or (reporter_id=auth.uid() and status in ('pending_review','in_progress'))) for update;
 if not found then raise exception 'Location edit not permitted' using errcode='42501'; end if;
 if (p_latitude is null)<>(p_longitude is null) or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinate pair' using errcode='22023'; end if;
 if p_latitude is null then delete from public.report_locations where report_id=p_report_id; return; end if;
 insert into public.report_locations(report_id,latitude,longitude) values(p_report_id,p_latitude,p_longitude) on conflict(report_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=clock_timestamp();
end; $$;
create function public.set_public_map_pin(p_report_id uuid,p_latitude numeric,p_longitude numeric) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 perform 1 from public.reports where id=p_report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='P0002'; end if;
 if (p_latitude is null)<>(p_longitude is null) or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinate pair' using errcode='22023'; end if;
 if p_latitude is null then delete from public.community_map_pins where report_id=p_report_id; return; end if;
 if not public.is_map_report_public(p_report_id) then raise exception 'Publish an approved report before setting a public pin' using errcode='42501'; end if;
 insert into public.community_map_pins(report_id,latitude,longitude) values(p_report_id,round(p_latitude,2),round(p_longitude,2)) on conflict(report_id) do update set latitude=excluded.latitude,longitude=excluded.longitude;
end; $$;
create function public.admin_operations_summary() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 select jsonb_build_object('unassigned',count(*) filter(where w.assignee_id is null),'overdue',count(*) filter(where w.target_date<(now() at time zone 'Asia/Manila')::date),'due_today',count(*) filter(where w.target_date=(now() at time zone 'Asia/Manila')::date),'reopen_pending',(select count(*) from public.report_reopen_requests where status='pending')) into result from public.reports r left join public.report_workflows w on w.report_id=r.id where r.status in ('pending_review','in_progress'); return result;
end; $$;
revoke all on function public.set_report_workflow(uuid,uuid,text,date,uuid,bigint),public.add_report_internal_note(uuid,text),public.save_report_feedback(uuid,integer,text),public.request_report_reopen(uuid,text),public.review_report_reopen(uuid,boolean,text,bigint),public.save_report_location(uuid,numeric,numeric),public.set_public_map_pin(uuid,numeric,numeric),public.admin_operations_summary() from public,anon,authenticated;
grant execute on function public.set_report_workflow(uuid,uuid,text,date,uuid,bigint),public.add_report_internal_note(uuid,text),public.save_report_feedback(uuid,integer,text),public.request_report_reopen(uuid,text),public.review_report_reopen(uuid,boolean,text,bigint),public.save_report_location(uuid,numeric,numeric),public.set_public_map_pin(uuid,numeric,numeric),public.admin_operations_summary() to authenticated;
-- Safe bounded map projection: never join the private location table.
create function public.public_map_issues() returns table(report_id uuid,public_title text,category text,status text,latitude numeric,longitude numeric)
language sql stable security definer set search_path='' as $$
 select r.id,r.public_title,r.category::text,r.status::text,p.latitude,p.longitude
 from public.community_map_pins p join public.reports r on r.id=p.report_id
 where r.is_public and r.status in ('in_progress','resolved')
 order by r.created_at desc,r.id desc limit 200;
$$;
revoke all on function public.public_map_issues() from public;
grant execute on function public.public_map_issues() to anon,authenticated;

create function public.admin_monthly_export_summary(p_month text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if auth.uid() is null or not public.is_admin() or not public.operations_actor_approved() then raise exception 'Approved administrator required' using errcode='42501'; end if;
 if p_month is null or p_month !~ '^(20|21)[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'Use month YYYY-MM, 2000 through 2199' using errcode='22023'; end if;
 start_at:=(p_month||'-01')::date::timestamp at time zone 'Asia/Manila';
 end_at:=((p_month||'-01')::date+interval '1 month')::timestamp at time zone 'Asia/Manila';
 with monthly as (select status,category from public.reports where created_at>=start_at and created_at<end_at),
 statuses as (select status,count(*) as n from monthly group by status),categories as (select category,count(*) as n from monthly group by category)
 select jsonb_build_object('total',(select count(*) from monthly),'statuses',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from statuses),'categories',(select coalesce(jsonb_object_agg(category,n),'{}'::jsonb) from categories)) into result;
 return result;
end; $$;
revoke all on function public.admin_monthly_export_summary(text) from public,anon,authenticated;
grant execute on function public.admin_monthly_export_summary(text) to authenticated;
commit;
