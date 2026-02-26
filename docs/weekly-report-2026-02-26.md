# Dott 주간 업무보고

> 작성일: 2026.02.26 (수)
> 보고 대상: 다음 주 업무보고용

---

## 1. 금주 완료 작업

### 1-1. 랜딩페이지 제작
- HeyGen 스타일 섹션별 그라데이션 배경 (밝은 퍼플 → 딥 퍼플 전환)
- 스크롤 애니메이션 5종 (up, left, right, scale, blur)
- 시작하기 버튼 클릭 시 그라데이션 확산 트랜지션
- 10개 섹션: Hero, 문제 제기, 솔루션, 작동 방식, 기능 소개, 비교표, 활용 사례, CTA
- Figma 자동 Push 피쳐 랜딩페이지 추가

### 1-2. 탭 격리 (병렬 작업 지원)
- AppShell 내 모든 탭 페이지 동시 마운트 (display none/block 방식)
- 한 탭에서 작업 중 다른 탭으로 전환해도 상태 유지
- 예: Figma 배너 생성 중 → Tasks 탭 이동 → 돌아오면 생성 진행 상태 그대로
- 방문하지 않은 탭은 lazy mount하여 초기 로딩 최적화

### 1-3. Figma 연동 개선
- 미연결 사용자용 3단계 설치 가이드 (계정 로그인 → 토큰 생성 → 연결)
- 연결 후 자동 Push 플러그인 설치 안내 (접이식 4단계 가이드)
- Push 상태 분리: Figma Push 완료 vs 로컬 생성 완료 구분
- 미연결 시 "배너 생성하기", 연결 시 "Generate & Push to Figma" 동적 버튼

### 1-4. 뉴스 피드 → 인사이트 북마크 연동
- Trends 뉴스 피드 북마크 클릭 시 Insight 탭에 article로 저장
- 카테고리 자동 태그 부여 (trend, marketing 등)
- 북마크 토글 (재클릭 시 해제)
- 저장 상태 시각적 표시 (빈 아이콘 ↔ 채워진 아이콘)

### 1-5. UI/UX 개선
- TopBar 글래스 효과 (backdrop-blur, 투명도 조절)
- 전체 버튼 스타일 통일 (variant="outline")
- 토글 섹션 기본 닫힘 처리
- 트렌드 브리핑 최소 3개 보장 + 강제 재생성 옵션
- 사이드바 로그아웃 버튼 분리
- 하단 미세 패딩 제거

### 1-6. QA 및 보안 수정
- Blob URL 메모리 리크 수정 (revokeObjectURL 적용)
- XSS 방지: 외부 RSS HTML 렌더링 시 sanitizeHtml 적용
- 북마크 중복 클릭 race condition 방지
- AppShell useEffect 의존성 최적화

---

## 2. 기술 부채 감사 결과

전체 코드 QA를 통해 아래와 같은 기술 부채를 식별했습니다.

### 즉시 수정 필요 (Critical)
| 항목 | 상태 | 비고 |
|------|------|------|
| `.env.local` Electron 빌드 포함 → 시크릿 노출 | 수정 중 | service_role 키 등 전체 환경변수 DMG에 포함 |
| node_modules 전체(1.8GB) Electron 번들 | 수정 중 | devDependencies 포함하여 앱 용량 1.5GB |
| debug 엔드포인트 프로덕션 노출 | 수정 중 | /api/debug/tokens 삭제 예정 |

### 고우선순위 (다음 주 착수)
| 항목 | 영향도 | 예상 소요 |
|------|--------|----------|
| API 입력 검증 (Zod 스키마) | 90개 라우트 무검증 | 2일 |
| SWR/React Query 도입 | 캐싱/중복제거 없음 | 3일 |
| 테스트 코드 0건 | Vitest + Playwright 셋업 | 5일 |
| CI/CD 파이프라인 없음 | GitHub Actions 구축 | 1일 |
| 마이그레이션 관리 체계화 | 27개 SQL 파일 산재 | 1일 |

---

## 3. 다음 주 계획

### Phase 1 — 보안 긴급 수정 (완료 예정)
- [x] .env.local Electron 빌드 제거
- [x] node_modules 번들 최적화
- [x] debug 엔드포인트 삭제
- [x] Claude 클라이언트 싱글턴 캐싱
- [x] env var 안전 처리

### Phase 2 — 안정성 & 에러 처리 (착수)
- [ ] Zod 스키마 기반 API 입력 검증 (주요 10개 라우트 우선)
- [ ] apiHandler 래퍼 전체 적용
- [ ] 누락된 error boundary 추가 (7개 페이지)
- [ ] loading.tsx 스켈레톤 UI 추가

### Phase 3 — 성능 최적화 (착수)
- [ ] SWR 도입 (dashboard, trends, tasks 우선)
- [ ] Heavy 라이브러리 dynamic import (recharts, xyflow, blocknote)

---

## 4. 전체 고도화 로드맵 요약

| Phase | 내용 | 소요 | 시기 |
|-------|------|------|------|
| Phase 1 | 보안 긴급 수정 | 1~2일 | 이번 주 |
| Phase 2 | 안정성 & 에러 처리 | 3~5일 | 다음 주 |
| Phase 3 | 성능 최적화 | 3~5일 | 다음 주 |
| Phase 4 | 코드 품질 개선 | 5~7일 | 3주차 |
| Phase 5 | 테스트 & CI/CD | 5~7일 | 3~4주차 |
| Phase 6 | Electron 고도화 | 3~5일 | 4주차 |
| Phase 7 | UX 고도화 | 3~5일 | 5주차 |
| **합계** | | **~30일** | **~5주** |

### 주요 수치
- API 라우트: 90개
- 페이지: 17개
- 컴포넌트: 80+개
- 테스트 커버리지: 0% → 목표 60%+
- Electron 빌드 크기: 1.5GB → 목표 300MB 이하

---

## 5. 리스크 & 의존성

| 리스크 | 영향 | 대응 |
|--------|------|------|
| macOS 코드 서명 미적용 | Gatekeeper 경고로 설치 장벽 | Apple Developer 계정 필요 ($99/yr) |
| Supabase service_role 노출 이력 | 기존 배포 버전 시크릿 교체 필요 | 키 로테이션 즉시 실행 |
| 테스트 부재로 리팩토링 리스크 | Phase 4 코드 분할 시 회귀 버그 | Phase 5(테스트)를 Phase 4와 병행 |

---

*작성: Dott 개발팀*
