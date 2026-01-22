-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'csr')) default 'csr',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Settings tables
create table public.org_settings (
  id uuid primary key default uuid_generate_v4(),
  timezone text default 'Asia/Manila',
  break_reset_mode text check (break_reset_mode in ('daily', 'weekly_fixed', 'pay_period', 'rolling')) default 'daily',
  break_reset_anchor jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.break_allowances (
  id uuid primary key default uuid_generate_v4(),
  break_type text not null, -- 'smoke', 'lunch', etc.
  max_count integer default 0,
  max_minutes integer default 0,
  is_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.call_status_options (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  label text not null,
  sort_order integer default 0,
  is_enabled boolean default true
);

create table public.call_outcome_options (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  label text not null,
  sort_order integer default 0,
  is_enabled boolean default true
);

-- 3. Tracking tables
create table public.work_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  work_date date default current_date not null,
  clock_in_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clock_out_at timestamp with time zone,
  remarks text,
  session_status text check (session_status in ('open', 'closed')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.break_entries (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.work_sessions(id) on delete cascade not null,
  break_type text not null,
  start_at timestamp with time zone default timezone('utc'::text, now()) not null,
  end_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.call_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.work_sessions(id) on delete cascade not null,
  occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  call_status text not null,
  call_outcome text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.deposit_entries (
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

-- 4. Enable RLS
alter table public.profiles enable row level security;
alter table public.org_settings enable row level security;
alter table public.break_allowances enable row level security;
alter table public.call_status_options enable row level security;
alter table public.call_outcome_options enable row level security;
alter table public.work_sessions enable row level security;
alter table public.break_entries enable row level security;
alter table public.call_entries enable row level security;
alter table public.deposit_entries enable row level security;

-- 5. Functions & Triggers
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

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'csr'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. RLS Policies

-- Profiles
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can update any profile" on public.profiles
  for update using (public.is_admin());

-- Org Settings (Admin only write, everyone read)
create policy "Anyone can read org settings" on public.org_settings
  for select using (true);
create policy "Admins can update org settings" on public.org_settings
  for all using (public.is_admin());

-- Break Allowances, Call Options (Everyone read, Admin write)
create policy "Anyone can read break allowances" on public.break_allowances
  for select using (true);
create policy "Admins can manage break allowances" on public.break_allowances
  for all using (public.is_admin());

create policy "Anyone can read call statuses" on public.call_status_options
  for select using (true);
create policy "Admins can manage call statuses" on public.call_status_options
  for all using (public.is_admin());

create policy "Anyone can read call outcomes" on public.call_outcome_options
  for select using (true);
create policy "Admins can manage call outcomes" on public.call_outcome_options
  for all using (public.is_admin());

-- Work Sessions
create policy "Users can see own work sessions" on public.work_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own work sessions" on public.work_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own open work sessions" on public.work_sessions
  for update using (auth.uid() = user_id and session_status = 'open');
create policy "Admins can see all work sessions" on public.work_sessions
  for select using (public.is_admin());

-- Break Entries, Call Entries, Deposit Entries (Follow work_sessions pattern)
create policy "Users can manage own break entries" on public.break_entries
  for all using (
    exists (
      select 1 from public.work_sessions
      where id = break_entries.session_id and user_id = auth.uid()
    )
  );
create policy "Admins can see all break entries" on public.break_entries
  for select using (public.is_admin());

create policy "Users can manage own call entries" on public.call_entries
  for all using (user_id = auth.uid());
create policy "Admins can see all call entries" on public.call_entries
  for select using (public.is_admin());

create policy "Users can manage own deposit entries" on public.deposit_entries
  for all using (user_id = auth.uid());
create policy "Admins can see all deposit entries" on public.deposit_entries
  for select using (public.is_admin());

-- 7. Initial Seed Data
insert into public.org_settings (timezone) values ('Asia/Manila');

insert into public.break_allowances (break_type, max_count, max_minutes) values
('smoke', 5, 50),
('lunch', 1, 60),
('other', 3, 30);

insert into public.call_status_options (key, label, sort_order) values
('connected', 'Connected', 1),
('no_answer', 'No Answer', 2),
('voicemail', 'Voicemail', 3),
('busy', 'Busy', 4);

insert into public.call_outcome_options (key, label, sort_order) values
('interested', 'Interested', 1),
('not_interested', 'Not Interested', 2),
('callback', 'Callback Requested', 3),
('converted', 'Converted/Sold', 4),
('junk', 'Junk/Invalid', 5);
