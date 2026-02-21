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

## 라이선스

MIT
