-- Disposable local test only: fixture was inserted before Phase 2 migrations.
begin;
insert into auth.users(id) values ('e5555555-5555-4555-8555-555555555555');
update public.profiles set role='admin' where id='e5555555-5555-4555-8555-555555555555';
set local role authenticated;
select set_config('request.jwt.claim.sub','e5555555-5555-4555-8555-555555555555',true);
select public.transition_report('f4444444-4444-4444-8444-444444444444','in_progress','Accept a preserved historical report.',0);
do $$ begin
  assert (select status='in_progress' and char_length(title)=130 and char_length(description)=10 and char_length(location_details)=220 from public.reports where id='f4444444-4444-4444-8444-444444444444'), 'Historical content must be preserved during review';
  assert (select count(*)=1 from public.report_updates where report_id='f4444444-4444-4444-8444-444444444444'), 'Historical transition must still create an audit';
end $$;
reset role;
do $$ begin
  begin
    insert into public.reports(reporter_id,title,description,category,zone) values ('e4444444-4444-4444-8444-444444444444',repeat('x',130),'New content must satisfy the tightened bounds.','other','Demo');
    raise exception 'New invalid content bypassed validation';
  exception when check_violation then null; end;
  begin
    update public.reports set title=repeat('x',140) where id='f4444444-4444-4444-8444-444444444444';
    raise exception 'Invalid content edit bypassed validation';
  exception when check_violation then null; end;
end $$;
rollback;
