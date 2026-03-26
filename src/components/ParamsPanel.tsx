'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePromptStore } from '@/store/promptStore';
import { ChevronDown, X } from 'lucide-react';
import type { Block, StructureSection } from '@/types';

const MJ_IMAGE_IDS = ['midjourney_v8', 'midjourney', 'midjourney_v6_1', 'midjourney_v6', 'midjourney_v5_2', 'midjourney_niji_v7', 'midjourney_niji_v6', 'midjourney_niji_v5', 'midjourney_niji_v4'];

const PANEL_TABS = [
  { id: 'mj-image' as const, label: 'MJ', defaultModel: 'midjourney_v8' },
  { id: 'stable-diffusion' as const, label: 'SD', defaultModel: 'stable_diffusion' },
  { id: 'structured' as const, label: '자연어', defaultModel: null },
];

type PanelTabId = 'mj-image' | 'stable-diffusion' | 'structured';

const SV_OPTIONS = [1, 2, 3, 4];
const QUALITY_OPTIONS = [
  { value: 0.25, label: '.25' },
  { value: 0.5, label: '.5' },
  { value: 1, label: '1' },
];

export default function ParamsPanel() {
  const {
    selectedModelId,
    setSelectedModelId,
    blocks,
    meta,
    promptParams,
    setParam,
    resetParams,
    getSelectedModel,
    structureSections,
    structuredTexts,
    setStructuredText,
    tokens,
    options,
    customText,
    characterMode,
    characterFields,
    paramsActiveTab,
    setParamsActiveTab,
  } = usePromptStore();

  const model = getSelectedModel();

  const activeTab = paramsActiveTab;

  const handleTabClick = (tabId: PanelTabId) => {
    const tab = PANEL_TABS.find((t) => t.id === tabId);
    if (!tab) return;
    setParamsActiveTab(tabId);
    if (tabId !== 'structured' && tab.defaultModel) {
      setSelectedModelId(tab.defaultModel);
    }
  };

  const mjImageBlocks = useMemo(
    () =>
      blocks
        .filter((b: Block) => MJ_IMAGE_IDS.includes(b.block_id))
        .sort((a: Block, b: Block) => a.sort_order - b.sort_order),
    [blocks]
  );

  return (
    <div className="flex flex-col h-full">
      {/* ?? Tab selector ?? */}
      <div className="flex border-b border-border shrink-0">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex-1 px-1 py-2 text-[11px] font-medium transition-colors truncate
              ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">파라미터</span>
          {activeTab !== 'structured' && (
            <button
              onClick={resetParams}
              className="px-2 py-1 text-[11px] border border-border rounded hover:bg-muted transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        {/* Midjourney 이미지 */}
        {activeTab === 'mj-image' && (
          <div className="space-y-4">
            {/* Aspect Ratio */}
            <ParamSection title="Aspect Ratio">
              <div className="flex flex-wrap gap-1.5">
                {meta.aspect_ratios.map((ar) => {
                  const [w, h] = ar.value.split(':').map(Number);
                  const maxDim = 12;
                  const scale = maxDim / Math.max(w, h);
                  const iconW = Math.round(w * scale);
                  const iconH = Math.round(h * scale);
                  const isSelected = promptParams.ar === ar.value;
                  return (
                    <button
                      key={ar.value}
                      onClick={() => setParam('ar', ar.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded border text-xs font-medium transition-colors min-w-[40px]
                        ${isSelected
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                        }`}
                    >
                      <div
                        className={`rounded-[2px] border-[1.5px] ${isSelected ? 'border-primary' : 'border-muted-foreground/50'}`}
                        style={{ width: iconW, height: iconH }}
                      />
                      <span className="text-[10px] leading-none">{ar.label}</span>
                    </button>
                  );
                })}
              </div>
            </ParamSection>

            {/* Aesthetics */}
            <ParamSection title="Aesthetics">
              <div className="space-y-2.5">
                {/* Stylize */}
                <ParamRow label="Stylize (--s)">
                  <SliderInput
                    value={promptParams.stylize ?? meta.stylize_range.default ?? 100}
                    min={meta.stylize_range.min}
                    max={meta.stylize_range.max}
                    onChange={(v) => setParam('stylize', v)}
                  />
                </ParamRow>

                {/* Weirdness */}
                <ParamRow label="Weirdness (--w)">
                  <SliderInput
                    value={promptParams.weird ?? 0}
                    min={meta.weird_range?.min ?? 0}
                    max={meta.weird_range?.max ?? 3000}
                    onChange={(v) => setParam('weird', v)}
                  />
                </ParamRow>

                {/* Variety (Chaos) */}
                <ParamRow label="Variety (--c)">
                  <SliderInput
                    value={promptParams.chaos ?? meta.chaos_range.default ?? 0}
                    min={meta.chaos_range.min}
                    max={meta.chaos_range.max}
                    onChange={(v) => setParam('chaos', v)}
                  />
                </ParamRow>

                {/* Style Version — v7 only */}
                {model?.capabilities.sv && (
                  <ParamRow label="Style Ver (--sv)">
                    <div className="flex gap-1">
                      {SV_OPTIONS.map((sv) => (
                        <button
                          key={sv}
                          onClick={() => setParam('sv', promptParams.sv === sv ? null : sv)}
                          className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors
                            ${promptParams.sv === sv
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                            }`}
                        >
                          {sv}
                        </button>
                      ))}
                    </div>
                  </ParamRow>
                )}

                {/* Exploration — v7 only */}
                {model?.capabilities.exp && (
                  <ParamRow label="Exploration (--exp)">
                    <SliderInput
                      value={promptParams.exp ?? meta.exp_range?.default ?? 0}
                      min={meta.exp_range?.min ?? 0}
                      max={meta.exp_range?.max ?? 100}
                      onChange={(v) => setParam('exp', v)}
                    />
                  </ParamRow>
                )}

                {/* Quality */}
                <ParamRow label="Quality (--q)">
                  <div className="flex gap-1">
                    {QUALITY_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setParam('q', value)}
                        className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors
                          ${(promptParams.q ?? 1) === value
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </ParamRow>
              </div>
            </ParamSection>

            {/* Model */}
            <ParamSection title="Model">
              <div className="space-y-2.5">
                {/* Style: Standard / Raw */}
                <ParamRow label="Style">
                  <ToggleGroup
                    options={[
                      { value: false as boolean, label: 'Standard' },
                      { value: true as boolean, label: 'Raw' },
                    ]}
                    value={!!(promptParams.raw)}
                    onChange={(v) => setParam('raw', v)}
                  />
                </ParamRow>

                {/* Mode: Standard / Draft — v7 only */}
                {model?.capabilities.draft && (
                  <ParamRow label="Mode">
                    <ToggleGroup
                      options={[
                        { value: false as boolean, label: 'Standard' },
                        { value: true as boolean, label: 'Draft' },
                      ]}
                      value={!!(promptParams.draft)}
                      onChange={(v) => setParam('draft', v)}
                    />
                  </ParamRow>
                )}

                {/* Version dropdown */}
                <ParamRow label="Version">
                  <div className="relative">
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="w-full appearance-none pl-2 pr-6 py-1.5 rounded-md border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                    >
                      {mjImageBlocks.map((b: Block) => (
                        <option key={b.block_id} value={b.block_id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </ParamRow>
              </div>
            </ParamSection>
          </div>
        )}

        {/* Stable Diffusion */}
        {activeTab === 'stable-diffusion' && (
          <div className="space-y-4">
            <ParamSection title="Negative Prompt">
              <textarea
                value={promptParams.negative || ''}
                onChange={(e) => setParam('negative', e.target.value)}
                placeholder="low quality, blurry, watermark, text, deformed"
                className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                rows={4}
              />
            </ParamSection>
          </div>
        )}

        {/* Structured Natural Language */}
        {activeTab === 'structured' && (
          <StructuredPanel
            sections={structureSections}
            structuredTexts={structuredTexts}
            setStructuredText={setStructuredText}
            tokens={tokens}
            options={options}
            customText={customText}
            characterMode={characterMode}
            characterFields={characterFields}
          />
        )}
      </div>
    </div>
  );
}

// Sub-components

function ParamSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pb-3 border-b border-border/50 last:border-0">
      <h3 className="text-xs font-medium mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ParamRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-28 shrink-0 leading-tight">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

function SliderInput({ value, min, max, step = 1, onChange, suffix = '' }: SliderInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <span className="text-xs font-medium tabular-nums w-10 text-right">
        {value}{suffix}
      </span>
    </div>
  );
}

interface ToggleGroupProps {
  options: { value: boolean; label: string }[];
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleGroup({ options, value, onChange }: ToggleGroupProps) {
  return (
    <div className="flex">
      {options.map((opt, i) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium border transition-colors
            ${i === 0 ? 'rounded-l' : 'rounded-r -ml-px'}
            ${value === opt.value
              ? 'bg-primary/20 border-primary text-primary relative z-10'
              : 'bg-background border-border text-muted-foreground hover:bg-muted'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ========================================
// Structured Natural Language Panel
// ========================================

interface StructuredPanelProps {
  sections: StructureSection[];
  structuredTexts: Record<string, string>;
  setStructuredText: (sectionId: string, text: string) => void;
  tokens: import('@/types').PromptToken[];
  options: import('@/types').Option[];
  customText: string;
  characterMode: boolean;
  characterFields: { identity: string; ethnicity: string; role: string; feature: string; outfit: string };
}

function StructuredPanel({
  sections,
  structuredTexts,
  setStructuredText,
  tokens,
  options,
  customText,
  characterMode,
  characterFields,
}: StructuredPanelProps) {
  const optionMap = useMemo(
    () => new Map(options.map((o) => [o.option_id, o])),
    [options]
  );

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections]
  );

  // Collect tokens per section
  const tokensBySection = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const section of sorted) {
      const catSet = new Set(section.category_ids);
      const vals: string[] = [];
      for (const t of tokens) {
        if (catSet.has(t.category_id)) {
          const opt = optionMap.get(t.option_id);
          vals.push(opt?.label_en || opt?.value || t.value);
        }
      }
      map.set(section.section_id, vals);
    }
    return map;
  }, [sorted, tokens, optionMap]);

  return (
    <div className="space-y-3">
      {sorted.map((section) => {
        const chipTokens = tokensBySection.get(section.section_id) || [];
        let subjectText = '';
        if (section.is_custom_text) {
          if (characterMode) {
            const cf = characterFields;
            subjectText = [cf.identity, cf.ethnicity, cf.role, cf.feature, cf.outfit].filter(Boolean).join(', ');
          } else {
            subjectText = customText;
          }
        }
        return (
          <StructuredSectionRow
            key={section.section_id}
            section={section}
            chipTokens={chipTokens}
            subjectText={subjectText}
            freetext={structuredTexts[section.section_id] || ''}
            onFreetextChange={(text) => setStructuredText(section.section_id, text)}
            onClearFreetext={() => setStructuredText(section.section_id, '')}
          />
        );
      })}
    </div>
  );
}

interface StructuredSectionRowProps {
  section: StructureSection;
  chipTokens: string[];
  subjectText: string;
  freetext: string;
  onFreetextChange: (text: string) => void;
  onClearFreetext: () => void;
}

function StructuredSectionRow({
  section,
  chipTokens,
  subjectText,
  freetext,
  onFreetextChange,
  onClearFreetext,
}: StructuredSectionRowProps) {
  const hasChips = chipTokens.length > 0 || subjectText;

  return (
    <div className="pb-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] font-semibold text-primary">[{section.label}]</span>
        {section.media_type === 'video' && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">Video</span>
        )}
      </div>

      {/* Chip tokens (read-only) */}
      {hasChips && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {subjectText && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] border border-blue-500/20">
              {subjectText.length > 30 ? subjectText.slice(0, 30) + '...' : subjectText}
            </span>
          )}
          {chipTokens.map((val, i) => (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] border border-primary/20"
            >
              {val}
            </span>
          ))}
        </div>
      )}

      {/* Freetext input */}
      {section.allow_freetext && (
        <div className="flex gap-1 items-start">
          <textarea
            value={freetext}
            onChange={(e) => onFreetextChange(e.target.value)}
            placeholder={section.placeholder || 'Enter description...'}
            className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
            rows={2}
          />
          {freetext && (
            <button
              onClick={onClearFreetext}
              className="mt-1.5 p-0.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
              title="삭제"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

