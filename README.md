# Job Navigator

> 나의 성장을 시각화하는 취업 진로 관리 플랫폼

취업을 준비하는 학생과 이를 지도하는 선생님을 위한 올인원 진로 관리 서비스입니다.
퀘스트 시스템, XP 게이미피케이션, 포트폴리오 관리, 로드맵 추적 기능을 제공합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **인증 (Auth)** | Supabase 기반 이메일/소셜 로그인, 역할(학생/선생님) 분리 |
| **대시보드** | XP 진행도, D-Day 카운터, 활동 히트맵, 퀘스트 미리보기 |
| **퀘스트 시스템** | 목표 달성 퀘스트 목록, 완료 시 XP 획득 |
| **로드맵** | 마일스톤 기반 취업 준비 타임라인 시각화 |
| **포트폴리오** | 프로젝트 카드 등록/수정/삭제 |
| **프로필** | 기술 스택 레이더 차트, 자격증 목록, 설정 |
| **선생님 대시보드** | 학생 목록 관리, 일괄 등록, 피드백, 분석 |
| **다크 모드** | 라이트/다크 테마 전환 지원 |

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Deployment**: Vercel

## 설치 방법

### 1. 저장소 클론

```bash
git clone https://github.com/[your-username]/job-navigator.git
cd job-navigator
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 Supabase 프로젝트 정보를 입력합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

## 환경변수 설정

[Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택 → Settings → API에서 값을 확인하세요.

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명(anon) 공개 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 서비스 롤 키 (공개 금지) | ✅ |

> `.env.local`은 `.gitignore`에 포함되어 있어 GitHub에 업로드되지 않습니다.

## 빌드

```bash
npm run build
```

## Vercel 배포 방법

### 방법 1: GitHub 연동 (권장)

1. **GitHub에 코드 푸시**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Vercel 대시보드에서 프로젝트 연결**
   - [Vercel 대시보드](https://vercel.com/dashboard) 접속
   - "Add New..." → "Project" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

3. **환경 변수 설정**
   - 프로젝트 설정 페이지에서 "Environment Variables" 섹션으로 이동
   - 다음 환경 변수들을 추가:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
   - 각 환경(Production, Preview, Development)에 대해 설정

4. **배포**
   - "Deploy" 버튼 클릭
   - 자동으로 빌드 및 배포가 진행됩니다

### 방법 2: Vercel CLI 사용

1. **Vercel CLI 설치**
   ```bash
   npm i -g vercel
   ```

2. **로그인**
   ```bash
   vercel login
   ```

3. **프로젝트 배포**
   ```bash
   vercel
   ```
   - 첫 배포 시 질문에 답변:
     - Set up and deploy? **Yes**
     - Which scope? (계정 선택)
     - Link to existing project? **No** (첫 배포)
     - Project name? **job-navigator** (또는 원하는 이름)
     - Directory? **./** (현재 디렉토리)
     - Override settings? **No**

4. **환경 변수 설정**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```
   각각 입력 시 값을 입력합니다.

5. **프로덕션 배포**
   ```bash
   vercel --prod
   ```

### 방법 3: Vercel 대시보드에서 직접 배포

1. **Vercel 대시보드 접속**
   - [vercel.com](https://vercel.com) 로그인

2. **새 프로젝트 생성**
   - "Add New..." → "Project" 클릭
   - "Import Git Repository" 또는 "Upload" 선택

3. **프로젝트 설정**
   - Framework Preset: **Next.js**
   - Root Directory: **./** (기본값)
   - Build Command: **npm run build** (자동 감지)
   - Output Directory: **.next** (자동 감지)

4. **환경 변수 추가**
   - "Environment Variables" 섹션에서 추가:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **배포 실행**
   - "Deploy" 버튼 클릭

### 환경 변수 확인

배포 후 다음을 확인하세요:

1. **환경 변수 설정 확인**
   - Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - 모든 환경 변수가 올바르게 설정되었는지 확인

2. **배포 로그 확인**
   - Vercel 대시보드 → 프로젝트 → Deployments
   - 빌드 로그에서 오류가 없는지 확인

3. **애플리케이션 테스트**
   - 배포된 URL로 접속하여 정상 작동 확인
   - 로그인 기능 테스트
   - 이미지 업로드 기능 테스트

### 자동 배포 설정

GitHub 연동 시:
- `main` 브랜치에 푸시하면 자동으로 프로덕션 배포
- 다른 브랜치에 푸시하면 프리뷰 배포
- Pull Request 생성 시 프리뷰 URL 자동 생성

### 문제 해결

**빌드 실패 시:**
```bash
# 로컬에서 빌드 테스트
npm run build

# 오류 확인 후 수정
```

**환경 변수 오류:**
- Vercel 대시보드에서 환경 변수가 올바르게 설정되었는지 확인
- 변수명에 오타가 없는지 확인
- Production, Preview, Development 모두 설정되었는지 확인

**이미지 업로드 오류:**
- Supabase Storage 버킷(`avatars`)이 생성되어 있는지 확인
- Storage 정책이 올바르게 설정되어 있는지 확인

## 라이선스

MIT
