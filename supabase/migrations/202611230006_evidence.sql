-- Phase 4 private evidence. Apply after all Phase 3 migrations.
begin;
alter table public.report_photos add column upload_state text not null default 'ready' check(upload_state in ('pending','ready','cancelled'));
alter table public.report_photos add column request_key uuid;
alter table public.report_photos add column upload_expires_at timestamptz;
alter table public.report_photos add column cancelled_at timestamptz;
alter table public.report_photos add constraint evidence_request_unique unique(report_id,uploaded_by,request_key);
create index evidence_cleanup_idx on public.report_photos(upload_state,created_at);

create function public.can_add_evidence(p_report uuid,p_actor uuid,p_kind public.photo_type) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.reports r join public.profiles p on p.id=p_actor where r.id=p_report and
    ((p.role='admin' and p_kind='resolution') or
     (p.role='resident' and p_kind='report' and r.reporter_id=p_actor and r.status in ('pending_review','in_progress'))));
$$;
revoke all on function public.can_add_evidence(uuid,uuid,public.photo_type) from public,anon,authenticated;

create function public.reserve_evidence(p_report_id uuid,p_photo_type text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); item public.report_photos%rowtype; new_id uuid:=gen_random_uuid();
begin
  if caller is null or p_request_key is null or p_photo_type is null or p_photo_type not in ('report','resolution') then raise exception 'Invalid evidence request' using errcode='42501'; end if;
  perform 1 from public.reports where id=p_report_id for update;
  if not found or not public.can_add_evidence(p_report_id,caller,p_photo_type::public.photo_type) then raise exception 'Evidence upload not permitted' using errcode='42501'; end if;
  select * into item from public.report_photos where report_id=p_report_id and uploaded_by=caller and request_key=p_request_key;
  if found then
    if item.photo_type::text<>p_photo_type then raise exception 'Upload request expired' using errcode='PT409'; end if;
    if item.upload_state='cancelled' or (item.upload_state='pending' and item.upload_expires_at<=clock_timestamp()) then
      -- Keep the old path tracked for cleanup; retry gets a fresh, non-overwriting path.
      update public.report_photos set request_key=null,upload_state='cancelled',cancelled_at=coalesce(cancelled_at,clock_timestamp()) where id=item.id;
    else
      return jsonb_build_object('id',item.id,'path',item.storage_path,'state',item.upload_state);
    end if;
  end if;
  if p_photo_type='report' and (select count(*) from public.report_photos where report_id=p_report_id and photo_type='report' and (upload_state='ready' or (upload_state='pending' and upload_expires_at>clock_timestamp())))>=3 then
    raise exception 'Resident photo limit reached' using errcode='23514';
  end if;
  insert into public.report_photos(id,report_id,uploaded_by,storage_path,photo_type,upload_state,request_key,upload_expires_at)
    values(new_id,p_report_id,caller,p_report_id::text||'/'||new_id::text||'.webp',p_photo_type::public.photo_type,'pending',p_request_key,clock_timestamp()+interval '15 minutes') returning * into item;
  return jsonb_build_object('id',item.id,'path',item.storage_path,'state',item.upload_state);
end;
$$;
revoke all on function public.reserve_evidence(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_evidence(uuid,text,uuid) to authenticated;

-- Trusted backend only: the browser cannot make unvalidated Storage bytes visible.
create function public.finalize_evidence(p_photo_id uuid,p_actor uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare item public.report_photos%rowtype; report_id_value uuid;
begin
  select report_id into report_id_value from public.report_photos where id=p_photo_id;
  perform 1 from public.reports where id=report_id_value for update;
  select * into item from public.report_photos where id=p_photo_id for update;
  if not found or item.uploaded_by is distinct from p_actor then raise exception 'Evidence finalization denied' using errcode='42501'; end if;
  if item.upload_state='ready' then return true; end if;
  if item.upload_state<>'pending' or item.upload_expires_at<=clock_timestamp() then raise exception 'Upload expired' using errcode='PT409'; end if;
  if not public.can_add_evidence(item.report_id,p_actor,item.photo_type) then raise exception 'Evidence finalization denied' using errcode='42501'; end if;
  update public.report_photos set upload_state='ready',upload_expires_at=null where id=p_photo_id;
  return true;
end;
$$;
revoke all on function public.finalize_evidence(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_evidence(uuid,uuid) to service_role;

create function public.cancel_evidence(p_photo_id uuid,p_actor uuid) returns text
language plpgsql security definer set search_path='' as $$
declare item public.report_photos%rowtype; report_id_value uuid;
begin
  select report_id into report_id_value from public.report_photos where id=p_photo_id;
  perform 1 from public.reports where id=report_id_value for update;
  select * into item from public.report_photos where id=p_photo_id for update;
  if not found then return 'missing'; end if;
  if item.uploaded_by is distinct from p_actor then raise exception 'Evidence cancellation denied' using errcode='42501'; end if;
  if item.upload_state='ready' then return 'ready'; end if;
  update public.report_photos set upload_state='cancelled',cancelled_at=coalesce(cancelled_at,clock_timestamp()) where id=p_photo_id;
  return 'cancelled';
end;
$$;
revoke all on function public.cancel_evidence(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_evidence(uuid,uuid) to service_role;

-- Only ready evidence belonging to an authorized private report can be signed/read.
create policy evidence_private_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and exists(select 1 from public.report_photos p join public.reports r on r.id=p.report_id
  where p.storage_path=name and p.upload_state='ready' and (r.reporter_id=(select auth.uid()) or (select public.is_admin()))));
-- No authenticated object INSERT/UPDATE/DELETE policies: only validated server writes.
commit;
