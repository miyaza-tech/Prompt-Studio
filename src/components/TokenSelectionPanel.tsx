'use client';

import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { usePromptStore } from '@/store/promptStore';
import { Sparkles, X as XIcon } from 'lucide-react';
import type { Option, Group } from '@/types';

/**
 * TokenSelectionPanel — 가운데 토큰 선택 패널
 *
 * 선택된 카테고리의 토큰(옵션)들을 그룹별로 표시.
 * 마우스 오버 시 이미지 프리뷰 + 설명 툴팁 유지.
 * selection_mode 안내 표시.
 */
export default function TokenSelectionPanel() {
  const {
    fields,
    options,
    groups,
    tokens,
    addToken,
    removeToken,
    selectedCategoryId,
    getSuggestions,
    dismissSuggestion,
  } = usePromptStore();

  // Hover state for image preview
  const [hoveredOption, setHoveredOption] = useState<Option | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((e: React.MouseEvent, option: Option) => {
    if (option.image_url) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setHoveredOption(option);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredOption(null);
  }, []);

  // Current field / category info
  const currentField = useMemo(() => {
    if (!selectedCategoryId) return null;
    return fields.find((f) => f.category_id === selectedCategoryId);
  }, [selectedCategoryId, fields]);

  // Groups for the selected category
  const categoryGroups = useMemo(() => {
    if (!currentField) return [];
    return groups
      .filter((g) => g.category === currentField.label)
      .sort((a, b) => a.group_sort_order - b.group_sort_order);
  }, [currentField, groups]);

  // Options for the selected category, organized by group
  const groupedOptions = useMemo(() => {
    if (!currentField) return [];

    const result: {
      group: Group;
      options: Option[];
    }[] = [];

    for (const grp of categoryGroups) {
      let grpOpts = options.filter(
        (o) => o.category_id === currentField.category_id && o.group === grp.group
      );

      // Sort by sort_order
      grpOpts = grpOpts.sort((a, b) => a.sort_order - b.sort_order);

      if (grpOpts.length > 0) {
        result.push({ group: grp, options: grpOpts });
      }
    }

    // If no groups matched, show ungrouped options
    if (result.length === 0 && categoryGroups.length === 0) {
      const ungrouped = options
        .filter((o) => o.category_id === currentField.category_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (ungrouped.length > 0) {
        result.push({
          group: {
            category: currentField.label,
            category_key: currentField.category_id,
            group: 'default',
            group_key: 'default',
            group_display_name: 'default',
            category_sort_order: currentField.sort_order,
            group_sort_order: 0,
            selection_mode: 'multi',
            mutex_group: '',
            output_joiner: ', ',
          },
          options: ungrouped,
        });
      }
    }

    return result;
  }, [currentField, categoryGroups, options]);

  const handleOptionClick = (option: Option) => {
    const isSelected = tokens.some((t) => t.option_id === option.option_id);
    if (isSelected) {
      const token = tokens.find((t) => t.option_id === option.option_id);
      if (token) {
        removeToken(token.id);
      }
    } else {
      addToken(option);
    }
  };

  // Selection mode label
  const getSelectionModeLabel = (mode: string) => {
    switch (mode) {
      case 'single': return '1개만 선택 가능';
      case 'max2': return '최대 2개 선택';
      case 'max3': return '최대 3개 선택';
      default: return '';
    }
  };

  // Count selected in a group
  const getGroupSelectionCount = (grp: Group) => {
    return tokens.filter((t) => {
      const opt = options.find((o) => o.option_id === t.option_id);
      return opt && opt.category_name === grp.category && opt.group === grp.group;
    }).length;
  };

  if (!currentField) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <p>좌측에서 카테고리를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Image Preview Tooltip (image only) */}
      {hoveredOption && hoveredOption.image_url && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="rounded-lg shadow-lg overflow-hidden bg-black" style={{ width: '140px', height: '140px', position: 'relative' }}>
            <Image
              src={hoveredOption.image_url}
              alt={hoveredOption.label_en || hoveredOption.value}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Header: Category Name */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{currentField.label}</h2>
          <span className="text-xs text-muted-foreground">
            {options.filter((o) => o.category_id === currentField.category_id).length}개 옵션
          </span>
        </div>
      </div>

      {/* Suggestions banner - pinned above scrollable area */}
      {(() => {
        const allSuggestions = getSuggestions();
        const catSuggestions = currentField
          ? allSuggestions.filter((s) => s.option.category_id === currentField.category_id)
          : [];
        const crossSuggestions = currentField
          ? allSuggestions.filter((s) => s.option.category_id !== currentField.category_id).slice(0, 6)
          : allSuggestions.slice(0, 6);
        const hasSuggestions = catSuggestions.length > 0 || crossSuggestions.length > 0;

        if (!hasSuggestions) return null;

        return (
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border space-y-2 max-h-[40%] overflow-y-auto">
            {/* Current category suggestions */}
            {catSuggestions.length > 0 && (
              <div className="rounded-lg border border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">추천</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {catSuggestions.map((s) => (
                    <span key={s.option.option_id} className="inline-flex items-center gap-1">
                      <button
                        onClick={() => addToken(s.option)}
                        title={s.option.description || s.reason}
                        className="px-2.5 py-1 rounded text-xs border border-purple-300 dark:border-purple-500/40 bg-white dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {s.option.label_en || s.option.value}
                          {s.option.label_ko && (
                            <span className="opacity-70">{s.option.label_ko}</span>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={() => dismissSuggestion(s.option.option_id)}
                        className="p-0.5 text-purple-400 hover:text-purple-600 rounded"
                        title="추천 숨기기"
                      >
                        <XIcon className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Cross-category suggestions */}
            {crossSuggestions.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">다른 카테고리 추천</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {crossSuggestions.map((s) => {
                    const catField = fields.find((f) => f.category_id === s.option.category_id);
                    return (
                      <span key={s.option.option_id} className="inline-flex items-center gap-1">
                        <button
                          onClick={() => addToken(s.option)}
                          title={s.option.description || `${catField?.label || ''}: ${s.reason}`}
                          className="px-2.5 py-1 rounded text-xs border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                        >
                          <span className="flex items-center gap-1">
                            <span className="text-[9px] opacity-60">{catField?.label}</span>
                            {s.option.label_en || s.option.value}
                            {s.option.label_ko && (
                              <span className="opacity-70">{s.option.label_ko}</span>
                            )}
                          </span>
                        </button>
                        <button
                          onClick={() => dismissSuggestion(s.option.option_id)}
                          className="p-0.5 text-amber-400 hover:text-amber-600 rounded"
                          title="추천 숨기기"
                        >
                          <XIcon className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Options grouped by group */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {groupedOptions.map(({ group: grp, options: grpOpts }) => {
            const showGroupHeader = grp.group_display_name !== 'default';
            const modeLabel = getSelectionModeLabel(grp.selection_mode);
            const selCount = getGroupSelectionCount(grp);

            return (
              <div key={`${grp.category_key}_${grp.group}`}>
                {/* Group header */}
                {showGroupHeader && (
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {grp.group_display_name}
                    </h3>
                    {modeLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {modeLabel}
                      </span>
                    )}
                    {selCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        {selCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Option chips - each with description below */}
                <div className="space-y-1">
                  {grpOpts.map((option) => {
                    const isSelected = tokens.some(
                      (t) => t.option_id === option.option_id
                    );
                    const displayText = option.label_en || option.value;
                    const hasImage = !!option.image_url;

                    return (
                      <div key={option.option_id} className="flex items-start gap-2">
                        <button
                          onClick={() => handleOptionClick(option)}
                          onMouseEnter={(e) => handleMouseEnter(e, option)}
                          onMouseLeave={handleMouseLeave}
                          title={option.description || undefined}
                          className={`
                            shrink-0 px-3 py-1.5 rounded text-sm border transition-all
                            ${isSelected
                              ? 'bg-gray-400 border-gray-400 text-white dark:bg-[#d4d4d4] dark:border-[#d4d4d4] dark:text-[#1e1e1e]'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 dark:bg-[#2d2d30]/50 dark:border-[#2d2d30] dark:text-[#d4d4d4] dark:hover:bg-[#3c3c3c]/50'
                            }
                          `}
                        >
                          <span className="flex items-center gap-1">
                            {displayText}
                            {option.label_ko && (
                              <span className={`text-xs ${isSelected ? 'opacity-70' : 'text-muted-foreground'}`}>
                                {option.label_ko}
                              </span>
                            )}
                            {hasImage && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400/60" title="이미지 미리보기" />
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {groupedOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              옵션이 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

