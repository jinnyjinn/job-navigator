-- Create teacher_feedbacks table
CREATE TABLE IF NOT EXISTS public.teacher_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('milestone', 'project', 'all')) NOT NULL,
  target_id UUID, -- Can be null if target_type is 'all'
  feedback_type TEXT CHECK (feedback_type IN ('encouragement', 'improvement', 'advice')) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.teacher_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can insert feedback
CREATE POLICY "Teachers can insert feedback" ON public.teacher_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- Teachers can view feedback they sent
CREATE POLICY "Teachers can view sent feedback" ON public.teacher_feedbacks
  FOR SELECT USING (auth.uid() = teacher_id);

-- Students can view feedback sent to them
CREATE POLICY "Students can view received feedback" ON public.teacher_feedbacks
  FOR SELECT USING (auth.uid() = student_id);

-- Students can mark feedback as read (update is_read only)
CREATE POLICY "Students can update read status" ON public.teacher_feedbacks
  FOR UPDATE USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Helper index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_feedbacks_student_id ON public.teacher_feedbacks(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_feedbacks_teacher_id ON public.teacher_feedbacks(teacher_id);
