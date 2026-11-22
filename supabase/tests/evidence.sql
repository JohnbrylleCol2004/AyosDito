-- Test project only. Run as postgres after Phase 4 evidence migration; rolls back.
begin;
insert into auth.users(id) values('a6666666-6666-4666-8666-666666666666'),('a7777777-7777-4777-8777-777777777777'),('a8888888-8888-4888-8888-888888888888');
update public.profiles set role='admin' where id='a8888888-8888-4888-8888-888888888888';
insert into public.reports(id,reporter_id,title,description,category,zone) values('b6666666-6666-4666-8666-666666666666','a6666666-6666-4666-8666-666666666666','Evidence test','Fictional evidence permission test.','other','Demo');
set local role authenticated;
select set_config('request.jwt.claim.sub','a6666666-6666-4666-8666-666666666666',true);
do $$ declare first jsonb; retry jsonb; begin
  first:=public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report','c6666666-6666-4666-8666-666666666666');
  retry:=public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report','c6666666-6666-4666-8666-666666666666');
  assert first->>'id'=retry->>'id', 'Retry must reuse reservation';
  assert first->>'path' ~ '^b6666666-6666-4666-8666-666666666666/[0-9a-f-]+\.webp$', 'Path must be database controlled';
  perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report',gen_random_uuid());
  perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report',gen_random_uuid());
  begin perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report',gen_random_uuid()); raise exception 'Fourth photo accepted'; exception when check_violation then null; end;
  begin perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','resolution',gen_random_uuid()); raise exception 'Resident resolution accepted'; exception when insufficient_privilege then null; end;
  assert not has_function_privilege(current_user,'public.finalize_evidence(uuid,uuid)','EXECUTE'), 'Resident must not bypass content validation';
  assert not has_function_privilege(current_user,'public.cancel_evidence(uuid,uuid)','EXECUTE'), 'Cancellation is a trusted compensation operation';
end $$;
select set_config('request.jwt.claim.sub','a7777777-7777-4777-8777-777777777777',true);
do $$ begin
  begin perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report',gen_random_uuid()); raise exception 'Other owner uploaded'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare item public.report_photos%rowtype; retry jsonb; cancelled_time timestamptz; begin
  select * into item from public.report_photos where report_id='b6666666-6666-4666-8666-666666666666' and upload_state='pending' limit 1;
  perform public.cancel_evidence(item.id,item.uploaded_by);
  select cancelled_at into cancelled_time from public.report_photos where id=item.id;
  assert cancelled_time is not null, 'Cancellation must start its own cleanup grace period';
  perform public.cancel_evidence(item.id,item.uploaded_by);
  assert (select cancelled_at=cancelled_time from public.report_photos where id=item.id), 'Repeated cancellation must not extend the grace period';
  perform set_config('request.jwt.claim.sub',item.uploaded_by::text,true);
  retry:=public.reserve_evidence(item.report_id,'report',item.request_key);
  assert retry->>'id'<>item.id::text, 'Retry of cancelled upload must use a fresh object path';
  assert (select upload_state='cancelled' and request_key is null from public.report_photos where id=item.id), 'Old object path must remain tracked until cleanup';
end $$;
-- Storage files are synthetic fixtures; no actual hosted image uploads in this SQL test.
insert into storage.objects(bucket_id,name) select 'report-photos',storage_path from public.report_photos where report_id='b6666666-6666-4666-8666-666666666666';
select public.finalize_evidence(id,uploaded_by) from public.report_photos where request_key='c6666666-6666-4666-8666-666666666666';
set local role authenticated;
select set_config('request.jwt.claim.sub','a6666666-6666-4666-8666-666666666666',true);
do $$ begin assert (select count(*)=1 from storage.objects), 'Only ready evidence can be signed/read'; end $$;
select set_config('request.jwt.claim.sub','a7777777-7777-4777-8777-777777777777',true);
do $$ begin assert (select count(*)=0 from storage.objects), 'Other residents cannot access private files'; end $$;
select set_config('request.jwt.claim.sub','a8888888-8888-4888-8888-888888888888',true);
do $$ begin
  assert (select count(*)=1 from storage.objects), 'Admin views ready evidence only';
  perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','resolution',gen_random_uuid());
  perform public.transition_report('b6666666-6666-4666-8666-666666666666','in_progress','Fictional acceptance.',0);
  perform public.transition_report('b6666666-6666-4666-8666-666666666666','resolved','Fictional resolution.',1);
end $$;
select set_config('request.jwt.claim.sub','a6666666-6666-4666-8666-666666666666',true);
do $$ begin
  begin perform public.reserve_evidence('b6666666-6666-4666-8666-666666666666','report',gen_random_uuid()); raise exception 'Resident uploaded to closed report'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare item public.report_photos%rowtype; state text; begin
  select * into item from public.report_photos where report_id='b6666666-6666-4666-8666-666666666666' and photo_type='report' and upload_state='pending' limit 1;
  state:=public.cancel_evidence(item.id,item.uploaded_by); assert state='cancelled', 'Compensation cancels pending item';
  begin perform public.finalize_evidence(item.id,item.uploaded_by); raise exception 'Cancelled item became visible'; exception when sqlstate 'PT409' then null; end;
end $$;
rollback;
