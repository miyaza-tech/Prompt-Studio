'use client';

import { useMemo, useState } from 'react';
import { usePromptStore } from '@/store/promptStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type { PromptToken, Option } from '@/types';

/**
 * PromptStructurePanel — 우측 프롬프트 구조 패널
 *
 * 선택된 토큰을 카테고리별 블록으로 표시.
 * 카테고리 접기/펼치기, 토큰 드래그 앤 드롭 재정렬, 가중치 조절.
 * 빈 카테고리는 placeholder로 작게 표시.
 */
export default function PromptStructurePanel() {
  const {
    tokens,
    fields,
    options,
    navSections,
    removeToken,
    updateTokenWeight,
    reorderTokens,
    clearTokens,
    setSelectedCategoryId,
  } = usePromptStore();

  // Collapse state per category
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (categoryId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Map option_id → option for quick lookup
  const optionMap = useMemo(() => {
    const map = new Map<string, Option>();
    for (const o of options) {
      map.set(o.option_id, o);
    }
    return map;
  }, [options]);

  // Tokens grouped by category (following navSections order)
  const categorizedTokens = useMemo(() => {
    // Build category order from navSections + fields
    const categoryOrder: { categoryId: string; label: string; sortOrder: number }[] = [];
    const fieldMap = new Map(fields.map((f) => [f.label, f]));

    let orderIdx = 0;
    for (const section of navSections) {
      for (const catName of section.categories) {
        const field = fieldMap.get(catName);
        if (field) {
          categoryOrder.push({
            categoryId: field.category_id,
            label: field.label,
            sortOrder: orderIdx++,
          });
        }
      }
    }

    // Group tokens by category
    const tokensByCategory = new Map<string, PromptToken[]>();
    for (const t of tokens) {
      const list = tokensByCategory.get(t.category_id) || [];
      list.push(t);
      tokensByCategory.set(t.category_id, list);
    }

    // Build result with all categories (showing empty ones as placeholders)
    return categoryOrder.map((cat) => ({
      categoryId: cat.categoryId,
      label: cat.label,
      tokens: tokensByCategory.get(cat.categoryId) || [],
    }));
  }, [tokens, fields, navSections]);

  // Count total selected tokens
  const totalTokens = tokens.length;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tokens.findIndex((t) => t.id === active.id);
    const newIndex = tokens.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(tokens, oldIndex, newIndex);
      reorderTokens(newOrder);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">프롬프트 구조</h2>
            {totalTokens > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                {totalTokens}
              </span>
            )}
          </div>
          {totalTokens > 0 && (
            <button
              onClick={() => clearTokens()}
              className="p-1 text-muted-foreground hover:text-red-500 hover:bg-muted rounded transition-colors"
              title="전체 초기화"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category blocks */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tokens.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {categorizedTokens.map(({ categoryId, label, tokens: catTokens }) => {
              const isCollapsed = collapsed.has(categoryId);
              const hasTokens = catTokens.length > 0;

              if (!hasTokens) {
                // Empty placeholder — minimized
                return (
                  <button
                    key={categoryId}
                    onClick={() => setSelectedCategoryId(categoryId)}
                    className="w-full px-3 py-1 flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/30 transition-colors border-b border-border/50"
                  >
                    <span className="text-xs">{label}</span>
                    <span className="text-[10px]">+</span>
                  </button>
                );
              }

              return (
                <div key={categoryId} className="border-b border-border">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCollapse(categoryId)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                        {catTokens.length}
                      </span>
                    </div>
                  </button>

                  {/* Tokens list */}
                  {!isCollapsed && (
                    <div className="px-3 pb-2 space-y-1">
                      {catTokens.map((token) => (
                        <SortableTokenRow
                          key={token.id}
                          token={token}
                          option={optionMap.get(token.option_id)}
                          onRemove={() => removeToken(token.id)}
                          onWeightChange={(w) => updateTokenWeight(token.id, w)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </SortableContext>
        </DndContext>

        {totalTokens === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50 px-6 text-center gap-2">
            <p className="text-sm">토큰이 선택되지 않았습니다</p>
            <p className="text-xs">중앙 패널에서 옵션을 선택하면 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Sortable Token Row
// ============================================
interface SortableTokenRowProps {
  token: PromptToken;
  option?: Option;
  onRemove: () => void;
  onWeightChange: (weight: number) => void;
}

function SortableTokenRow({ token, option, onRemove, onWeightChange }: SortableTokenRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: token.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/10 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Token label */}
      <span className="text-sm flex-1 truncate" title={option?.description || token.label}>
        {token.label}
      </span>

      {/* Weight controls */}
      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onWeightChange(token.weight - 0.1)}
          className="p-0.5 text-muted-foreground hover:text-foreground rounded"
          disabled={token.weight <= 0}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-[10px] w-6 text-center tabular-nums font-mono">
          {token.weight.toFixed(1)}
        </span>
        <button
          onClick={() => onWeightChange(token.weight + 0.1)}
          className="p-0.5 text-muted-foreground hover:text-foreground rounded"
          disabled={token.weight >= 2}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-0.5 text-muted-foreground/50 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
