<p align="center">
  <img src="public/logo-dott.png" width="80" alt="Dott Logo" />
</p>

<h1 align="center">Dott</h1>
<p align="center"><strong>AI 브랜드 비서 — 마케팅에 필요한 모든 것을 하나의 앱에</strong></p>

<p align="center">
  콘텐츠 기획, 광고 분석, 트렌드 리서치, 디자인까지.<br/>
  Dott이 당신 옆에 앉은 4명의 전문가가 됩니다.
</p>

<p align="center">
  <a href="https://dott-blush.vercel.app">랜딩페이지</a> ·
  <a href="https://github.com/robinbaebae/Dott/releases">DMG 다운로드</a>
</p>

---

## 주요 기능

### AI 에이전트 시스템
자연어로 말하면 AI 오케스트레이터가 최적의 전문가를 자동 배정합니다.

| 에이전트 | 역할 |
|---------|------|
| 📢 마케팅 전문가 | 카피라이팅, 캠페인 기획, SNS 전략, 이메일 마케팅 |
| 🎨 디자인 전문가 | 배너 제작, Figma 자동 Push, 크리에이티브 디렉션 |
| 🔍 리서치 전문가 | 트렌드 분석, 경쟁사 모니터링, SEO 키워드 리서치 |
| 🛠️ 서비스 빌더 | 기능 기획, 시스템 설계, 기술 전략 수립 |

### 14개 내장 기능
- **AI 대화** — 물어보기만 하면 Dott이 판단하여 실행
- **콘텐츠 워크스페이스** — 블로그, SEO 브리프, 이메일 시퀀스, 캘린더
- **광고 분석** — Meta 광고 데이터 자동 수집 + AI 인사이트
- **트렌드 & 리서치** — RSS 피드, 경쟁사 모니터링, 키워드 트렌드
- **인사이트 & 메모** — 링크/아티클 스크랩, AI 대화에서 자동 참조
- **프로모션 빌더** — 프로모션 설계 + AI 카피 생성
- **Figma 자동 Push** — AI 생성 배너를 Figma 캔버스에 자동 배치
- **플로팅 미니펫** — 데스크톱 위 항상 대기하는 AI 어시스턴트 (macOS)
- **브랜드 가이드** — 톤, 키컬러, 타겟 등록 → 모든 AI 응답에 반영
- **태스크 관리** — 긴급도/중요도 기반 태스크 보드
- **Google 캘린더/Gmail 연동** — 일정 확인 + AI 이메일 초안
- **소셜미디어 분석** — Instagram, Threads 게시글 성과 추적

### 행동인지학 기반 UX
- **Activity Heatmap** — GitHub 잔디 스타일 84일 활동 시각화 (자기 모니터링)
- **Resume Panel** — 미완료 태스크 자동 서페이싱 (자이가르닉 효과)
- **Exit Summary** — 앱 종료 시 오늘 성과 요약 (피크-엔드 법칙)

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Desktop | Electron 40, IPC 통신, 미니펫, 트레이 |
| AI | Claude API (Anthropic), 4개 전문 에이전트, 오케스트레이터 |
| Backend | Supabase (PostgreSQL + Auth + RLS), 40+ API 라우트 |
| 인증 | Google OAuth (NextAuth), Calendar/Gmail 스코프 |
| 연동 | Meta Ads API, Instagram API, Threads API, Figma, Tavily |
| 상태관리 | Zustand |
| UI | Radix UI, Lucide Icons, Recharts |

---

## 시작하기

### 사전 준비
- Node.js 18+
- Google Cloud Console OAuth 설정
- Supabase 프로젝트

### 설치

```bash
git clone https://github.com/robinbaebae/Dott.git
cd Dott
npm install
```

### 환경 변수

`.env.local.example`을 `.env.local`로 복사 후 키를 입력하세요.

```bash
cp .env.local.example .env.local
```

### 실행

```bash
# 웹 개발 서버
npm run dev

# Electron 데스크톱 앱 (개발)
npm run electron:dev

# 프로덕션 빌드
npm run build

# DMG 빌드 (macOS)
npx electron-builder --mac --arm64
```

### 데모 모드

API 키 없이 모든 기능을 체험할 수 있습니다.
랜딩페이지 → **"데모 체험하기"** 버튼을 클릭하세요.

---

## 아키텍처

```
사용자 입력
  │
  ▼
classifyTask()          ← AI 또는 로컬 키워드 매칭으로 에이전트 분류
  │
  ▼
컨텍스트 수집 (병렬)     ← 브랜드 가이드, 소셜 데이터, 메모, 웹 검색
  │
  ▼
executeAgentTask()      ← 선택된 전문 에이전트가 Claude API로 실행
  │
  ▼
후처리                  ← 배너/블로그/캘린더/이메일/Figma 자동 생성
```

---

## 라이선스

이 프로젝트는 비공개 프로젝트입니다.
