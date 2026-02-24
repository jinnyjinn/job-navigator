-- ============================================================
-- counseling_requests 테이블: 학생의 AI 상담 활성화 요청
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.counseling_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)  -- 학생당 요청 1개만 유지
);

ALTER TABLE public.counseling_requests ENABLE ROW LEVEL SECURITY;

-- 학생: 자신의 요청 생성/조회/삭제 가능
CREATE POLICY "Students can manage own counseling requests"
    ON public.counseling_requests
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- 교사: 모든 요청 조회 가능
CREATE POLICY "Teachers can view all counseling requests"
    ON public.counseling_requests
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    );
