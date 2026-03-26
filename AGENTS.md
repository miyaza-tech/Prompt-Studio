# AGENTS.md - Prompt Studio 개발 가이드

이 문서는 AI 에이전트 및 개발자를 위한 Prompt Studio 프로젝트 가이드입니다.

## 🎯 핵심 원칙

### 절대 금지 사항 (NEVER DO)

1. **하드코딩 금지**: 옵션, 필드, 카테고리, 모델 정보를 코드에 직접 작성하지 않음
2. **JSON이 Single Source of Truth**: 모든 데이터는 `src/data/normalized/` JSON에서 유도
3. **메시지/라벨 하드코딩 금지**: 모든 텍스트는 JSON에서 로드
4. **순서 하드코딩 금지**: `sort_order` 필드 사용

### 반드시 준수 (ALWAYS DO)

1. 새 옵션/필드 추가 시 → Excel 수정 → `npm run convert:data` 실행
2. 타입 변경 시 → `src/types/index.ts` 업데이트
3. 컴포넌트는 props/store에서 데이터 받아 렌더링

---

## 📊 데이터 스키마

### fields.json

카테고리/필드 정의

```typescript
interface Field {
  field_id: string;         // URL-safe ID
  category_id: string;      // 카테고리 그룹 ID
  category: string;         // 카테고리 이름
  category_raw: string;     // 원본 카테고리 이름
  label: string;            // 표시 라벨
  label_raw: string;        // 원본 라벨
  description: string;      // 설명
  input_type: string;       // "chips" | "text" | "select"
  sort_order: number;       // 정렬 순서
  default_generated: boolean; // 자동 생성 여부
}
```

### options.json

각 카테고리의 선택 가능한 옵션들

```typescript
interface Option {
  option_id: string;        // URL-safe ID
  category_id: string;      // 소속 카테고리 ID
  category_name: string;    // 카테고리 이름
  value: string;            // 프롬프트에 들어갈 값 (영문)
  value_raw: string;        // 원본 값
  label: string;            // 표시 라벨
  label_en: string;         // 영문 라벨
  label_ko: string;         // 한글 라벨
  group: string;            // 서브그룹 (있는 경우)
  sort_order: number;       // 정렬 순서
  media_type: "image" | "video" | "all"; // 지원 미디어
  default_generated: boolean;
}
```

### blocks.json

AI 모델 정의

```typescript
interface Block {
  block_id: string;         // 모델 ID
  label: string;            // 표시 이름
  prompt_format: PromptFormat; // "midjourney" | "stable_diffusion" | "natural"
  version?: string;         // 버전 (Midjourney)
  capabilities: {           // 지원 기능
    aspect_ratio?: boolean;
    stylize?: boolean;
    chaos?: boolean;
    sref?: boolean;
    cref?: boolean;
    weird?: boolean;
    raw?: boolean;
    sv?: boolean;
    exp?: boolean;
    q?: boolean;
    draft?: boolean;
    // ... 기타
  };
  param_defaults: Record<string, any>; // 기본값
  sort_order: number;
}
```

### meta.json

파라미터 메타데이터

```typescript
interface Meta {
  aspect_ratios: { value: string; label: string }[];
  stylize_range: { min: number; max: number; default: number };
  chaos_range: { min: number; max: number; default: number };
  weird_range: { min: number; max: number; default: number };
  exp_range: { min: number; max: number; default: number };
  fps_options: number[];
  duration_range: { min: number; max: number; unit: string };
  motion_range: { min: number; max: number; default: number };
  versions: { value: string; label: string }[];
  // ...
}
```

### structure_sections.json

구조화 자연어 탭의 섹션↔카테고리 매핑 (수동 관리)

```typescript
interface StructureSection {
  section_id: string;       // 섹션 ID (style, subject, action, ...)
  label: string;            // 표시 라벨 (영문)
  sort_order: number;       // 정렬 순서
  category_ids: string[];   // 매핑된 fields.json 카테고리 ID 목록
  allow_freetext: boolean;  // 자유 텍스트 입력 허용
  is_custom_text?: boolean; // customText 전용 섹션 (Subject)
  media_type?: string;      // "video" = 비디오 전용 (Motion)
  placeholder?: string;     // freetext placeholder 텍스트
}
```

**9개 섹션**: Style → Subject → Action → Environment → Camera → Focus → Motion(video) → Lighting → Texture

---

## 🔄 데이터 파이프라인

### 변환 흐름

```
Excel (prompt_master.xlsx)
    ↓
Python Script (scripts/convert_excel.py)
    ↓
├── data/csv/{sheet}.csv          # 디버그용 CSV
├── src/data/raw/{sheet}.json     # 원본 JSON
└── src/data/normalized/          # 정규화 JSON
    ├── fields.json
    ├── options.json
    ├── params.json
    ├── blocks.json
    ├── meta.json
    ├── structure_sections.json
    └── row_counts.json
```

### 변환 규칙

1. **원본 보존**: `*_raw` 필드에 원본값 저장
2. **정규화**: trim, clean 처리된 값을 기본 필드에 저장
3. **빈 값**: `""` 빈 문자열로 통일
4. **자동 생성**: `default_generated: true` 플래그 설정

### 실행 명령

```bash
npm run convert:data
# 또는
python scripts/convert_excel.py
```

---

## 🧩 컴포넌트 구조

### 계층 구조

```
App (page.tsx) — 단일 레이아웃, 5패널 + ResizeHandle
├── TopNavigation
│   ├── Logo
│   ├── GlobalSearch
│   ├── DarkModeToggle
│   └── ModelSelector
│
├── [상단 3컬럼]
│   ├── CategoryNavPanel (좌측 — 카테고리 내비, 캐릭터모드 토글)
│   ├── TokenSelectionPanel | RefCodePanel (중앙 — 옵션 칩 or 참조코드)
│   └── ParamsPanel (우측)
│       ├── TabSelector (MJ 이미지 | SD | 구조화 자연어)
│       ├── [MJ 이미지]
│       │   ├── AspectRatio (비율 칩)
│       │   ├── Aesthetics (Stylize, Weirdness, Variety, StyleVer, Exploration, Quality)
│       │   └── Model (Standard/Raw, Standard/Draft, Version 드롭다운)
│       ├── [Stable Diffusion]
│       │   └── NegativePrompt
│       └── [구조화 자연어]
│           └── StructuredPanel
│               └── StructuredSectionRow[] (9개 섹션, 칩토큰 + freetext)
│
└── [하단 2컬럼]
    ├── PromptStructurePanel (좌 — 토큰 순서/가중치 DnD)
    └── PromptOutputBar (우 — 프롬프트 출력/편집/복사/내보내기/프리셋)
```

### 컴포넌트 원칙

1. **Props로 데이터 전달**: 컴포넌트는 데이터를 props나 store에서 받음
2. **렌더링만 담당**: 데이터 가공은 store/utils에서 처리
3. **재사용 가능**: 동일 컴포넌트로 다양한 데이터 표시

---

## 🗃️ 상태 관리 (Zustand)

### Store 구조

```typescript
interface PromptStudioState {
  // Navigation
  activeTab: TabType;
  selectedModelId: string;
  paramsActiveTab: 'mj-image' | 'stable-diffusion' | 'structured';
  selectedCategoryId: string | null;
  selectedGroupId: string | null;

  // Data (from JSON)
  fields: Field[];
  options: Option[];
  blocks: Block[];
  params: Param[];
  meta: Meta;

  // Current Prompt
  tokens: PromptToken[];
  promptParams: Record<string, any>;
  customText: string;
  structuredTexts: Record<string, string>;
  categoryTexts: Record<string, string>;

  // UI State
  searchQuery: string;
  expandedCategories: string[];

  // Presets
  presets: Preset[];

  // Lab
  labSlots: LabSlot[];
  activeLabSlot: 'A' | 'B' | 'C';

  // Actions
  addToken: (option: Option, isNegative?: boolean) => void;
  removeToken: (tokenId: string, isNegative?: boolean) => void;
  updateTokenWeight: (tokenId: string, weight: number) => void;
  reorderTokens: (tokens: PromptToken[], isNegative?: boolean) => void;
  // ...
}
```

### 영속성

- LocalStorage에 저장 (Zustand persist): `presets`, `localRefCodes`
- 새로고침 시 복원됨
- `promptParams`, `tokens` 등은 세션 한정 (새로고침 시 초기화)

---

## 🔍 디버그 페이지

### 검증 항목

| 검증 | 설명 |
|-----|------|
| orphan_category | options.category_id가 fields에 없음 |
| empty_label | 빈 라벨 |
| empty_value | 빈 값 |
| duplicate | 같은 카테고리 내 중복 값 |
| missing_options | 옵션이 없는 필드 |

### 접근 방법

1. 앱 헤더의 "Debug" 링크 클릭
2. 또는 `/debug` 경로 직접 접근

### 품질 기준

- **모든 에러가 0이어야** UI 확장 진행
- 워닝은 경고 수준으로 허용

---

## 🛠️ 개발 워크플로우

### 새 옵션 추가

1. `data/prompt_master.xlsx` 수정
2. `npm run convert:data` 실행
3. `/debug`에서 에러 확인
4. 앱에서 확인

### 새 모델 추가

1. `scripts/convert_excel.py`의 `create_blocks()` 함수 수정
2. capabilities 정의 추가
3. `npm run convert:data` 실행

### 새 파라미터 추가

1. `scripts/convert_excel.py`의 `create_meta()` 함수 수정
2. `src/types/index.ts` 타입 업데이트
3. `ParamsPanel.tsx`에 UI 추가

---

## 📦 기술 스택

| 분야 | 기술 |
|-----|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| State | Zustand |
| DnD | @dnd-kit |
| Icons | Lucide React |
| Data | Python (openpyxl, pandas) |

---

## 🚀 배포

```bash
# 빌드
npm run build

# 실행
npm run start
```

환경변수 필요 없음 (정적 JSON 데이터 사용)

---

## 📍 현재 상태 (2026-03-25)

### 구현 완료

| 기능 | 설명 |
|-----|------|
| 토큰 선택 | 카테고리/옵션 칩, 이미지 프리뷰, 검색 필터 |
| Group 규칙 | single/max2/max3/multi, mutex_group 강제 적용 |
| 파라미터 패널 | 탭 기반 (MJ이미지/SD/구조화 자연어), Aesthetics·Model 섹션, 새 파라미터(weird/raw/sv/exp/q/draft) |
| 구조화 자연어 | ParamsPanel 3번째 탭, 9개 섹션(Style~Texture)별 칩+freetext, structure_sections.json 매핑, 섹션별 freetext 삭제 |
| RefCode 패널 | --sref / --p 저장·토글 (JSON + localStorage), MAX_CODES → meta.json, 중복 코드 입력 방지 |
| 자동 추천 | suggestions.json 규칙 기반, dismiss 가능 |
| 최종 프롬프트 | getFullPromptText() → 복사/TXT/JSON 내보내기 |
| 다크모드 | flash 없는 SSR 구현 (layout.tsx 인라인 스크립트) |
| 데이터 검증 | /debug 페이지 |
| 글로벌 검색 | TopNavigation 검색 → 전체 옵션 드롭다운, 경로 표시 |
| 캐릭터 모드 | CategoryNavPanel 토글 → 5개 구조화 필드 (identity/ethnicity/role/feature/outfit) |
| 편집 가능 프롬프트 | PromptOutputBar에서 직접 수정, 수정 표시·리셋 |
| 프리셋 UI | PromptOutputBar Bookmark 드롭다운 — 저장/불러오기/삭제, Portal 렌더링 |

### 미구현 / 보류

| 기능 | 현황 |
|-----|------|
| Lab UI | `labSlots` A/B/C store 완비 → 모달/드로어 등 UI 방식 추후 검토 |

### 지원 AI 모델 (blocks.json)

- **이미지**: Midjourney v8, v7, v6.1, v6, v5.2, Niji v7, Niji 6, Niji 5, Niji 4, Stable Diffusion (10개)
- **영상**: Midjourney Video, Runway Gen-3, Kling AI, Sora, Veo (5개)

### 관련 문서

- `TODO.md` — 작업 현황 및 우선순위
- `DECISIONS.md` — 아키텍처 결정 기록 (ADR)
