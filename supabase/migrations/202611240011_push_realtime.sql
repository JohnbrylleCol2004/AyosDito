begin;
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(char_length(endpoint) <= 2048), p256dh text not null, auth text not null,
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public,anon,authenticated;
grant select on public.push_subscriptions to authenticated;
create policy push_own on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns uuid
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
create function public.remove_push_subscription(p_endpoint text) returns void
language sql security definer set search_path='' as $$ delete from public.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint; $$;
create function public.owns_push_subscription(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$ select exists(select 1 from public.push_subscriptions s join public.profiles p on p.id=s.user_id where s.id=p_id and p.id=auth.uid() and p.approval_status='approved'); $$;
revoke all on function public.save_push_subscription(text,text,text),public.remove_push_subscription(text),public.owns_push_subscription(uuid) from public,anon;
grant execute on function public.save_push_subscription(text,text,text),public.remove_push_subscription(text),public.owns_push_subscription(uuid) to authenticated;

create table public.push_deliveries (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','processing','sent','failed')),
 attempts int not null default 0, available_at timestamptz not null default now(), lease uuid,
 unique(notification_id,subscription_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public,anon,authenticated;
create function public.enqueue_push_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.push_deliveries(notification_id,subscription_id) select new.id,s.id from public.push_subscriptions s where s.user_id=new.recipient_id on conflict do nothing;
 return new;
end $$;
revoke all on function public.enqueue_push_notification() from public,anon,authenticated;
create trigger queue_notification_push after insert on public.notifications for each row execute function public.enqueue_push_notification();
create function public.claim_push_deliveries(p_limit int default 10) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with eligible as (select d.id from public.push_deliveries d join public.push_subscriptions s on s.id=d.subscription_id join public.profiles p on p.id=s.user_id where p.approval_status='approved' and d.state in ('pending','processing') and d.attempts<5 and d.available_at<=now() order by d.available_at for update of d skip locked limit least(greatest(p_limit,1),10)),
 claimed as (update public.push_deliveries d set state='processing',attempts=attempts+1,lease=gen_random_uuid(),available_at=now()+interval '2 minutes' from eligible e where d.id=e.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'lease',d.lease,'subscription_id',s.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))),'[]'::jsonb) into result from claimed d join public.push_subscriptions s on s.id=d.subscription_id;
 return result;
end $$;
create function public.complete_push_delivery(p_id uuid,p_lease uuid,p_success boolean,p_expired boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare subscription uuid;
begin
 update public.push_deliveries set state=case when p_success then 'sent' when attempts>=5 then 'failed' else 'pending' end,available_at=now()+interval '5 minutes',lease=null where id=p_id and lease=p_lease and state='processing' returning subscription_id into subscription;
 if p_expired and subscription is not null then delete from public.push_subscriptions where id=subscription; end if;
end $$;
revoke all on function public.claim_push_deliveries(int),public.complete_push_delivery(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(int),public.complete_push_delivery(uuid,uuid,boolean,boolean) to service_role;

-- Realtime uses content-free invalidations from migration012, never private rows.
commit;
