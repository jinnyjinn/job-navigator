-- ============================================================
-- app_settings 테이블: 앱 전체 설정값 저장 (예: Gemini API 키)
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS 활성화
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 교사만 읽기/쓰기/삭제 가능
CREATE POLICY "Teachers can manage app settings"
    ON public.app_settings
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    );
