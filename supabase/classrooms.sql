-- Create classrooms table
create table classrooms (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references profiles(id) not null,
  name text not null,
  grade int not null,
  class_number int not null,
  join_code text unique not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create classroom_members table
create table classroom_members (
  classroom_id uuid references classrooms(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (classroom_id, student_id)
);

-- Enable RLS
alter table classrooms enable row level security;
alter table classroom_members enable row level security;

-- RLS Policies for Classrooms
-- Teachers can insert their own classes
-- Teachers can insert their own classes (Refactored for Single Teacher Mode - Relaxed)
create policy "Teachers can insert their own classes"
  on classrooms for insert
  with check (auth.uid() = teacher_id);

-- Teachers can update their own classes
create policy "Teachers can update their own classes"
  on classrooms for update
  using (auth.uid() = teacher_id);

-- Everyone can view classes (needed for joining via code lookup, or just teacher?)
-- Actually, simple lookup by code needs public read or specific function.
-- Let's allow authenticated read for now, filtering can happen in UI or stricter policy later.
-- Better: "Teachers see own, Students see joined".
create policy "Teachers see own classrooms"
  on classrooms for select
  using (auth.uid() = teacher_id);

create policy "Students see joined classrooms"
  on classrooms for select
  using (
    exists (
      select 1 from classroom_members
      where classroom_members.classroom_id = classrooms.id
      and classroom_members.student_id = auth.uid()
    )
  );

-- RLS Policies for Members
-- Teachers can view members of their classes
create policy "Teachers can view members of their classes"
  on classroom_members for select
  using (
    exists (
      select 1 from classrooms
      where classrooms.id = classroom_members.classroom_id
      and classrooms.teacher_id = auth.uid()
    )
  );

-- Students can view their own membership
create policy "Students can view own membership"
  on classroom_members for select
  using (auth.uid() = student_id);

-- Students can insert themselves (Join Class)
create policy "Students can join classes"
  on classroom_members for insert
  with check (auth.uid() = student_id);
