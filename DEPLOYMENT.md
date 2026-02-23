# Vercel 배포 가이드

이 문서는 Job Navigator 프로젝트를 Vercel에 배포하는 상세한 가이드입니다.

## 📋 배포 전 체크리스트

### 1. 코드 준비
- [ ] 모든 변경사항이 커밋되었는지 확인
- [ ] 로컬에서 빌드가 성공하는지 확인 (`npm run build`)
- [ ] 린터 오류가 없는지 확인 (`npm run lint`)

### 2. 환경 변수 준비
다음 환경 변수들의 값을 준비하세요:

| 변수명 | 설명 | 확인 위치 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Supabase 대시보드 → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 (비공개) | Supabase 대시보드 → Settings → API |

### 3. Supabase 설정 확인
- [ ] Storage 버킷 `avatars`가 생성되어 있는지 확인
- [ ] Storage 정책이 올바르게 설정되어 있는지 확인
- [ ] 데이터베이스 스키마가 최신인지 확인

## 🚀 배포 방법

### 방법 1: GitHub 연동 (가장 권장)

#### 단계별 가이드

1. **GitHub에 코드 푸시**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard 접속
   - GitHub 계정으로 로그인 (처음이면 GitHub 연동)

3. **프로젝트 가져오기**
   - "Add New..." 버튼 클릭
   - "Project" 선택
   - GitHub 저장소 목록에서 `job-navigator` 선택
   - "Import" 클릭

4. **프로젝트 설정**
   - Framework Preset: **Next.js** (자동 감지됨)
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (자동 감지됨)
   - Output Directory: `.next` (자동 감지됨)
   - Install Command: `npm install` (기본값)

5. **환경 변수 설정** ⚠️ 중요!
   - "Environment Variables" 섹션으로 스크롤
   - 다음 변수들을 추가:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL
   값: https://your-project.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   값: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   SUPABASE_SERVICE_ROLE_KEY
   값: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   - 각 변수에 대해 환경 선택:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

6. **배포 실행**
   - "Deploy" 버튼 클릭
   - 빌드 진행 상황을 실시간으로 확인 가능

7. **배포 완료 확인**
   - 배포가 완료되면 URL이 생성됩니다
   - 예: `https://job-navigator-xxx.vercel.app`
   - URL 클릭하여 사이트 접속 테스트

### 방법 2: Vercel CLI 사용

#### 설치 및 설정

```bash
# Vercel CLI 전역 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 디렉토리에서 배포
cd C:\Projects\job-navigator
vercel
```

#### 첫 배포 시 질문 답변

```
? Set up and deploy "C:\Projects\job-navigator"? [y/N] y
? Which scope do you want to deploy to? (계정 선택)
? Link to existing project? [y/N] N
? What's your project's name? job-navigator
? In which directory is your code located? ./
? Want to override the settings? [y/N] N
```

#### 환경 변수 설정

```bash
# 각 환경 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 프롬프트에 값 입력

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 프롬프트에 값 입력

vercel env add SUPABASE_SERVICE_ROLE_KEY
# 프롬프트에 값 입력
```

각 변수에 대해 환경을 선택:
- Production: `y`
- Preview: `y`
- Development: `y` (선택사항)

#### 프로덕션 배포

```bash
vercel --prod
```

### 방법 3: Vercel 대시보드에서 직접 업로드

1. Vercel 대시보드 접속
2. "Add New..." → "Project" → "Upload" 선택
3. 프로젝트 폴더를 ZIP으로 압축
4. ZIP 파일 업로드
5. 환경 변수 설정 (방법 1과 동일)
6. "Deploy" 클릭

## 🔧 배포 후 확인사항

### 1. 기본 기능 테스트

- [ ] 홈페이지 접속 확인
- [ ] 로그인 기능 테스트
- [ ] 학생/선생님 역할 분리 확인
- [ ] 대시보드 로드 확인

### 2. 이미지 업로드 기능 테스트

- [ ] 선생님 계정으로 로그인
- [ ] 학생 일괄 등록 페이지 접속
- [ ] ZIP 파일 업로드 테스트
- [ ] 이미지가 정상적으로 업로드되는지 확인

### 3. 환경 변수 확인

Vercel 대시보드에서:
- Settings → Environment Variables
- 모든 변수가 올바르게 설정되었는지 확인

## 🔄 자동 배포 설정

GitHub 연동 시 자동 배포가 활성화됩니다:

- **Production 배포**: `main` 브랜치에 푸시 시 자동 배포
- **Preview 배포**: 다른 브랜치에 푸시 시 프리뷰 배포
- **PR Preview**: Pull Request 생성 시 자동으로 프리뷰 URL 생성

### 자동 배포 비활성화 (필요시)

Vercel 대시보드 → 프로젝트 → Settings → Git
- "Automatically deploy" 옵션을 끄면 수동 배포만 가능

## 🐛 문제 해결

### 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build

# 오류 메시지 확인 후 수정
```

**일반적인 오류:**
- TypeScript 오류: 타입 정의 확인
- 의존성 오류: `package.json` 확인
- 환경 변수 오류: Vercel 대시보드에서 확인

### 환경 변수 오류

**증상:**
- "Missing environment variable" 오류
- Supabase 연결 실패

**해결:**
1. Vercel 대시보드 → Settings → Environment Variables
2. 모든 변수가 설정되었는지 확인
3. 변수명에 오타가 없는지 확인
4. Production, Preview, Development 모두 설정되었는지 확인

### 이미지 업로드 실패

**확인사항:**
1. Supabase Storage 버킷 `avatars` 존재 확인
2. Storage 정책 확인:
   ```sql
   -- Supabase SQL Editor에서 실행
   SELECT * FROM storage.buckets WHERE id = 'avatars';
   ```
3. Storage 정책이 올바르게 설정되어 있는지 확인

### 배포는 성공했지만 사이트가 작동하지 않음

1. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 오류 메시지 확인

2. **네트워크 탭 확인**
   - F12 → Network 탭
   - API 요청이 실패하는지 확인

3. **Vercel 로그 확인**
   - Vercel 대시보드 → 프로젝트 → Deployments
   - 최신 배포의 로그 확인

## 📝 추가 설정

### 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 도메인 추가
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정

### 환경별 설정

- **Production**: 실제 사용자용 환경
- **Preview**: 브랜치/PR별 프리뷰 환경
- **Development**: 로컬 개발 환경

각 환경에 다른 환경 변수를 설정할 수 있습니다.

## 🔐 보안 주의사항

⚠️ **중요:**
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 공개하지 마세요
- GitHub에 `.env.local` 파일을 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- Vercel 환경 변수는 암호화되어 저장됩니다

## 📞 지원

문제가 발생하면:
1. Vercel 문서: https://vercel.com/docs
2. Next.js 문서: https://nextjs.org/docs
3. Supabase 문서: https://supabase.com/docs

---

**배포 성공을 기원합니다! 🎉**
