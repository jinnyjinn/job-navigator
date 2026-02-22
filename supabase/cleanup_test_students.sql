-- ============================================================
-- 테스트용 학생 계정 전체 삭제
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
--
-- ※ 주의: 이 SQL은 role='student'인 모든 계정을 삭제합니다.
--          교사(teacher) 계정은 영향 없음.
--          실행 전 반드시 확인하세요.
-- ============================================================

-- 1단계: 삭제할 학생 UUID 목록 확인 (삭제 전 미리 확인용)
SELECT id, email, name, role
FROM public.profiles
WHERE role = 'student'
ORDER BY created_at;

-- ↑ 위 SELECT 결과를 먼저 확인한 후, 아래 DELETE를 실행하세요.

-- ============================================================

-- 2단계: auth.users에서 학생 계정 삭제
-- (auth.users 삭제 시 profiles, classroom_members 등 연결 데이터도 CASCADE 삭제됨)
DELETE FROM auth.users
WHERE id IN (
    SELECT id
    FROM public.profiles
    WHERE role = 'student'
);

-- ============================================================
-- 실행 후: profiles 테이블에 학생이 0명인지 확인
-- SELECT COUNT(*) FROM public.profiles WHERE role = 'student';
-- ============================================================
