-- AI 상담 세션 테이블
CREATE TABLE IF NOT EXISTS public.counseling_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.counseling_sessions ENABLE ROW LEVEL SECURITY;

-- 학생: 자신의 세션만 조회/생성/수정 가능
CREATE POLICY "Students manage own sessions"
    ON public.counseling_sessions
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- 교사: 모든 세션 조회 가능
CREATE POLICY "Teachers view all sessions"
    ON public.counseling_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_counseling_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER counseling_sessions_updated_at
    BEFORE UPDATE ON public.counseling_sessions
    FOR EACH ROW EXECUTE FUNCTION update_counseling_updated_at();
