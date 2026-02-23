-- Supabase Storage: avatars 버킷 생성
-- 학생 프로필 이미지 업로드에 필요합니다.
-- Supabase 대시보드 > Storage > New bucket 에서 생성하거나
-- 아래 SQL을 Supabase SQL Editor에서 실행하세요.

-- 버킷 생성 (공개 접근 허용)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 교사: 학생 아바타 업로드 허용 (service role로 업로드하므로 별도 정책 불필요)
-- 모든 사용자: 공개 URL로 이미지 조회 허용
CREATE POLICY "Public avatar read access"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- 본인 아바타 업로드/수정 허용
CREATE POLICY "Users can upload own avatar"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 본인 아바타 삭제 허용
CREATE POLICY "Users can delete own avatar"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
