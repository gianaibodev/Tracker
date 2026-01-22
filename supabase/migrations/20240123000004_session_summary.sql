create or replace function public.get_session_summary(p_session_id uuid)
returns table (
  total_duration_minutes numeric,
  total_break_minutes numeric,
  clean_work_minutes numeric,
  break_counts jsonb
) as $$
begin
  return query
  with session_info as (
    select 
      id,
      clock_in_at,
      coalesce(clock_out_at, now()) as clock_out_at
    from public.work_sessions
    where id = p_session_id
  ),
  break_summary as (
    select 
      session_id,
      sum(extract(epoch from (coalesce(end_at, now()) - start_at)) / 60) as total_break_duration,
      jsonb_object_agg(break_type, break_count) as counts
    from (
      select 
        session_id, 
        break_type, 
        count(*) as break_count
      from public.break_entries
      where session_id = p_session_id
      group by session_id, break_type
    ) bc
    group by session_id
  )
  select 
    (extract(epoch from (s.clock_out_at - s.clock_in_at)) / 60)::numeric as total_duration_minutes,
    coalesce(b.total_break_duration, 0)::numeric as total_break_minutes,
    ((extract(epoch from (s.clock_out_at - s.clock_in_at)) / 60) - coalesce(b.total_break_duration, 0))::numeric as clean_work_minutes,
    coalesce(b.counts, '{}'::jsonb) as break_counts
  from session_info s
  left join break_summary b on s.id = b.session_id;
end;
$$ language plpgsql stable security definer;
