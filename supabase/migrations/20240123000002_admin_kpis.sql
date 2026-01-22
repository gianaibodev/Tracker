create or replace function public.get_admin_kpis()
returns table (
  total_calls bigint,
  total_deposits_count bigint,
  total_deposits_amount numeric,
  active_sessions bigint,
  on_break_count bigint
) as $$
declare
  v_today date;
  v_settings record;
begin
  select * into v_settings from public.org_settings limit 1;
  v_today := (now() at time zone v_settings.timezone)::date;

  return query
  select 
    (select count(*) from public.call_entries where occurred_at::date = v_today),
    (select count(*) from public.deposit_entries where occurred_at::date = v_today),
    (select coalesce(sum(amount), 0) from public.deposit_entries where occurred_at::date = v_today),
    (select count(*) from public.work_sessions where session_status = 'open'),
    (select count(*) from public.break_entries where end_at is null)
  ;
end;
$$ language plpgsql stable security definer;
