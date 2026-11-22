-- Phase 4 grouped analytics. Apply after migrations 006 and 007.
begin;
create function public.admin_community_analytics() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator authentication required' using errcode='42501'; end if;
  with zone_counts as (
    select zone,count(*) as count from public.reports group by zone order by count(*) desc,zone limit 12
  ), months as (
    select generate_series(date_trunc('month',now() at time zone 'Asia/Manila')-interval '11 months',date_trunc('month',now() at time zone 'Asia/Manila'),interval '1 month') as month
  ), monthly_counts as (
    select date_trunc('month',created_at at time zone 'Asia/Manila') as month,count(*) as count from public.reports
    where created_at>=((date_trunc('month',now() at time zone 'Asia/Manila')-interval '11 months') at time zone 'Asia/Manila')
    group by 1
  ), resolutions as (
    select r.id,extract(epoch from (min(u.created_at)-r.created_at))/3600.0 as hours
    from public.reports r join public.report_updates u on u.report_id=r.id and u.new_status='resolved'
    where r.status='resolved' group by r.id,r.created_at having min(u.created_at)>=r.created_at
  ) select jsonb_build_object(
    'zones',(select coalesce(jsonb_agg(jsonb_build_object('zone',zone,'count',count) order by count desc,zone),'[]'::jsonb) from zone_counts),
    'months',(select jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),'count',coalesce(c.count,0)) order by m.month) from months m left join monthly_counts c using(month)),
    'resolution_samples',(select count(*) from resolutions),
    'average_resolution_hours',(select case when count(*)>=3 then round(avg(hours),2) else null end from resolutions)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_community_analytics() from public,anon,authenticated;
grant execute on function public.admin_community_analytics() to authenticated;
commit;
