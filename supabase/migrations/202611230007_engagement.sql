-- Phase 4: explicitly moderated public projections and transactional inbox.
begin;
alter table public.reports add column is_public boolean not null default false,
  add column public_title text,
  add column public_summary text,
  add column public_zone text;
alter table public.reports add constraint reports_public_fields check (
  not is_public or (public_title is not null and char_length(public_title) between 5 and 120
  and public_summary is not null and char_length(public_summary) between 20 and 500
  and public_zone is not null and char_length(public_zone) between 1 and 80
  and status in ('in_progress','resolved')));
create index reports_public_created_idx on public.reports(created_at desc,id desc) where is_public;

create function public.set_report_publication(p_report_id uuid,p_published boolean,p_title text,p_summary text,p_zone text,p_confirmed_safe boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_report public.reports%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_published is null then raise exception 'Invalid publication choice' using errcode='22023'; end if;
  select * into current_report from public.reports where id=p_report_id for update;
  if not found then raise exception 'Report unavailable' using errcode='P0002'; end if;
  if p_published then
    p_title:=public.trim_report_text(p_title); p_summary:=public.trim_report_text(p_summary); p_zone:=public.trim_report_text(p_zone);
    if p_confirmed_safe is distinct from true or current_report.status not in ('in_progress','resolved')
      or p_title is null or char_length(p_title) not between 5 and 120
      or p_summary is null or char_length(p_summary) not between 20 and 500
      or p_zone is null or char_length(p_zone) not between 1 and 80 then
      raise exception 'Invalid public summary or missing privacy confirmation' using errcode='22023';
    end if;
    update public.reports set is_public=true,public_title=p_title,public_summary=p_summary,public_zone=p_zone where id=p_report_id;
  else
    update public.reports set is_public=false where id=p_report_id;
  end if;
end; $$;

create function public.community_reports(p_search text default '',p_category text default '',p_zone text default '',p_status text default '',p_sort text default 'newest',p_page integer default 1,p_id uuid default null)
returns table(id uuid,public_title text,public_summary text,public_zone text,category text,status text,confirmation_count bigint,viewer_confirmed boolean,total_count bigint)
language sql stable security definer set search_path='' as $$
  with safe as (
    select r.id,r.public_title,r.public_summary,r.public_zone,r.category::text as category,r.status::text as status,r.created_at,
      (select count(*) from public.report_confirmations c where c.report_id=r.id) as confirmation_count,
      exists(select 1 from public.report_confirmations c where c.report_id=r.id and c.user_id=auth.uid()) as viewer_confirmed
    from public.reports r where r.is_public and r.status in ('in_progress','resolved')
      and char_length(p_search)<=120 and char_length(p_zone)<=80
      and (p_id is null or r.id=p_id)
      and (p_search='' or strpos(lower(r.public_title),lower(p_search))>0 or strpos(lower(r.public_summary),lower(p_search))>0)
      and (p_category='' or r.category::text=p_category) and (p_zone='' or r.public_zone=p_zone)
      and (p_status='' or r.status::text=p_status)
  ) select s.id,s.public_title,s.public_summary,s.public_zone,s.category,s.status,s.confirmation_count,s.viewer_confirmed,count(*) over()
    from safe s order by case when p_sort='confirmed' then s.confirmation_count end desc,s.created_at desc,s.id desc
    limit 12 offset ((greatest(1,least(coalesce(p_page,1),100000))-1)::bigint*12);
$$;

create function public.set_report_confirmation(p_report_id uuid,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); current_report public.reports%rowtype;
begin
  if caller is null or not exists(select 1 from public.profiles where id=caller and role='resident') then
    raise exception 'Resident required' using errcode='42501'; end if;
  if p_confirmed is null then raise exception 'Invalid confirmation choice' using errcode='22023'; end if;
  select * into current_report from public.reports where id=p_report_id for update;
  if not found then raise exception 'Report unavailable' using errcode='P0002'; end if;
  if p_confirmed then
    if not current_report.is_public or current_report.status not in ('in_progress','resolved') then
      raise exception 'Issue is not public' using errcode='42501'; end if;
    insert into public.report_confirmations(report_id,user_id) values(p_report_id,caller) on conflict(report_id,user_id) do nothing;
  else
    delete from public.report_confirmations where report_id=p_report_id and user_id=caller;
  end if;
end; $$;
-- Confirmation identities are available only through each resident's own rows.
drop policy confirmations_read on public.report_confirmations;
create policy confirmations_read on public.report_confirmations for select to authenticated using(user_id=(select auth.uid()));
revoke insert,update,delete on public.report_confirmations from public,anon,authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  report_update_id uuid not null references public.report_updates(id) on delete cascade,
  type text not null check(type='report_status'),
  title_key text not null check(title_key='status_update'),
  message_key text not null check(message_key in ('in_progress','resolved','rejected')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique(report_update_id,recipient_id)
);
create index notifications_inbox_idx on public.notifications(recipient_id,created_at desc,id desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=(select auth.uid()));
create function public.notify_report_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(recipient_id,report_id,report_update_id,type,title_key,message_key,created_at)
    select reporter_id,new.report_id,new.id,'report_status','status_update',new.new_status::text,new.created_at
    from public.reports where id=new.report_id;
  return new;
end; $$;
revoke all on function public.notify_report_status() from public,anon,authenticated;
create trigger report_status_notification after insert on public.report_updates for each row execute function public.notify_report_status();

create function public.mark_notifications_read(p_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.notifications set is_read=true where recipient_id=auth.uid() and (p_id is null or id=p_id) and not is_read;
end; $$;
revoke all on function public.set_report_publication(uuid,boolean,text,text,text,boolean), public.set_report_confirmation(uuid,boolean), public.community_reports(text,text,text,text,text,integer,uuid),public.mark_notifications_read(uuid) from public,anon,authenticated;
grant execute on function public.set_report_publication(uuid,boolean,text,text,text,boolean),public.set_report_confirmation(uuid,boolean),public.mark_notifications_read(uuid) to authenticated;
grant execute on function public.community_reports(text,text,text,text,text,integer,uuid) to anon,authenticated;
commit;
