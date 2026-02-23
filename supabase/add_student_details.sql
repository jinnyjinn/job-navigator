-- Add missing columns to profiles table to support full student data from CSV
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clubs_joined TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_share_consent BOOLEAN DEFAULT false;

-- Add index for faster searching by student_number if not already present
CREATE INDEX IF NOT EXISTS idx_profiles_student_number ON public.profiles(student_number);
