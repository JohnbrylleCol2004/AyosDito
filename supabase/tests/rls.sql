-- Run as postgres in a test Supabase project after the migration.
-- All fictional fixtures are rolled back. A failed assertion aborts the transaction.
begin;
insert into auth.users (id, raw_user_meta_data) values
('a1111111-1111-4111-8111-111111111111', '{"full_name":"Resident One","role":"admin"}'),
('a2222222-2222-4222-8222-222222222222', '{"full_name":"Resident Two"}'),
('a3333333-3333-4333-8333-333333333333', '{"full_name":"Admin"}');
do $$ begin
  assert (select role = 'resident' from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'), 'User metadata must not grant admin';
  assert (select count(*) = 5 from pg_tables where schemaname='public' and tablename in ('profiles','reports','report_updates','report_confirmations','report_photos') and rowsecurity), 'All five tables require RLS';
  assert (select not public from storage.buckets where id='report-photos'), 'Photo bucket must be private';
end $$;
update public.profiles set role='admin' where id='a3333333-3333-4333-8333-333333333333';
insert into public.reports(id,reporter_id,title,description,category,zone) values
('b1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','Broken light','Fictional broken streetlight','streetlight','Demo'),
('b2222222-2222-4222-8222-222222222222','a2222222-2222-4222-8222-222222222222','Damaged road','Fictional damaged road segment','road','Demo');
insert into public.report_updates(report_id,admin_id,old_status,new_status,note)
select id,'a3333333-3333-4333-8333-333333333333','pending_review','in_progress','Fictional progress note' from public.reports where id in ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222');
insert into public.report_photos(report_id,uploaded_by,storage_path,photo_type)
select id,reporter_id,'test/' || id || '.jpg','report' from public.reports where id in ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222');
insert into public.report_confirmations(report_id,user_id) values
('b1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111'),
('b1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222');
do $$ begin
  begin
    insert into public.report_confirmations(report_id,user_id) values ('b1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111');
    raise exception 'Duplicate confirmation was accepted';
  exception when unique_violation then null; end;
  assert (select count(distinct tracking_no)=2 from public.reports where id in ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222')), 'Tracking numbers must be unique';
  assert (select bool_and(tracking_no ~ '^AY-[0-9]{6,}$' and tracking_no not like 'AY-0000000%') from public.reports where id in ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222')), 'Tracking numbers start at six digits and grow as needed';
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
  assert not public.is_admin(), 'Resident must not be admin';
  assert (select count(*)=1 from public.profiles), 'Resident sees only their profile';
  assert (select count(*)=1 from public.reports), 'Resident sees only their reports';
  assert (select count(*)=1 from public.report_updates), 'Private updates must follow report visibility';
  assert (select count(*)=1 from public.report_photos), 'Private photos must follow report visibility';
  assert (select count(*)=1 from public.report_confirmations), 'Other confirming residents must remain private';
  assert not has_sequence_privilege(current_user,'public.report_tracking_seq','USAGE'), 'Client cannot allocate tracking numbers';
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'Resident promoted themselves';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.reports (reporter_id,title,description,category,zone) values (auth.uid(),'Blocked report','Must remain blocked in Phase 1','other','Demo');
    raise exception 'Phase 1 report writes must be blocked';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a3333333-3333-4333-8333-333333333333',true);
do $$ begin
  assert public.is_admin(), 'Database-assigned admin must be recognized';
  assert (select count(*) >= 3 from public.profiles), 'Admin must read profiles';
  assert (select count(*)=2 from public.reports where id in ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222')), 'Admin must see both residents reports';
  assert not has_table_privilege(current_user,'public.profiles','UPDATE'), 'Admin browser cannot edit roles';
  assert not has_table_privilege(current_user,'public.reports','UPDATE'), 'Report management is deferred';
end $$;

reset role;
set local role anon;
do $$ begin
  assert not has_table_privilege(current_user,'public.profiles','SELECT'), 'Anon must not read profiles';
  assert not has_table_privilege(current_user,'public.reports','SELECT'), 'Anon must not read reports';
end $$;
reset role;
rollback;
