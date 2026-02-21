-- 🚨 NUCLEAR OPTION: Drop existing policies to avoid conflicts
drop policy if exists "Teachers can insert their own classes" on classrooms;
drop policy if exists "Teachers can update their own classes" on classrooms;

-- 🔓 RELAXED POLICY: Allow ANY authenticated user to insert
-- We still check that they are inserting as themselves (teacher_id = auth.uid()) to keep data sane,
-- but we REMOVE strict role checks.
create policy "Teachers can insert their own classes"
  on classrooms for insert
  with check (auth.uid() = teacher_id);

-- Allow updates too
create policy "Teachers can update their own classes"
  on classrooms for update
  using (auth.uid() = teacher_id);

-- Ensure RLS is enabled but policies are present
alter table classrooms enable row level security;
