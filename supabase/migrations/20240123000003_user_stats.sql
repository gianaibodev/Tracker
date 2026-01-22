create or replace function public.get_user_stats(
  p_user_id uuid,
  p_start_date timestamp with time zone default null,
  p_end_date timestamp with time zone default null
)
returns table (
  total_calls bigint,
  total_deposits_count bigint,
  total_deposits_amount numeric,
  total_break_minutes numeric,
  total_sessions bigint
) as $$
declare
  v_start timestamp with time zone;
  v_end timestamp with time zone;
  v_settings record;
begin
  select * into v_settings from public.org_settings limit 1;
  
  if p_start_date is null then
    v_start := date_trunc('day', now() at time zone v_settings.timezone);
  else
    v_start := p_start_date;
  end if;

  if p_end_date is null then
    v_end := now() at time zone v_settings.timezone;
  else
    v_end := p_end_date;
  end if;

  return query
  select 
    (select count(*) from public.call_entries where user_id = p_user_id and occurred_at >= v_start and occurred_at <= v_end),
    (select count(*) from public.deposit_entries where user_id = p_user_id and occurred_at >= v_start and occurred_at <= v_end),
    (select coalesce(sum(amount), 0) from public.deposit_entries where user_id = p_user_id and occurred_at >= v_start and occurred_at <= v_end),
    (select coalesce(sum(extract(epoch from (coalesce(be.end_at, now()) - be.start_at)) / 60), 0) 
     from public.break_entries be 
     join public.work_sessions ws on be.session_id = ws.id 
     where ws.user_id = p_user_id and be.start_at >= v_start and be.start_at <= v_end),
    (select count(*) from public.work_sessions where user_id = p_user_id and clock_in_at >= v_start and clock_in_at <= v_end)
  ;
end;
$$ language plpgsql stable security definer;
