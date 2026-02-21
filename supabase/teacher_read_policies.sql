-- ============================================================
-- Teacher Read Policies
-- Run this migration in your Supabase SQL editor.
-- Allows teachers to view data of students in their classrooms.
-- ============================================================

-- Teachers can view activity_logs for students in their classrooms
CREATE POLICY "Teachers can view student activity logs"
  ON public.activity_logs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.teacher_id
      FROM public.classrooms c
      INNER JOIN public.classroom_members cm ON c.id = cm.classroom_id
      WHERE cm.student_id = activity_logs.user_id
    )
  );

-- Teachers can view daily_quests for students in their classrooms
CREATE POLICY "Teachers can view student daily quests"
  ON public.daily_quests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.teacher_id
      FROM public.classrooms c
      INNER JOIN public.classroom_members cm ON c.id = cm.classroom_id
      WHERE cm.student_id = daily_quests.user_id
    )
  );

-- Teachers can view roadmaps for students in their classrooms
CREATE POLICY "Teachers can view student roadmaps"
  ON public.roadmaps FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.teacher_id
      FROM public.classrooms c
      INNER JOIN public.classroom_members cm ON c.id = cm.classroom_id
      WHERE cm.student_id = roadmaps.user_id
    )
  );

-- Teachers can view projects for students in their classrooms
CREATE POLICY "Teachers can view student projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.teacher_id
      FROM public.classrooms c
      INNER JOIN public.classroom_members cm ON c.id = cm.classroom_id
      WHERE cm.student_id = projects.user_id
    )
  );
