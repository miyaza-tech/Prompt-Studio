# DECISIONS.md - 아키텍처 및 설계 결정 기록

설계의 "왜"를 기록합니다. 각 결정에는 맥락, 선택지, 이유를 담습니다.

---

## ADR-001: JSON이 Single Source of Truth

**날짜**: 프로젝트 초기  
**상태**: 확정

### 맥락
AI 모델 옵션, 카테고리, 프롬프트 값은 기획자가 수시로 수정해야 하는 데이터다.
코드에 하드코딩하면 매번 개발자가 수정해야 한다.

### 결정
- `data/prompt_master.xlsx` (Excel)이 원본 데이터 소스
- Python 스크립트(`scripts/convert_excel.py`)로 `src/data/normalized/*.json`으로 변환
- 앱은 JSON만 읽음. 코드에 옵션/카테고리/모델 값 직접 작성 금지

### 이유
- 비개발자도 Excel에서 옵션 추가/수정 가능
- `npm run convert:data` 한 번으로 앱에 반영
- 데이터와 로직의 완전한 분리

---

## ADR-002: Zustand 상태 관리 선택

**날짜**: 프로젝트 초기  
**상태**: 확정

### 맥락
토큰 선택, 파라미터, 프리셋, Lab 슬롯 등 여러 컴포넌트가 공유하는 상태가 많다.
컴포넌트 트리가 TopNavigation → page.tsx → 5개 패널로 넓게 퍼져 있다.

### 결정
Zustand 단일 스토어(`src/store/promptStore.ts`)에 모든 전역 상태 집중.  
`persist` 미들웨어로 presets, promptParams를 localStorage에 자동 저장.

### 이유
- Redux 대비 보일러플레이트 최소화
- Context API는 리렌더링 비용 문제
- localStorage 영속성을 미들웨어로 선언적으로 처리

---

## ADR-003: Next.js App Router 선택

**날짜**: 프로젝트 초기  
**상태**: 확정

### 맥락
SPA 수준의 단일 페이지 앱이지만, 디버그 페이지(`/debug`)가 별도 라우트로 필요하다.

### 결정
Next.js 14 App Router 사용. `/` (메인), `/debug` 두 라우트만 존재.

### 이유
- 파일 기반 라우팅으로 `/debug` 페이지 자연스럽게 분리
- 정적 빌드(`npm run build`) 가능 — 백엔드/환경변수 불필요
- TailwindCSS 통합이 자연스러움

---

## ADR-004: ResizeHandle 패널 레이아웃

**날짜**: 프로젝트 초기  
**상태**: 확정

### 맥락
5개 패널(카테고리/토큰선택/파라미터/구조/출력)이 한 화면에 공존해야 한다.
사용자마다 작업 스타일에 따라 패널 크기 조절이 필요하다.

### 결정
`page.tsx`에서 CSS Flexbox + `ResizeHandle` 컴포넌트로 드래그 리사이징 구현.
레이아웃 크기 상수(LEFT_MIN, RIGHT_MAX 등)를 파일 상단에 집중 정의.

### 이유
- 라이브러리 없이 직접 구현해 번들 크기 최소화
- 상수를 한 곳에 모아 레이아웃 조정이 쉬움

---

## ADR-005: 참조코드(RefCode) 시스템 설계

**날짜**: 개발 중반  
**상태**: 확정

### 맥락
Midjourney의 `--sref` (스타일 참조), `--p` (프로파일) 파라미터는
단순 숫자/문자열이 아닌 URL이나 이미지 경로도 받는다.
자주 쓰는 코드를 저장하고 재사용하고 싶다.

### 결정
- `baseRefCodes`: `src/data/normalized/refcodes.json`에 미리 정의된 공유 코드
- `localRefCodes`: localStorage에만 저장되는 사용자 개인 코드
- 두 소스를 합쳐 `RefCodePanel`에 표시, 활성/비활성 토글 가능

### 이유
- 기본 제공 코드(JSON)와 개인 코드(localStorage) 명확히 분리
- JSON 갱신 시 개인 코드 영향 없음

---

## ADR-006: Group 선택 규칙 시스템

**날짜**: 개발 중반  
**상태**: 확정

### 맥락
일부 카테고리는 "1개만 선택", "최대 2개", "서로 배타적 그룹" 등 제약이 필요하다.
예: 조명 방향은 하나만, 카메라 각도는 최대 2개.

### 결정
`groups.json`에 `selection_mode`(`single`/`multi`/`max2`/`max3`)와
`mutex_group`(상호 배타 그룹 ID)을 정의.  
`promptStore.ts`의 `addToken()`에서 규칙 검증.

### 이유
- 규칙을 JSON으로 선언하면 코드 수정 없이 규칙 변경 가능
- UI에서 `selection_mode`를 읽어 안내 문구 자동 표시 가능

---

## ADR-007: 다크모드 구현 방식

**날짜**: 개발 중  
**상태**: 확정

### 맥락
Next.js SSR 환경에서 다크모드를 적용하면 초기 렌더링 시 깜빡임(flash) 문제가 발생한다.

### 결정
`layout.tsx`에 인라인 스크립트로 렌더링 전 localStorage의 `theme` 값을 읽어
`<html>` 태그에 `dark` 클래스를 즉시 적용.  
TailwindCSS `darkMode: 'class'` 설정과 연동.

### 이유
- React hydration 전에 테마가 적용되어 깜빡임 없음
- 라이브러리 불필요

---

## ADR-008: 자동 추천(Suggestions) 시스템

**날짜**: 개발 후반  
**상태**: 확정

### 맥락
특정 옵션을 선택했을 때 연관된 옵션을 자동으로 추천하면 UX가 향상된다.
예: "영화적 조명" 선택 시 "시네마스코프 비율" 추천.

### 결정
`suggestions.json`에 규칙 목록 정의.  
`promptStore.ts`의 `getSuggestions()`가 현재 tokens를 확인해 매칭 규칙 반환.  
`TokenSelectionPanel`에서 색상 배너로 표시, dismiss 가능.

### 이유
- 규칙을 JSON으로 관리해 코드 변경 없이 추천 로직 추가/제거 가능
- dismiss 상태를 store에서 관리해 같은 세션에서 반복 노출 방지

---

## ADR-009: ParamsPanel 탭 기반 재설계

**날짜**: 2026-03-24  
**상태**: 확정

### 맥락
기존 ParamsPanel은 `FORMAT_GROUPS` 드롭다운(Midjourney / Stable Diffusion / 자연어)으로 형식을 선택하고,
하위 모델 드롭다운으로 모델을 선택한 뒤, capabilities 기반으로 파라미터를 나열하는 구조였다.
Midjourney 이미지 파라미터가 6개로 늘어나며(stylize, weirdness, variety, sv, exp, quality) 구조화가 필요했다.

### 결정
- 상단 탭 UI로 전환: **Midjourney 이미지 | Stable Diffusion** (MJ 영상 탭 제거)
- MJ 이미지: 3개 섹션 — **Aspect Ratio** → **Aesthetics** (6개 파라미터) → **Model** (Standard/Raw 토글, Standard/Draft 토글, Version 드롭다운)
- Style Version / Exploration은 `capabilities.sv` / `capabilities.exp`로 v7+ 전용 조건부 렌더링
- MJ 영상 모델은 프롬프트에 파라미터 출력하지 않음

### 이유
- 드롭다운 2단 선택보다 탭이 직관적
- Aesthetics 그룹화로 관련 파라미터를 한눈에 파악
- capabilities 기반 조건부 렌더링으로 버전별 차이 자동 반영

---

## ADR-010: 새 Midjourney 파라미터 일괄 추가

**날짜**: 2026-03-24  
**상태**: 확정

### 맥락
Midjourney v7/v8에서 `--weird`, `--style raw`, `--sv`, `--exp`, `--q`, `--draft` 파라미터가 추가되었다.
기존 blocks.json capabilities에는 이 필드들이 없었다.

### 결정
- `BlockCapabilities` 타입에 `weird`, `raw`, `sv`, `exp`, `q` 추가
- `blocks.json` 모든 MJ 이미지 블록에 해당 capabilities 설정 (sv/exp는 v7+ 전용)
- `meta.json`에 `weird_range` (0~3000), `exp_range` (0~100) 추가
- `getFullPromptText()`에 새 파라미터 출력 로직 추가

### 이유
- capabilities 기반 동적 렌더링 원칙을 유지
- 데이터(JSON) + 타입 + UI + 출력 로직 4곳을 함께 업데이트해 일관성 확보

---

## ADR-011: 구조화 자연어 탭 및 structure_sections.json 매핑

**날짜**: 2026-03-24  
**상태**: 확정

### 맥락
Midjourney 파라미터, SD 네거티브 외에, 자연어 기반 AI 모델(Runway, Sora 등)용으로
토큰을 [Style], [Subject], [Camera] 등 섹션별로 구조화해서 출력하는 기능이 필요했다.
섹션↔카테고리 매핑을 코드에 하드코딩하면 AGENTS.md 원칙 위반이다.

### 결정
- `src/data/normalized/structure_sections.json`을 수동 관리 JSON으로 생성
- 9개 섹션: Style → Subject → Action → Environment → Camera → Focus → Motion(video) → Lighting → Texture
- 각 섹션은 `category_ids`로 fields.json 카테고리와 매핑
- ParamsPanel에 3번째 탭으로 추가, 섹션별 칩토큰(읽기전용) + freetext textarea
- `getStructuredPromptText()`로 `[Section] value1, value2\n` 형식 출력
- PromptOutputBar에서 구조화 탭 활성 시 자동 전환

### 이유
- `fields.json`은 데이터 정의, `structure_sections.json`은 뷰/레이아웃 정의 — 관심사 분리
- Excel 파이프라인 건드릴 필요 없이 JSON 한 줄 수정으로 섹션 재배치 가능
- 변경 빈도 낮아 별도 파이프라인 불필요

---

## ADR-012: 구조화 자연어 freetext 섹션별 삭제로 변경

**날짜**: 2026-03-25  
**상태**: 확정

### 맥락
구조화 자연어 탭에 전체 초기화 버튼만 있어 개별 섹션 freetext를 지우려면 수동 선택+삭제가 필요했다.
상단 "파라미터" 옆 초기화 버튼도 구조화 탭에서 `clearStructuredTexts()`를 호출하는 전체 초기화였다.

### 결정
- 전체 초기화 버튼 2개 모두 제거 (StructuredPanel 내부 + 상단 "파라미터" 옆)
- 각 섹션 freetext textarea 오른쪽에 X 버튼 추가 (텍스트가 있을 때만 표시)
- 구조화 탭 활성 시 상단 "초기화" 버튼 숨김, MJ/SD 탭에서만 표시
- `clearStructuredTexts` prop은 StructuredPanel에서 제거 (dead code 정리)

### 이유
- 사용자가 특정 섹션만 지우고 싶은 경우가 대부분
- 전체 초기화는 실수로 모든 입력을 잃을 위험
- 섹션별 삭제가 더 세밀한 제어를 제공

---

## ADR-013: 페이지 전체 Tab 시스템 폐기

**날짜**: 2026-03-25  
**상태**: 확정

### 맥락
TODO에 Prompt/Params/Lab 3개 탭으로 페이지 전체 레이아웃을 전환하는 기능이 계획되어 있었다.
TopNavigation에 탭 버튼을 추가하고 page.tsx에서 조건부 렌더링을 구현했으나, 실제 사용 시 ParamsPanel 내부의 MJ/SD/자연어 탭만으로 충분하다는 판단이 나왔다.

### 결정
- Prompt/Params/Lab 페이지 전체 레이아웃 전환 폐기
- TopNavigation의 탭 버튼 제거, page.tsx를 단일 레이아웃으로 복원
- `activeTab` / `setActiveTab` store 상태는 유지하되 UI에서 사용하지 않음
- Lab UI는 추후 모달/드로어 등 대안 방식으로 재설계

### 이유
- ParamsPanel 내부 탭(MJ이미지/SD/구조화 자연어)이 파라미터 전환을 이미 담당
- 페이지 전체 전환은 현재 패널 구조와 중복되며 사용자 혼란 유발
- 단일 레이아웃이 모든 패널을 동시에 볼 수 있어 워크플로우에 유리

---

## ADR-014: Presets UI — PromptOutputBar + Portal 드롭다운

**날짜**: 2026-03-25  
**상태**: 확정

### 맥락
`savePreset/loadPreset/deletePreset` store 로직은 완비되어 있었지만 UI가 없어 프리셋 기능을 사용할 수 없었다 (BUG-01).
프리셋은 프롬프트 출력과 밀접하므로 PromptOutputBar의 액션 버튼 영역이 자연스러운 위치였다.

### 결정
- PromptOutputBar에 Bookmark 아이콘 버튼 추가
- 클릭 시 드롭다운: 이름 입력 → 저장, 프리셋 목록 → 불러오기/삭제
- 드롭다운은 `createPortal(document.body)`로 렌더링

### 이유
- PromptOutputBar가 하단 패널에 있어 부모 `overflow-hidden`에 의해 드롭다운이 잘림
- Portal로 body에 직접 렌더링하면 overflow 제약을 완전히 우회
- 버튼 위치 기준 `fixed` 포지셔닝으로 정확한 위치에 표시

---

## ADR-015: RefCode 중복 코드 입력 방지

**날짜**: 2026-03-25  
**상태**: 확정

### 맥락
동일한 sref+p 코드 조합을 여러 번 저장할 수 있어 중복 데이터가 쌓이는 문제 (BUG-03).

### 결정
- `addRefCode()`에서 기존 refCodes와 sref+p 코드 조합을 정렬 후 비교
- 중복 시 `false` 반환, UI에 빨간색 경고 메시지 2.5초 표시
- 반환 타입을 `void` → `boolean`으로 변경

### 이유
- store 레벨에서 차단해 UI 외 경로로도 중복 방지
- 코드 정렬 후 비교로 입력 순서와 무관하게 동일 조합 감지
