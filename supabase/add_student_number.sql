-- ============================================================
-- profiles 테이블에 student_number 컬럼 추가
-- Supabase 대시보드 > SQL Editor 에서 한 번만 실행하세요.
-- ============================================================

-- 1. student_number 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_number text;

-- 2. 인덱스 생성 (학번 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_student_number
  ON public.profiles(student_number);

-- 3. 기존에 bulk-register로 등록된 학생 계정이 있다면
--    auth.users의 user_metadata에서 student_number를 복원
UPDATE public.profiles p
SET student_number = u.raw_user_meta_data->>'student_number'
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_user_meta_data->>'student_number' IS NOT NULL
  AND p.student_number IS NULL;
