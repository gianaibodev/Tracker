-- Update break types to match user requirements: WC, Smoke, Eat
-- First, update any existing break entries
update public.break_entries set break_type = 'Smoke' where break_type = 'Other';
update public.break_entries set break_type = 'Eat' where break_type = 'Meal';

-- Update break allowances
delete from public.break_allowances;
insert into public.break_allowances (break_type, max_count, max_minutes) values
('WC', 10, 60),
('Smoke', 5, 50),
('Eat', 1, 60);
