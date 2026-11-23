-- Existing users retain access. New accounts require an explicit administrator review.
begin;
alter table public.profiles
  add column approval_status text not null default 'approved' check(approval_status in ('pending','approved','rejected')),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz,
  add column review_note text check(char_length(review_note)<=1000);
create index profiles_pending_review_idx on public.profiles(created_at,id) where approval_status='pending';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,role,zone,approval_status)
  values(new.id,coalesce(nullif(left(public.trim_report_text(new.raw_user_meta_data->>'full_name'),120),''),'Resident'),
    'resident',nullif(left(public.trim_report_text(new.raw_user_meta_data->>'zone'),80),''),'pending');
  return new;
end; $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status='approved');
$$;
create function public.is_approved_resident() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='resident' and approval_status='approved');
$$;
revoke all on function public.is_approved_resident() from public,anon;
grant execute on function public.is_approved_resident() to authenticated;

create function public.review_resident(p_user_id uuid,p_approved boolean,p_note text default null) returns void
language plpgsql security definer set search_path='' as $$
declare member public.profiles%rowtype;
begin
  if auth.uid() is null or not public.is_admin() or p_user_id=auth.uid() then raise exception 'Administrator required' using errcode='42501'; end if;
  p_note:=nullif(public.trim_report_text(p_note),'');
  if p_user_id is null or p_approved is null or char_length(p_note)>1000 then raise exception 'Invalid review' using errcode='22023'; end if;
  select * into member from public.profiles where id=p_user_id for update;
  if not found or member.role<>'resident' then raise exception 'Resident unavailable' using errcode='P0002'; end if;
  if member.approval_status<>'pending' then raise exception 'Resident already reviewed' using errcode='PT409'; end if;
  update public.profiles set approval_status=case when p_approved then 'approved' else 'rejected' end,
    reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_note=p_note where id=p_user_id;
end; $$;
revoke all on function public.review_resident(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.review_resident(uuid,boolean,text) to authenticated;

-- Table triggers also cover SECURITY DEFINER RPCs, including operations in migration009.
-- Trusted maintenance without an end-user JWT remains possible; browser roles have no raw writes.
create function public.require_approved_actor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and not (public.is_admin() or public.is_approved_resident()) then
    raise exception 'Approved account required' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.require_approved_actor() from public,anon,authenticated;
do $$
declare item record;
begin
  for item in select tablename from pg_tables where schemaname='public' and tablename<>'profiles' loop
    execute format('create trigger require_approved_actor before insert or update or delete on public.%I for each row execute function public.require_approved_actor()',item.tablename);
    -- Pending users can still read their own profile and the public community projection.
    execute format('create policy approved_account_read on public.%I as restrictive for select to authenticated using ((select public.is_admin()) or (select public.is_approved_resident()))',item.tablename);
  end loop;
end; $$;

-- Reservation and trusted finalization both check the actual uploader's approval.
create or replace function public.can_add_evidence(p_report uuid,p_actor uuid,p_kind public.photo_type) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.reports r join public.profiles p on p.id=p_actor where r.id=p_report and p.approval_status='approved' and
    ((p.role='admin' and p_kind='resolution') or
     (p.role='resident' and p_kind='report' and r.reporter_id=p_actor and r.status in ('pending_review','in_progress'))));
$$;
commit;
