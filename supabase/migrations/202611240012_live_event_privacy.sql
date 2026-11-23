begin;
-- Also harden installations that applied an earlier011 during rollout.
create or replace function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; previous_owner uuid;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and approval_status='approved') then raise exception 'Approved account required' using errcode='42501'; end if;
 if p_endpoint is null or p_endpoint !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|([a-z0-9-]+\.)+notify\.windows\.com)/[^#[:space:]]+$' or char_length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'Invalid push subscription' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_endpoint,0));
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.push_subscriptions where user_id=auth.uid() and endpoint<>p_endpoint)>=10 then raise exception 'Device limit reached' using errcode='23514'; end if;
 select user_id into previous_owner from public.push_subscriptions where endpoint=p_endpoint for update;
 if previous_owner is not null and previous_owner<>auth.uid() then
  -- Rotate the ID and delete old queues on shared-device account changes.
  -- Delayed payloads for the prior ID then fail the worker's session check.
  delete from public.push_subscriptions where endpoint=p_endpoint;
 end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth returning id into result;
 return result;
end $$;
create function public.registration_ready() returns boolean language sql stable security definer set search_path='' as $$ select true; $$;
revoke all on function public.registration_ready() from public;
grant execute on function public.registration_ready() to anon,authenticated;
create table public.live_events (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null unique references public.profiles(id) on delete cascade,
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.live_events enable row level security;
alter table public.live_events replica identity default;
revoke all on public.live_events from public,anon,authenticated;
grant select on public.live_events to authenticated;
create policy live_own on public.live_events for select to authenticated using(recipient_id=(select auth.uid()));
create function public.invalidate_live_views() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=to_jsonb(new); target uuid;
begin
 if tg_table_name='profiles' then target:=(row_data->>'id')::uuid;
 elsif tg_table_name='reports' then target:=(row_data->>'reporter_id')::uuid;
 elsif tg_table_name='notifications' then target:=(row_data->>'recipient_id')::uuid;
 else select reporter_id into target from public.reports where id=(row_data->>'report_id')::uuid;
 end if;
 insert into public.live_events(recipient_id)
 select id from (select target as id union select id from public.profiles where role='admin' and approval_status='approved') recipients where id is not null order by id
 on conflict(recipient_id) do update set version=public.live_events.version+1,updated_at=clock_timestamp();
 return new;
end $$;
revoke all on function public.invalidate_live_views() from public,anon,authenticated;
do $$ declare tab text; begin
 foreach tab in array array['profiles','reports','notifications','report_workflows','report_reopen_requests','report_photos'] loop
  execute format('create trigger invalidate_live_views after insert or update on public.%I for each row execute function public.invalidate_live_views()',tab);
 end loop;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  -- DELETE events bypass row security on the realtime provider. Publish only
  -- generic invalidations; never publish account/report IDs or old row bodies.
  foreach tab in array array['profiles','reports','notifications','report_workflows','report_reopen_requests','report_photos'] loop
   if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab) then execute format('alter publication supabase_realtime drop table public.%I',tab); end if;
  end loop;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_events') then alter publication supabase_realtime add table public.live_events; end if;
 end if;
end $$;
commit;
