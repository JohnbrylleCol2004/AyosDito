-- Phase 3 compatibility: retain historical content during status-only changes.
begin;
-- The NOT VALID check was still rechecked on every UPDATE, including status-only
-- reviews of legitimate Phase 1 rows. Replace it with equivalent validation on
-- INSERT/content edits; original Phase 1 checks and foreign keys stay intact.
create function public.enforce_report_content_lengths() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.title is not distinct from old.title and
       new.description is not distinct from old.description and
       new.zone is not distinct from old.zone and
       new.location_details is not distinct from old.location_details then
      return new;
    end if;
  end if;
  if new.title is null or char_length(new.title) not between 5 and 120 or
     char_length(public.trim_report_text(new.title)) < 5 or
     new.description is null or char_length(new.description) not between 20 and 2000 or
     char_length(public.trim_report_text(new.description)) < 20 or
     new.zone is null or char_length(new.zone) not between 1 and 80 or
     char_length(public.trim_report_text(new.zone)) < 1 or
     char_length(coalesce(new.location_details,'')) > 200 then
    raise exception 'Invalid report content lengths' using errcode='23514', constraint='reports_phase2_lengths';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_report_content_lengths() from public, anon, authenticated;
create trigger enforce_report_content_lengths before insert or update on public.reports
for each row execute function public.enforce_report_content_lengths();
alter table public.reports drop constraint reports_phase2_lengths;
commit;
