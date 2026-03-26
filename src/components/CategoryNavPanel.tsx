'use client';

import { useMemo, useEffect } from 'react';
import { Type, User, Palette } from 'lucide-react';
import { usePromptStore } from '@/store/promptStore';

// Special category ID for reference codes
export const REFCODE_CATEGORY_ID = '__refcode__';

/**
 * CategoryNavPanel — 좌측 패널
 *
 * 상단: 커스텀 텍스트 입력 (일반 모드 / 캐릭터 모드 토글)
 * 하단: nav_sections 기반 카테고리 네비게이션 + 참조 코드
 */
export default function CategoryNavPanel() {
  const {
    fields,
    navSections,
    tokens,
    options,
    selectedCategoryId,
    setSelectedCategoryId,
    refCodes,
    customText,
    setCustomText,
    characterMode,
    setCharacterMode,
    characterFields,
    setCharacterField,
  } = usePromptStore();

  // Count selected tokens per category
  const tokenCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tokens) {
      const opt = options.find((o) => o.option_id === t.option_id);
      if (opt) {
        counts[opt.category_id] = (counts[opt.category_id] || 0) + 1;
      }
    }
    return counts;
  }, [tokens, options]);

  // Map category name → field for lookup
  const fieldByLabel = useMemo(() => {
    const map = new Map<string, typeof fields[0]>();
    for (const f of fields) {
      map.set(f.label, f);
    }
    return map;
  }, [fields]);

  // Auto-select first category on mount
  useEffect(() => {
    if (!selectedCategoryId && navSections.length > 0) {
      const firstCat = navSections[0]?.categories?.[0];
      if (firstCat) {
        const field = fieldByLabel.get(firstCat);
        if (field) {
          setSelectedCategoryId(field.category_id);
        }
      }
    }
  }, [selectedCategoryId, navSections, fieldByLabel, setSelectedCategoryId]);

  // Active reference codes count
  const activeCount = useMemo(() => refCodes.filter((c) => c.isActive).length, [refCodes]);

  return (
    <div className="flex flex-col h-full">
      {/* Custom Text Input — pinned at top */}
      <div className="shrink-0 px-3 py-2 border-b border-border">
        {/* Header + toggle */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {characterMode
              ? <User className="w-3 h-3 text-primary" />
              : <Type className="w-3 h-3 text-muted-foreground" />
            }
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {characterMode ? '캐릭터 모드' : '커스텀 텍스트'}
            </span>
          </div>
          <button
            onClick={() => setCharacterMode(!characterMode)}
            title={characterMode ? '일반 텍스트로 전환' : '캐릭터 모드로 전환'}
            className={`
              text-[10px] px-2 py-0.5 rounded border transition-colors
              ${characterMode
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border text-muted-foreground hover:bg-muted/50'
              }
            `}
          >
            {characterMode ? '일반' : '캐릭터'}
          </button>
        </div>

        {characterMode ? (
          /* Character mode: 5 structured fields */
          <div className="space-y-1.5">
            {([
              { key: 'identity', label: '정체성', placeholder: '30대 중반의 지친 모습' },
              { key: 'ethnicity', label: '인종', placeholder: '아시아인' },
              { key: 'role', label: '역할', placeholder: '추방당한 왕족의 대역' },
              { key: 'feature', label: '특징', placeholder: '은빛 동공이 있는 검게 문신된 눈' },
              { key: 'outfit', label: '복장', placeholder: '감시 장치 패치가 덧대어진 낡은 가죽 코트' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-0.5">
                  {label}
                </label>
                <textarea
                  value={characterFields[key]}
                  onChange={(e) => setCharacterField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  className="
                    w-full px-2 py-1 rounded border border-border
                    text-xs resize-none bg-background
                    focus:outline-none focus:ring-1 focus:ring-primary/50
                    placeholder:text-muted-foreground/50
                    leading-snug
                  "
                />
              </div>
            ))}
          </div>
        ) : (
          /* Default mode: single textarea */
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="직접 입력할 프롬프트..."
            className="
              w-full p-2 rounded border border-border
              text-xs resize-none bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/50
              placeholder:text-muted-foreground
            "
            rows={2}
          />
        )}
      </div>

      {/* Category Navigation — scrollable */}
      <nav className="flex-1 flex flex-col py-2 overflow-y-auto min-h-0">
      {navSections.map((section, sectionIdx) => (
        <div key={section.section}>
          {/* Section divider (skip first) */}
          {sectionIdx > 0 && (
            <div className="mx-3 my-1 border-t border-border" />
          )}

          {/* Section label */}
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              {section.section}
            </span>
          </div>

          {/* Category buttons */}
          {section.categories.map((catName) => {
            const field = fieldByLabel.get(catName);
            if (!field) return null;

            const isActive = selectedCategoryId === field.category_id;
            const count = tokenCountByCategory[field.category_id] || 0;

            return (
              <button
                key={field.category_id}
                onClick={() => setSelectedCategoryId(field.category_id)}
                className={`
                  w-full text-left px-3 py-1.5 text-sm transition-colors
                  flex items-center justify-between gap-1
                  ${isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent'
                  }
                `}
              >
                <span className="truncate">{catName}</span>
                {count > 0 && (
                  <span
                    className={`
                      text-[10px] min-w-[18px] h-[18px] rounded-full
                      flex items-center justify-center
                      ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Reference Code Section (--sref + --p 통합) */}
      <div>
        <div className="mx-3 my-1 border-t border-border" />
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
            참조 코드
          </span>
        </div>

        <button
          onClick={() => setSelectedCategoryId(REFCODE_CATEGORY_ID)}
          className={`
            w-full text-left px-3 py-1.5 text-sm transition-colors
            flex items-center justify-between gap-1
            ${selectedCategoryId === REFCODE_CATEGORY_ID
              ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent'
            }
          `}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Palette className="w-3.5 h-3.5 shrink-0" />
            참조 코드
          </span>
          {activeCount > 0 && (
            <span
              className={`
                text-[10px] min-w-[18px] h-[18px] rounded-full
                flex items-center justify-center
                ${selectedCategoryId === REFCODE_CATEGORY_ID
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>
    </nav>
    </div>
  );
}
