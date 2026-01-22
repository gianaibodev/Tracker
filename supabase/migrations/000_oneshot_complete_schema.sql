-- ============================================================================
-- BPO CSR Tracker - Complete Database Schema (One-Shot Setup)
-- ============================================================================
-- This file contains the complete database schema in one shot.
-- Run this on a fresh database to set up everything at once.
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  username text unique,
  role text check (role in ('admin', 'csr')) default 'csr',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Organization settings
create table if not exists public.org_settings (
  id uuid primary key default uuid_generate_v4(),
  timezone text default 'Asia/Manila',
  break_reset_mode text check (break_reset_mode in ('daily', 'weekly_fixed', 'pay_period', 'rolling')) default 'daily',
  break_reset_anchor jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Break allowances configuration
create table if not exists public.break_allowances (
  id uuid primary key default uuid_generate_v4(),
  break_type text not null,
  max_count integer default 0,
  max_minutes integer default 0,
  is_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Call status options
create table if not exists public.call_status_options (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  label text not null,
  sort_order integer default 0,
  is_enabled boolean default true
);

-- Call outcome options
create table if not exists public.call_outcome_options (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  label text not null,
  sort_order integer default 0,
  is_enabled boolean default true
);

-- Work sessions
create table if not exists public.work_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  work_date date default current_date not null,
  clock_in_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clock_out_at timestamp with time zone,
  remarks text,
  session_status text check (session_status in ('open', 'closed')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Break entries
create table if not exists public.break_entries (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.work_sessions(id) on delete cascade not null,
  break_type text not null,
  start_at timestamp with time zone default timezone('utc'::text, now()) not null,
  end_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Call entries
create table if not exists public.call_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.work_sessions(id) on delete cascade not null,
  occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  call_status text not null,
  call_outcome text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Deposit entries
create table if not exists public.deposit_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.work_sessions(id) on delete cascade not null,
  occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  amount decimal(12,2) not null,
  currency text default 'USD',
  reference text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.org_settings enable row level security;
alter table public.break_allowances enable row level security;
alter table public.call_status_options enable row level security;
alter table public.call_outcome_options enable row level security;
alter table public.work_sessions enable row level security;
alter table public.break_entries enable row level security;
alter table public.call_entries enable row level security;
alter table public.deposit_entries enable row level security;

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Function to get current window range for break calculations
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
    window_start := date_trunc('day', v_now) - ((extract(dow from v_now)::integer - v_anchor_weekday + 7) % 7 || ' days')::interval;

  elsif v_settings.break_reset_mode = 'pay_period' then
    v_anchor_cutoffs := array(select jsonb_array_elements_text(v_settings.break_reset_anchor->'cutoffs')::integer);
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

-- Function to get remaining break allowances
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

-- Function to get admin KPIs
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

-- Function to get user stats
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

-- Function to get session summary
create or replace function public.get_session_summary(p_session_id uuid)
returns table (
  total_duration_minutes numeric,
  total_break_minutes numeric,
  clean_work_minutes numeric,
  break_counts jsonb,
  username text
) as $$
begin
  return query
  with session_info as (
    select 
      ws.id,
      ws.clock_in_at,
      coalesce(ws.clock_out_at, now()) as clock_out_at,
      p.username
    from public.work_sessions ws
    join public.profiles p on ws.user_id = p.id
    where ws.id = p_session_id
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
    coalesce(b.counts, '{}'::jsonb) as break_counts,
    s.username
  from session_info s
  left join break_summary b on s.id = b.session_id;
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Trigger function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'username', 
    coalesce(new.raw_user_meta_data->>'role', 'csr')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- Profiles
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile" on public.profiles
  for update using (public.is_admin());

-- Org Settings
drop policy if exists "Anyone can read org settings" on public.org_settings;
create policy "Anyone can read org settings" on public.org_settings
  for select using (true);
drop policy if exists "Admins can update org settings" on public.org_settings;
create policy "Admins can update org settings" on public.org_settings
  for all using (public.is_admin());

-- Break Allowances
drop policy if exists "Anyone can read break allowances" on public.break_allowances;
create policy "Anyone can read break allowances" on public.break_allowances
  for select using (true);
drop policy if exists "Admins can manage break allowances" on public.break_allowances;
create policy "Admins can manage break allowances" on public.break_allowances
  for all using (public.is_admin());

-- Call Status Options
drop policy if exists "Anyone can read call statuses" on public.call_status_options;
create policy "Anyone can read call statuses" on public.call_status_options
  for select using (true);
drop policy if exists "Admins can manage call statuses" on public.call_status_options;
create policy "Admins can manage call statuses" on public.call_status_options
  for all using (public.is_admin());

-- Call Outcome Options
drop policy if exists "Anyone can read call outcomes" on public.call_outcome_options;
create policy "Anyone can read call outcomes" on public.call_outcome_options
  for select using (true);
drop policy if exists "Admins can manage call outcomes" on public.call_outcome_options;
create policy "Admins can manage call outcomes" on public.call_outcome_options
  for all using (public.is_admin());

-- Work Sessions
drop policy if exists "Users can see own work sessions" on public.work_sessions;
create policy "Users can see own work sessions" on public.work_sessions
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own work sessions" on public.work_sessions;
create policy "Users can insert own work sessions" on public.work_sessions
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own open work sessions" on public.work_sessions;
create policy "Users can update own open work sessions" on public.work_sessions
  for update using (auth.uid() = user_id and session_status = 'open');
drop policy if exists "Admins can see all work sessions" on public.work_sessions;
create policy "Admins can see all work sessions" on public.work_sessions
  for select using (public.is_admin());

-- Break Entries
drop policy if exists "Users can manage own break entries" on public.break_entries;
create policy "Users can manage own break entries" on public.break_entries
  for all using (
    exists (
      select 1 from public.work_sessions
      where id = break_entries.session_id and user_id = auth.uid()
    )
  );
drop policy if exists "Admins can see all break entries" on public.break_entries;
create policy "Admins can see all break entries" on public.break_entries
  for select using (public.is_admin());

-- Call Entries
drop policy if exists "Users can manage own call entries" on public.call_entries;
create policy "Users can manage own call entries" on public.call_entries
  for all using (user_id = auth.uid());
drop policy if exists "Admins can see all call entries" on public.call_entries;
create policy "Admins can see all call entries" on public.call_entries
  for select using (public.is_admin());

-- Deposit Entries
drop policy if exists "Users can manage own deposit entries" on public.deposit_entries;
create policy "Users can manage own deposit entries" on public.deposit_entries
  for all using (user_id = auth.uid());
drop policy if exists "Admins can see all deposit entries" on public.deposit_entries;
create policy "Admins can see all deposit entries" on public.deposit_entries
  for select using (public.is_admin());

-- ============================================================================
-- 6. SEED DATA
-- ============================================================================

-- Organization settings
insert into public.org_settings (timezone) 
values ('Asia/Manila')
on conflict do nothing;

-- Break allowances (WC, Smoke, Eat)
insert into public.break_allowances (break_type, max_count, max_minutes) values
('WC', 10, 60),
('Smoke', 5, 50),
('Eat', 1, 60)
on conflict do nothing;

-- Call status options
insert into public.call_status_options (key, label, sort_order) values
('connected', 'Connected', 1),
('no_answer', 'No Answer', 2),
('voicemail', 'Voicemail', 3),
('busy', 'Busy', 4)
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Call outcome options
insert into public.call_outcome_options (key, label, sort_order) values
('interested', 'Interested', 1),
('not_interested', 'Not Interested', 2),
('callback', 'Callback Requested', 3),
('converted', 'Converted/Sold', 4),
('junk', 'Junk/Invalid', 5)
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
