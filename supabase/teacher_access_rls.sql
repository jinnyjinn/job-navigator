-- Helper function to check if a user (teacher) teaches the student (target_student_id)
-- This assumes:
-- 1. classrooms table has teacher_id
-- 2. classroom_members table links classroom_id and user_id (student)

CREATE OR REPLACE FUNCTION public.is_teacher_of(target_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.classrooms c
    JOIN public.classroom_members cm ON c.id = cm.classroom_id
    WHERE c.teacher_id = auth.uid()
    AND cm.student_id = target_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for roadmaps
CREATE POLICY "Teachers can view their students roadmaps" ON public.roadmaps
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for daily_quests
CREATE POLICY "Teachers can view their students daily_quests" ON public.daily_quests
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for projects
CREATE POLICY "Teachers can view their students projects" ON public.projects
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for certifications
CREATE POLICY "Teachers can view their students certifications" ON public.certifications
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for skills
CREATE POLICY "Teachers can view their students skills" ON public.skills
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for dday_events
CREATE POLICY "Teachers can view their students dday_events" ON public.dday_events
  FOR SELECT USING ( public.is_teacher_of(user_id) );

-- Policy for profiles
CREATE POLICY "Teachers can view their students profiles" ON public.profiles
  FOR SELECT USING ( public.is_teacher_of(id) );
