-- Run in a TEST project as postgres after all three migrations. Fixtures roll back.
begin;
insert into auth.users (id, raw_user_meta_data) values
('c1111111-1111-4111-8111-111111111111','{"full_name":"Phase2 Resident One"}'),
('c2222222-2222-4222-8222-222222222222','{"full_name":"Phase2 Resident Two"}'),
('c3333333-3333-4333-8333-333333333333','{"full_name":"Phase2 Admin"}');
update public.profiles set role='admin' where id='c3333333-3333-4333-8333-333333333333';
set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
do $$ declare first_id uuid; retry_id uuid; begin
  begin
    perform public.create_report(repeat(chr(160),5),'other',repeat(chr(160),20),chr(160),null,gen_random_uuid());
    raise exception 'Unicode whitespace-only fields were accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_report(repeat(chr(65279),5),'other',repeat(chr(65279),20),chr(65279),null,gen_random_uuid());
    raise exception 'BOM-only fields were accepted';
  exception when invalid_parameter_value then null; end;
  first_id := public.create_report('Broken light','streetlight','Fictional light is broken near the park.','Demo',null,'d1111111-1111-4111-8111-111111111111');
  retry_id := public.create_report('Broken light','streetlight','Fictional light is broken near the park.','Demo','','d1111111-1111-4111-8111-111111111111');
  assert first_id=retry_id, 'Retries must return the original report';
  assert (select count(*)=1 from public.reports), 'Retries must not duplicate rows';
  assert (select count(*)=1 from public.search_my_reports('Broken light')), 'Search finds own title';
  assert (select count(*)=0 from public.search_my_reports('%')), 'Percent is literal, not a wildcard';
  assert (select count(*)=0 from public.search_my_reports('),reporter_id.neq.secret')), 'Search cannot inject a filter';
  assert (select reporter_id=auth.uid() and status='pending_review' and tracking_no ~ '^AY-[0-9]{6,}$' and created_at=updated_at from public.reports where id=first_id), 'Trusted fields must be server owned';
  begin
    perform public.create_report('Different payload','road','Fictional light is broken near the park.','Demo',null,'d1111111-1111-4111-8111-111111111111');
    raise exception 'Changed payload reused a token';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_report('tiny','road','Too short','Demo',null,gen_random_uuid());
    raise exception 'Invalid fields were accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_report('Broken light','forged','A sufficiently long fictional report.','Demo',null,gen_random_uuid());
    raise exception 'Forged category was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_report('Broken light','other','A sufficiently long fictional report.',E'\t\n',null,gen_random_uuid());
    raise exception 'Blank zone was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    update public.reports set status='resolved' where id=first_id;
    raise exception 'Resident changed report status';
  exception when insufficient_privilege then null; end;
  assert not has_table_privilege(current_user,'public.reports','INSERT'), 'Raw INSERT must remain forbidden';
  assert not has_table_privilege(current_user,'public.reports','DELETE'), 'Raw DELETE must remain forbidden';
  assert not has_sequence_privilege(current_user,'public.report_tracking_seq','USAGE'), 'Residents cannot choose tracking numbers';
end $$;
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
do $$ begin
  assert (select count(*)=0 from public.reports), 'Another resident must not see private reports';
  assert (select count(*)=0 from public.search_my_reports('Broken light')), 'Search must not expose another owner';
  perform public.create_report('Damaged road','road','A fictional damaged road needs repair.','Demo',null,'d1111111-1111-4111-8111-111111111111');
  assert (select count(*)=1 from public.reports), 'Submission keys are scoped per resident';
end $$;
select set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
do $$ begin
  assert (select count(*)=2 from public.reports where reporter_id in ('c1111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222')), 'Admin reads both reports';
  assert (select count(distinct tracking_no)=2 from public.reports where reporter_id in ('c1111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222')), 'Tracking numbers are unique';
  begin
    perform public.create_report('Admin report','other','A fictional administrator submission.','Demo',null,gen_random_uuid());
    raise exception 'Admin used resident creation function';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform public.create_report('No identity','other','A fictional unauthenticated submission.','Demo',null,gen_random_uuid());
    raise exception 'Missing identity was accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare test_id uuid; begin
  -- Test literal punctuation without affecting the fixture row counts above.
  update public.reports set title='Broken light (park) %_.' where reporter_id='c1111111-1111-4111-8111-111111111111';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
do $$ declare test_id uuid; begin
  assert (select count(*)=1 from public.search_my_reports('Broken light (park) %_.')), 'Exact punctuation title must match';
  begin
    test_id := public.create_report(chr(160)||repeat('x',120)||chr(65279),'other',chr(160)||repeat('x',2000)||chr(65279),chr(160)||'Demo'||chr(65279),chr(160)||repeat('x',200)||chr(65279),gen_random_uuid());
    assert (select char_length(title)=120 and char_length(description)=2000 and char_length(location_details)=200 and zone='Demo' from public.reports where id=test_id), 'Unicode padding must trim like JavaScript';
    raise no_data_found; -- Roll back this test row while retaining the assertions.
  exception when no_data_found then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  assert not has_function_privilege(current_user,'public.create_report(text,text,text,text,text,uuid)','EXECUTE'), 'Anonymous users cannot call RPC';
  assert not has_function_privilege(current_user,'public.search_my_reports(text)','EXECUTE'), 'Anonymous users cannot search reports';
end $$;
reset role;
rollback;
