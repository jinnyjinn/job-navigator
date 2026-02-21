-- 🚨 Fix for Missing Columns in 'classrooms' table
-- Run this script in Supabase SQL Editor to add the missing columns.

-- 1. Add 'grade' column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'classrooms' and column_name = 'grade') then
    alter table classrooms add column grade int not null default 1;
  end if;
end $$;

-- 2. Add 'class_number' column if it doesn't exist (This is the one causing the error!)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'classrooms' and column_name = 'class_number') then
    alter table classrooms add column class_number int not null default 1;
  end if;
end $$;

-- 3. Add 'is_active' column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'classrooms' and column_name = 'is_active') then
    alter table classrooms add column is_active boolean default true;
  end if;
end $$;

-- 4. Reload Schema Cache (Supabase sometimes caches schema)
notify pgrst, 'reload config';
