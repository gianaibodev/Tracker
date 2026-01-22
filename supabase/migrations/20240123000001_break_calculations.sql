create or replace function public.get_current_window_range(
  p_user_id uuid,
  out window_start timestamp with time zone,
  out window_end timestamp with time zone
)
as $$
declare
  v_settings record;
  v_now timestamp with time zone;
  v_anchor_weekday integer;
  v_anchor_cutoffs integer[];
  v_anchor_days integer;
begin
  select * into v_settings from public.org_settings limit 1;
  v_now := now() at time zone v_settings.timezone;
  window_end := v_now;

  if v_settings.break_reset_mode = 'daily' then
    window_start := date_trunc('day', v_now);
  
  elsif v_settings.break_reset_mode = 'weekly_fixed' then
    v_anchor_weekday := (v_settings.break_reset_anchor->>'weekday')::integer;
    -- weekday: 0 is Sunday, 1 is Monday...
    window_start := date_trunc('day', v_now) - ((extract(dow from v_now)::integer - v_anchor_weekday + 7) % 7 || ' days')::interval;

  elsif v_settings.break_reset_mode = 'pay_period' then
    v_anchor_cutoffs := array(select jsonb_array_elements_text(v_settings.break_reset_anchor->'cutoffs')::integer);
    -- Simplification: find the largest cutoff <= current day
    declare
      v_day integer := extract(day from v_now)::integer;
      v_cutoff integer;
      v_max_cutoff_less_than_now integer := -1;
    begin
      foreach v_cutoff in array v_anchor_cutoffs loop
        if v_cutoff <= v_day and v_cutoff > v_max_cutoff_less_than_now then
          v_max_cutoff_less_than_now := v_cutoff;
        end if;
      end loop;

      if v_max_cutoff_less_than_now = -1 then
        -- Last month's largest cutoff
        window_start := date_trunc('month', v_now - interval '1 month') + (max(v_cutoff) || ' days')::interval from unnest(v_anchor_cutoffs) as v_cutoff;
      else
        window_start := date_trunc('month', v_now) + ((v_max_cutoff_less_than_now - 1) || ' days')::interval;
      end if;
    end;

  elsif v_settings.break_reset_mode = 'rolling' then
    v_anchor_days := (v_settings.break_reset_anchor->>'days')::integer;
    window_start := v_now - (v_anchor_days || ' days')::interval;
  
  else
    window_start := date_trunc('day', v_now);
  end if;
end;
$$ language plpgsql stable security definer;

create or replace function public.get_remaining_allowances(p_user_id uuid)
returns table (
  break_type text,
  max_count integer,
  max_minutes integer,
  used_count bigint,
  used_minutes numeric,
  remaining_count bigint,
  remaining_minutes numeric
) as $$
declare
  v_start timestamp with time zone;
  v_end timestamp with time zone;
begin
  select window_start, window_end into v_start, v_end from public.get_current_window_range(p_user_id);

  return query
  with usage as (
    select 
      be.break_type,
      count(*) as used_count,
      sum(extract(epoch from (coalesce(be.end_at, now()) - be.start_at)) / 60) as used_minutes
    from public.break_entries be
    join public.work_sessions ws on be.session_id = ws.id
    where ws.user_id = p_user_id
    and be.start_at >= v_start
    and be.start_at <= v_end
    group by be.break_type
  )
  select 
    ba.break_type,
    ba.max_count,
    ba.max_minutes,
    coalesce(u.used_count, 0) as used_count,
    coalesce(u.used_minutes, 0) as used_minutes,
    (ba.max_count - coalesce(u.used_count, 0))::bigint as remaining_count,
    (ba.max_minutes - coalesce(u.used_minutes, 0))::numeric as remaining_minutes
  from public.break_allowances ba
  left join usage u on ba.break_type = u.break_type
  where ba.is_enabled = true;
end;
$$ language plpgsql stable security definer;
