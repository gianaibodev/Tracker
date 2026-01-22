-- 1. Add username to profiles
alter table public.profiles add column username text unique;

-- 2. Update the trigger to handle username from metadata
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

-- 3. Create the Admin account with a username
-- Username: admin
-- Password: admin
-- We use a dummy email 'admin@internal.app' for Supabase Auth compatibility
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'admin@internal.app', -- Dummy email
  extensions.crypt('admin', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"System Admin","username":"admin","role":"admin"}',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

-- 4. Re-sync profile if needed
UPDATE public.profiles 
SET username = 'admin', role = 'admin' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@internal.app');
