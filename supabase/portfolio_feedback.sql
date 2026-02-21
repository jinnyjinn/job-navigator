-- Add feedback column to projects table
alter table public.projects 
add column if not exists feedback text;

-- Ensure RLS policies allow teachers to update feedback (if not already covered)
-- We need a policy for teachers to update projects. 
-- For now, let's assume teachers can update ANY project or we need a specific policy.
-- Let's check existing policies later, but for now just adding the column.

create policy "Teachers can update student projects" 
on public.projects
for update
using (
  auth.uid() in (
    select teacher_id from public.classrooms 
    where id in (
      select classroom_id from public.classroom_members 
      where user_id = public.projects.user_id
    )
  )
);
-- Note: The above policy is complex. for now let's just add the column.
