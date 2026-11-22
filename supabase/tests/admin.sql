-- Test project only, run as postgres after all migrations. Fixtures roll back.
begin;
insert into auth.users(id,raw_user_meta_data) values
('e1111111-1111-4111-8111-111111111111','{"full_name":"Admin Test Resident"}'),
('e2222222-2222-4222-8222-222222222222','{"full_name":"Admin Test Official"}'),
('e3333333-3333-4333-8333-333333333333','{"full_name":"Another Resident"}');
update public.profiles set role='admin' where id='e2222222-2222-4222-8222-222222222222';
insert into public.reports(id,reporter_id,title,description,category,zone) values
('f1111111-1111-4111-8111-111111111111','e1111111-1111-4111-8111-111111111111','Fictional light','Fictional light for lifecycle testing.','streetlight','Demo'),
('f2222222-2222-4222-8222-222222222222','e1111111-1111-4111-8111-111111111111','Fictional rejection','Fictional light for rejection testing.','streetlight','Demo'),
('f3333333-3333-4333-8333-333333333333','e1111111-1111-4111-8111-111111111111','Fictional rollback','Fictional light for rollback testing.','streetlight','Demo');
set local role authenticated;
select set_config('request.jwt.claim.sub','e1111111-1111-4111-8111-111111111111',true);
do $$ begin
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','in_progress','Forged admin attempt',0);
    raise exception 'Resident performed an admin transition';
  exception when insufficient_privilege then null; end;
  assert (select count(*)=0 from public.search_admin_reports('')), 'Resident must not access admin search';
  begin
    perform public.admin_report_stats(); raise exception 'Resident accessed admin statistics';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','e2222222-2222-4222-8222-222222222222',true);
do $$ declare audit_id uuid; begin
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','resolved','Invalid direct resolution',0);
    raise exception 'Pending report was resolved directly';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','in_progress',chr(160)||chr(65279),0);
    raise exception 'Blank Unicode note was accepted';
  exception when invalid_parameter_value then null; end;
  audit_id := public.transition_report('f1111111-1111-4111-8111-111111111111','in_progress','Accepted for fictional repair.',0);
  assert (select count(*)=1 from public.report_updates where report_id='f1111111-1111-4111-8111-111111111111'), 'One transition must create one audit';
  assert (select u.admin_id=auth.uid() and u.old_status='pending_review' and u.new_status='in_progress' and u.created_at=r.updated_at and r.status_version=1 from public.report_updates u join public.reports r on r.id=u.report_id where u.id=audit_id), 'Audit identity, statuses and timestamp must be database owned';
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','resolved','Stale conflicting review',0);
    raise exception 'Stale version was accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','in_progress','Same status attempt',1);
    raise exception 'Same status was accepted';
  exception when invalid_parameter_value then null; end;
  perform public.transition_report('f1111111-1111-4111-8111-111111111111','resolved','Completed fictional repair.',1);
  begin
    perform public.transition_report('f1111111-1111-4111-8111-111111111111','rejected','Terminal state modification',2);
    raise exception 'Resolved report was modified';
  exception when invalid_parameter_value then null; end;
  perform public.transition_report('f2222222-2222-4222-8222-222222222222','rejected','Fictional duplicate issue.',0);
  begin
    perform public.transition_report('f2222222-2222-4222-8222-222222222222','in_progress','Reopening rejected report',1);
    raise exception 'Rejected report was reopened';
  exception when invalid_parameter_value then null; end;
  assert not has_table_privilege(current_user,'public.report_updates','UPDATE'), 'Audit edits must be forbidden';
  assert not has_table_privilege(current_user,'public.report_updates','DELETE'), 'Audit deletion must be forbidden';
  assert not has_table_privilege(current_user,'public.reports','UPDATE'), 'Direct status changes must be forbidden';
end $$;
reset role;
create function public.admin_test_fail_audit() returns trigger language plpgsql as $$ begin
  if new.report_id='f3333333-3333-4333-8333-333333333333' then raise check_violation; end if;
  return new;
end $$;
create trigger admin_test_fail_audit before insert on public.report_updates for each row execute function public.admin_test_fail_audit();
set local role authenticated;
do $$ begin
  begin
    perform public.transition_report('f3333333-3333-4333-8333-333333333333','in_progress','This audit insert must fail.',0);
    raise exception 'Forced audit failure did not occur';
  exception when check_violation then null; end;
  assert (select status='pending_review' and status_version=0 from public.reports where id='f3333333-3333-4333-8333-333333333333'), 'Failed audit must roll back status and version';
  assert (select count(*)=0 from public.report_updates where report_id='f3333333-3333-4333-8333-333333333333'), 'Failed audit must not leave history';
  assert (public.admin_report_stats()->>'resolved')::bigint >= 1, 'Admin statistics must read actual resolved rows';
end $$;
select set_config('request.jwt.claim.sub','e1111111-1111-4111-8111-111111111111',true);
do $$ begin
  assert (select count(*)=3 from public.report_updates), 'Owner sees official updates';
end $$;
select set_config('request.jwt.claim.sub','e3333333-3333-4333-8333-333333333333',true);
do $$ begin
  assert (select count(*)=0 from public.report_updates), 'Other residents must not see private updates';
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform public.transition_report('f3333333-3333-4333-8333-333333333333','in_progress','No authenticated identity.',0);
    raise exception 'Missing identity accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  assert not has_function_privilege(current_user,'public.transition_report(uuid,text,text,bigint)','EXECUTE'), 'Anonymous transition call must be forbidden';
end $$;
reset role;
rollback;
