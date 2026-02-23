# 🚀 빠른 배포 가이드

## 1단계: 변경사항 커밋 및 푸시

터미널에서 다음 명령어를 실행하세요:

```bash
# 변경사항 추가
git add .

# 커밋
git commit -m "Add CSV bulk import with ZIP file support and images"

# GitHub에 푸시
git push origin main
```

## 2단계: Vercel 대시보드 접속

1. 브라우저에서 https://vercel.com/dashboard 접속
2. GitHub 계정으로 로그인 (처음이면 GitHub 연동)

## 3단계: 프로젝트 가져오기

1. "Add New..." 버튼 클릭
2. "Project" 선택
3. GitHub 저장소 목록에서 `job-navigator` 찾기
4. "Import" 클릭

## 4단계: 프로젝트 설정 (자동 감지됨)

- Framework Preset: **Next.js** ✓
- Root Directory: `./` ✓
- Build Command: `npm run build` ✓
- Output Directory: `.next` ✓

**변경할 필요 없음!** 그대로 "Deploy" 클릭해도 되지만, 먼저 환경 변수를 설정하세요.

## 5단계: 환경 변수 설정 ⚠️ 매우 중요!

"Environment Variables" 섹션으로 스크롤한 후 다음 3개를 추가:

### 변수 1: NEXT_PUBLIC_SUPABASE_URL
- Key: `NEXT_PUBLIC_SUPABASE_URL`
- Value: Supabase 대시보드에서 복사 (예: `https://xxxxx.supabase.co`)
- 환경: Production ✅, Preview ✅, Development ✅ (모두 체크)

### 변수 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: Supabase 대시보드에서 복사 (긴 문자열)
- 환경: Production ✅, Preview ✅, Development ✅

### 변수 3: SUPABASE_SERVICE_ROLE_KEY
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Supabase 대시보드에서 복사 (비밀 키)
- 환경: Production ✅, Preview ✅, Development ✅

**Supabase 값 찾는 방법:**
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. Settings → API 메뉴
4. 각각의 값 복사

## 6단계: 배포 실행

1. "Deploy" 버튼 클릭
2. 빌드 진행 상황 확인 (약 2-3분 소요)
3. 배포 완료 후 URL 확인 (예: `https://job-navigator-xxx.vercel.app`)

## 7단계: 테스트

배포된 URL로 접속하여:
- [ ] 홈페이지 로드 확인
- [ ] 로그인 기능 테스트
- [ ] 학생 일괄 등록 페이지 접속
- [ ] ZIP 파일 업로드 테스트

## 문제 발생 시

### 빌드 실패
- Vercel 대시보드 → Deployments → 로그 확인
- 환경 변수가 모두 설정되었는지 확인

### 사이트가 작동하지 않음
- 브라우저 콘솔(F12)에서 오류 확인
- 환경 변수 값이 올바른지 확인

### 이미지 업로드 실패
- Supabase Storage에 `avatars` 버킷이 있는지 확인
- Storage 정책이 올바르게 설정되었는지 확인

---

**도움이 필요하면 알려주세요!** 💪
