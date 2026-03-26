# TODO.md - 작업 현황 및 계획

마지막 업데이트: 2026-03-25

---

## ✅ 완료된 기능

- [x] 카테고리/옵션 토큰 선택 시스템
- [x] 토큰 가중치 조절 (0.0 ~ 2.0)
- [x] DnD 토큰 재정렬 (@dnd-kit)
- [x] 이미지 프리뷰 + 설명 툴팁 (마우스 오버)
- [x] Group 선택 규칙 (single / max2 / max3 / multi, mutex_group)
- [x] 자동 추천 시스템 (suggestions.json 기반)
- [x] 파라미터 패널 (--ar, --s, --c, 영상 모델 fps/duration 등)
- [x] 파라미터 패널 리디자인 (탭 기반 MJ이미지/SD, Aesthetics·Model 섹션, 새 파라미터 weird/raw/sv/exp/q/draft)
- [x] 참조코드(RefCode) 패널 (--sref, --p, 활성/비활성 토글)
- [x] 최종 프롬프트 생성 (getFullPromptText)
- [x] 클립보드 복사 + TXT/JSON 내보내기
- [x] 프리셋 저장/로드/삭제 (store 로직 완비, localStorage)
- [x] Lab 슬롯 A/B/C (store 로직 완비)
- [x] 다크모드 (flash 없는 SSR 구현)
- [x] 패널 드래그 리사이징 (ResizeHandle)
- [x] 데이터 검증 디버그 페이지 (/debug)
- [x] Excel → JSON 변환 파이프라인 (convert_excel.py)
- [x] 글로벌 검색 (TopNavigation → 전체 옵션 드롭다운, 경로 표시)
- [x] 캐릭터 모드 (CategoryNavPanel 5개 구조화 필드 토글)
- [x] 편집 가능 프롬프트 (PromptOutputBar 직접 수정, 수정 표시·리셋)
- [x] 모델 선택 UI (ParamsPanel Version 드롭다운 + Standard/Raw/Draft 토글)
- [x] MJ 모델 확장 (v8, Niji v7/6/5/4 추가)
- [x] 구조화 자연어 탭 (ParamsPanel 3번째 탭, 9개 섹션별 칩+freetext, structure_sections.json)
- [x] 구조화 자연어 freetext 섹션별 삭제 (전체 초기화 → 개별 X 버튼으로 변경)
- [x] 하드코딩 제거: getSectionPlaceholder → structure_sections.json placeholder 필드
- [x] 하드코딩 제거: MAX_CODES → meta.json max_ref_codes

---

## 🔴 구현 필요 (High Priority)

### ~~1. Tab 시스템 연결~~ → ❌ 폐기
- ParamsPanel 내부 탭(MJ/SD/자연어)으로 충분, 페이지 전체 레이아웃 전환 불필요
- `activeTab` store 상태는 유지하되 UI에서 사용하지 않음

### ~~2. Presets UI~~ → ✅ 완료
- `PromptOutputBar`에 Bookmark 버튼 + 드롭다운 UI 추가
- 이름 입력 → 저장, 프리셋 목록 → 불러오기/삭제 구현
- localStorage 영속성 (Zustand persist) 활용

### ~~3. Lab 탭 UI~~ → 추후 검토
- **현황**: `labSlots` A/B/C 상태, `copyToLabSlot` 함수 완비, UI 없음
- 페이지 전체 탭 전환 폐기에 따라 모달/드로어 등 대안 방식으로 추후 설계

---

## 🟡 개선 필요 (Medium Priority)

### 4. 이미지/비디오 모델 필터링
- 현재 `ModelSelector`에서 모든 모델이 표시됨
- `blocks.json`의 `media_type` 필드를 활용해 image/video 모델 구분 표시
- 탭 전환 방식 폐기로, 드롭다운 내 그룹핑 또는 라벨로 구분하는 방식 검토

### 5. 하드코딩 제거
| 위치 | 항목 | 이동 대상 |
|------|------|-----------|
| ~~`ParamsPanel.tsx`~~ | ~~`FORMAT_GROUPS` (3개 형식 그룹)~~ | ~~`meta.json`~~ → 탭 기반 UI로 대체됨 |
| ~~`RefCodePanel.tsx`~~ | ~~`MAX_CODES = 3`~~ | ~~`meta.json`~~ → ✅ 완료 |
| ~~`ParamsPanel.tsx`~~ | ~~`getSectionPlaceholder()` 하드코딩~~ | ~~`structure_sections.json`~~ → ✅ 완료 |

### ~~6. RefCode 중복 입력 방지~~ → ✅ 완료
- `addRefCode`에서 sref+p 코드 조합 중복 검사, UI에 경고 메시지 표시

---

## 🟢 개선하면 좋은 것 (Low Priority)

### 7. ~~모델 선택 UI~~ → ✅ 완료
- ~~현재 TopNavigation에 모델 전환 UI 없음~~
- ParamsPanel Model 섹션에 Version 드롭다운 + Standard/Raw/Draft 토글 구현됨

### 8. 키보드 단축키
- `Ctrl+C`: 프롬프트 복사
- `Ctrl+Z`: 마지막 토큰 취소
- `Ctrl+S`: 현재 상태를 프리셋으로 저장

### 9. 토큰 즐겨찾기
- 자주 쓰는 옵션 핀 고정 기능

### 10. 프롬프트 히스토리
- 최근 생성한 프롬프트 N개 저장 (localStorage)

---

## 🐛 알려진 문제

| ID | 심각도 | 설명 | 상태 |
|----|--------|------|------|
| ~~BUG-01~~ | ~~높음~~ | ~~Presets 저장 후 불러올 UI 없음~~ | ✅ 해결 (PromptOutputBar 프리셋 드롭다운) |
| ~~BUG-02~~ | ~~중간~~ | ~~activeTab 변경해도 레이아웃 변화 없음~~ | 폐기 (Tab 시스템 제거) |
| ~~BUG-03~~ | ~~낮음~~ | ~~RefCode: 동일 코드 중복 입력 허용됨~~ | ✅ 해결 (addRefCode 중복 검사) |

---

## 📝 작업 메모

- `promptStore.ts`는 변경 시 `src/types/index.ts`와 항상 함께 확인
- 새 컴포넌트 추가 시 `page.tsx`의 ResizeHandle 레이아웃 영향 검토 필요
- Lab/Presets UI는 기존 store 로직을 그대로 쓰면 되므로 UI 작업만 필요
- Tab 시스템(Prompt/Params/Lab 페이지 전환)은 ParamsPanel 내부 탭으로 대체 → 폘기됨
