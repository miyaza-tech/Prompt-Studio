// =========================================
// Prompt Studio - Zustand Store
// =========================================
// State management for the entire application
// All data is derived from JSON - no hardcoding

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PromptFormat,
  TabType,
  PromptToken,
  PromptState,
  Preset,
  LabSlot,
  Field,
  Option,
  Block,
  Param,
  Meta,
  Group,
  NavSection,
  SuggestionRule,
  ResolvedSuggestion,
  RefCodeEntry,
  StructureSection,
} from '@/types';

// Import JSON data
import fieldsData from '@/data/normalized/fields.json';
import optionsData from '@/data/normalized/options.json';
import blocksData from '@/data/normalized/blocks.json';
import paramsData from '@/data/normalized/params.json';
import metaData from '@/data/normalized/meta.json';
import groupsData from '@/data/normalized/groups.json';
import suggestionsData from '@/data/normalized/suggestions.json';
import refcodesData from '@/data/normalized/refcodes.json';
import structureSectionsData from '@/data/normalized/structure_sections.json';

// Base reference codes from JSON (git-tracked)
const baseRefCodes: RefCodeEntry[] = (refcodesData.refCodes || []).map((rc: any) => ({
  ...rc,
  isActive: false,
  source: 'json' as const,
}));

// =========================================
// Store State Interface
// =========================================
interface PromptStudioState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Model Selection (prompt format based)
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;

  // Params panel active tab
  paramsActiveTab: 'mj-image' | 'stable-diffusion' | 'structured';
  setParamsActiveTab: (tab: 'mj-image' | 'stable-diffusion' | 'structured') => void;

  // Data (from JSON)
  fields: Field[];
  options: Option[];
  blocks: Block[];
  params: Param[];
  meta: Meta;
  groups: Group[];
  navSections: NavSection[];

  // Structure sections (from JSON)
  structureSections: StructureSection[];

  // Current prompt state
  tokens: PromptToken[];
  promptParams: Record<string, any>;
  customText: string;
  categoryTexts: Record<string, string>;
  structuredTexts: Record<string, string>;

  // Token actions
  addToken: (option: Option) => void;
  removeToken: (tokenId: string) => void;
  updateTokenWeight: (tokenId: string, weight: number) => void;
  reorderTokens: (tokens: PromptToken[]) => void;
  clearTokens: () => void;

  // Custom text
  setCustomText: (text: string) => void;
  setCategoryText: (categoryId: string, text: string) => void;

  // Structured text
  setStructuredText: (sectionId: string, text: string) => void;
  clearStructuredTexts: () => void;

  // Character mode
  characterMode: boolean;
  setCharacterMode: (enabled: boolean) => void;
  characterFields: {
    identity: string;
    ethnicity: string;
    role: string;
    feature: string;
    outfit: string;
  };
  setCharacterField: (field: keyof PromptStudioState['characterFields'], value: string) => void;

  // Params
  setParam: (paramId: string, value: any) => void;
  resetParams: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  expandedCategories: string[];
  toggleCategory: (categoryId: string) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (categoryId: string | null) => void;
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;

  // Presets
  presets: Preset[];
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;

  // Lab mode
  labSlots: LabSlot[];
  activeLabSlot: 'A' | 'B' | 'C';
  setActiveLabSlot: (slot: 'A' | 'B' | 'C') => void;
  copyToLabSlot: (targetSlot: 'A' | 'B' | 'C') => void;

  // Reference Codes (--sref + --p + image 통합)
  refCodes: RefCodeEntry[];         // merged: JSON base + localStorage local codes
  localRefCodes: RefCodeEntry[];    // localStorage only (persisted)
  addRefCode: (entry: Omit<RefCodeEntry, 'id' | 'createdAt' | 'isActive' | 'source'>) => boolean;
  removeRefCode: (id: string) => void;
  toggleRefCodeActive: (id: string) => void;
  updateRefCode: (id: string, updates: Partial<RefCodeEntry>) => void;
  exportRefCodesToClipboard: () => string;

  // Suggestions
  suggestionRules: SuggestionRule[];
  getSuggestions: () => ResolvedSuggestion[];
  dismissedSuggestions: Set<string>;
  dismissSuggestion: (optionId: string) => void;
  clearDismissedSuggestions: () => void;

  // Computed values
  getPromptText: () => string;
  getNegativePromptText: () => string;
  getFullPromptText: () => string;
  getStructuredPromptText: () => string;
  getSelectedModel: () => Block | undefined;
  getFilteredOptions: (categoryId: string) => Option[];
  getGroupedOptions: () => Map<string, Option[]>;
}

// =========================================
// Helper Functions
// =========================================
const generateId = () => Math.random().toString(36).substr(2, 9);

const createToken = (option: Option, isNegative: boolean, sortOrder: number): PromptToken => ({
  id: generateId(),
  option_id: option.option_id,
  category_id: option.category_id,
  value: option.label_en || option.value,
  label: option.label_en || option.value,
  weight: 1,
  is_negative: isNegative,
  sort_order: sortOrder,
});

// =========================================
// Store Implementation
// =========================================
export const usePromptStore = create<PromptStudioState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'prompt',
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      // Model Selection
      selectedModelId: 'midjourney_v8',
      setSelectedModelId: (id) => set({ selectedModelId: id }),

      paramsActiveTab: 'mj-image',
      setParamsActiveTab: (tab) => set({ paramsActiveTab: tab }),

      // Data from JSON
      fields: fieldsData.fields as Field[],
      options: optionsData.options as Option[],
      blocks: blocksData.blocks as unknown as Block[],
      params: paramsData.params as Param[],
      meta: metaData as Meta,
      groups: (groupsData as any).groups as Group[],
      navSections: (groupsData as any).nav_sections as NavSection[],
      structureSections: structureSectionsData.sections as StructureSection[],

      // Prompt state
      tokens: [],
      promptParams: {
        ar: '1:1',
        stylize: 100,
        chaos: 0,
      },
      customText: '',
      categoryTexts: {},
      structuredTexts: {},
      characterMode: false,
      characterFields: { identity: '', ethnicity: '', role: '', feature: '', outfit: '' },

      // Token actions
      addToken: (option) => {
        const state = get();
        
        // Check if already exists (duplicate prevention)
        if (state.tokens.some((t) => t.option_id === option.option_id)) {
          return;
        }

        // Find group rules for this option
        const group = state.groups.find(
          (g) => g.category === option.category_name && g.group === option.group
        );

        let updatedTokens = [...state.tokens];

        if (group) {
          // selection_mode enforcement
          if (group.selection_mode === 'single') {
            // Remove existing tokens from same group
            updatedTokens = updatedTokens.filter(
              (t) => {
                const tOpt = state.options.find((o) => o.option_id === t.option_id);
                return !(tOpt && tOpt.category_name === group.category && tOpt.group === group.group);
              }
            );
          } else if (group.selection_mode === 'max2') {
            const groupCount = updatedTokens.filter((t) => {
              const tOpt = state.options.find((o) => o.option_id === t.option_id);
              return tOpt && tOpt.category_name === group.category && tOpt.group === group.group;
            }).length;
            if (groupCount >= 2) return;
          } else if (group.selection_mode === 'max3') {
            const groupCount = updatedTokens.filter((t) => {
              const tOpt = state.options.find((o) => o.option_id === t.option_id);
              return tOpt && tOpt.category_name === group.category && tOpt.group === group.group;
            }).length;
            if (groupCount >= 3) return;
          }

          // mutex_group enforcement
          if (group.mutex_group) {
            const mutexGroups = state.groups.filter(
              (g) => g.mutex_group === group.mutex_group && g.group !== group.group
            );
            const mutexGroupNames = new Set(mutexGroups.map((g) => `${g.category}::${g.group}`));
            updatedTokens = updatedTokens.filter((t) => {
              const tOpt = state.options.find((o) => o.option_id === t.option_id);
              return !(tOpt && mutexGroupNames.has(`${tOpt.category_name}::${tOpt.group}`));
            });
          }
        }

        const newToken = createToken(option, false, updatedTokens.length);
        set({ tokens: [...updatedTokens, newToken] });
      },

      removeToken: (tokenId) => {
        const state = get();
        set({ tokens: state.tokens.filter((t) => t.id !== tokenId) });
      },

      updateTokenWeight: (tokenId, weight) => {
        const state = get();
        set({
          tokens: state.tokens.map((t) =>
            t.id === tokenId ? { ...t, weight: Math.max(0, Math.min(2, weight)) } : t
          ),
        });
      },

      reorderTokens: (tokens) => {
        set({ tokens });
      },

      clearTokens: () => {
        set({ 
          tokens: [],
          customText: '',
          categoryTexts: {},
          promptParams: {}
        });
      },

      // Custom text
      setCustomText: (text) => set({ customText: text }),
      setCategoryText: (categoryId, text) => {
        set((state) => ({
          categoryTexts: { ...state.categoryTexts, [categoryId]: text },
        }));
      },

      // Structured text
      setStructuredText: (sectionId, text) => {
        set((state) => ({
          structuredTexts: { ...state.structuredTexts, [sectionId]: text },
        }));
      },
      clearStructuredTexts: () => set({ structuredTexts: {} }),

      // Character mode
      setCharacterMode: (enabled) => set({ characterMode: enabled }),
      setCharacterField: (field, value) =>
        set((state) => ({
          characterFields: { ...state.characterFields, [field]: value },
        })),

      // Params
      setParam: (paramId, value) => {
        set((state) => ({
          promptParams: { ...state.promptParams, [paramId]: value },
        }));
      },

      resetParams: () => {
        const model = get().getSelectedModel();
        if (model) {
          set({ promptParams: { ...model.param_defaults } });
        }
      },

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      expandedCategories: [],
      toggleCategory: (categoryId) => {
        set((state) => {
          const isExpanded = state.expandedCategories.includes(categoryId);
          return {
            expandedCategories: isExpanded
              ? state.expandedCategories.filter((id) => id !== categoryId)
              : [...state.expandedCategories, categoryId],
          };
        });
      },
      selectedCategoryId: null,
      setSelectedCategoryId: (categoryId) => set({ selectedCategoryId: categoryId }),
      selectedGroupId: 'subject',
      setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),

      // Presets
      presets: [],
      savePreset: (name) => {
        const state = get();
        const model = state.getSelectedModel();
        const preset: Preset = {
          id: generateId(),
          name,
          promptFormat: model?.prompt_format || 'midjourney',
          modelId: state.selectedModelId,
          tokens: [...state.tokens],
          params: { ...state.promptParams },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ presets: [...state.presets, preset] });
      },

      loadPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (preset) {
          set({
            selectedModelId: preset.modelId,
            tokens: [...preset.tokens],
            promptParams: { ...preset.params },
          });
        }
      },

      deletePreset: (presetId) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== presetId),
        }));
      },

      // Lab mode
      labSlots: [
        { id: 'A', name: 'Prompt A', prompt: { tokens: [], params: {}, customText: '' }, modelId: 'midjourney', isActive: true },
        { id: 'B', name: 'Prompt B', prompt: { tokens: [], params: {}, customText: '' }, modelId: 'midjourney', isActive: false },
        { id: 'C', name: 'Prompt C', prompt: { tokens: [], params: {}, customText: '' }, modelId: 'midjourney', isActive: false },
      ],
      activeLabSlot: 'A',
      setActiveLabSlot: (slot) => set({ activeLabSlot: slot }),
      copyToLabSlot: (targetSlot) => {
        const state = get();
        const currentPrompt: PromptState = {
          tokens: [...state.tokens],
          params: { ...state.promptParams },
          customText: state.customText,
        };
        
        set({
          labSlots: state.labSlots.map((slot) =>
            slot.id === targetSlot
              ? { ...slot, prompt: currentPrompt, modelId: state.selectedModelId }
              : slot
          ),
        });
      },

      // Reference Codes (--sref + --p + image 통합)
      // Merged view: JSON base codes + localStorage local codes
      refCodes: [...baseRefCodes],
      localRefCodes: [],

      addRefCode: (entry) => {
        const state = get();
        // 중복 검사: 동일한 sref+p 코드 조합이 이미 존재하는지 확인
        const newSref = (entry.srefCodes || []).filter(Boolean).sort().join(',');
        const newP = (entry.pCodes || []).filter(Boolean).sort().join(',');
        const isDuplicate = state.refCodes.some((existing) => {
          const existSref = (existing.srefCodes || []).filter(Boolean).sort().join(',');
          const existP = (existing.pCodes || []).filter(Boolean).sort().join(',');
          return existSref === newSref && existP === newP;
        });
        if (isDuplicate) return false;

        const newEntry: RefCodeEntry = {
          ...entry,
          id: generateId(),
          isActive: false,
          source: 'local',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          localRefCodes: [...s.localRefCodes, newEntry],
          refCodes: [...baseRefCodes, ...s.localRefCodes, newEntry],
        }));
        return true;
      },

      removeRefCode: (id) => {
        set((state) => {
          const newLocal = state.localRefCodes.filter((c) => c.id !== id);
          return {
            localRefCodes: newLocal,
            refCodes: [...baseRefCodes, ...newLocal],
          };
        });
      },

      toggleRefCodeActive: (id) => {
        set((state) => {
          // Toggle in both base view and local store — base codes toggled via refCodes only (not persisted)
          const newRefCodes = state.refCodes.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          );
          const newLocal = state.localRefCodes.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          );
          return { refCodes: newRefCodes, localRefCodes: newLocal };
        });
      },

      updateRefCode: (id, updates) => {
        set((state) => {
          const newRefCodes = state.refCodes.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          );
          const newLocal = state.localRefCodes.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          );
          return { refCodes: newRefCodes, localRefCodes: newLocal };
        });
      },

      exportRefCodesToClipboard: () => {
        const state = get();
        // Export all codes (both json and local) as clean JSON for refcodes.json
        const exportData = state.refCodes.map(({ isActive, source, ...rest }) => rest);
        return JSON.stringify({ refCodes: exportData }, null, 2);
      },

      // Suggestions
      suggestionRules: (suggestionsData as any).rules as SuggestionRule[],
      dismissedSuggestions: new Set<string>(),
      dismissSuggestion: (optionId) => {
        set((state) => {
          const next = new Set(state.dismissedSuggestions);
          next.add(optionId);
          return { dismissedSuggestions: next };
        });
      },
      clearDismissedSuggestions: () => {
        set({ dismissedSuggestions: new Set<string>() });
      },
      getSuggestions: () => {
        const state = get();
        const { tokens, options, fields, suggestionRules, dismissedSuggestions } = state;
        
        // Build set of selected token values by category
        const selectedByCategory = new Map<string, Set<string>>();
        const selectedOptionIds = new Set(tokens.map((t) => t.option_id));
        
        for (const t of tokens) {
          const opt = options.find((o) => o.option_id === t.option_id);
          if (opt) {
            const catName = opt.category_name;
            if (!selectedByCategory.has(catName)) selectedByCategory.set(catName, new Set());
            selectedByCategory.get(catName)!.add(opt.label_en || opt.value);
          }
        }

        // Match rules
        const suggestions: ResolvedSuggestion[] = [];
        const addedOptionIds = new Set<string>();

        for (const rule of suggestionRules) {
          const triggerSet = selectedByCategory.get(rule.trigger.category);
          if (!triggerSet || !triggerSet.has(rule.trigger.token_value)) continue;

          // Rule matched — resolve suggestions
          for (const item of rule.suggest) {
            // Find matching field
            const field = fields.find((f) => f.label === item.category);
            if (!field) continue;

            for (const tokenValue of item.token_values) {
              // Find matching option
              const opt = options.find(
                (o) =>
                  o.category_id === field.category_id &&
                  (o.label_en === tokenValue || o.value === tokenValue)
              );
              if (!opt) continue;

              // Skip already selected, already suggested, or dismissed
              if (selectedOptionIds.has(opt.option_id)) continue;
              if (addedOptionIds.has(opt.option_id)) continue;
              if (dismissedSuggestions.has(opt.option_id)) continue;

              addedOptionIds.add(opt.option_id);
              suggestions.push({
                option: opt,
                reason: item.reason,
                ruleName: rule.name,
                priority: rule.priority,
              });
            }
          }
        }

        // Sort by priority descending
        suggestions.sort((a, b) => b.priority - a.priority);
        return suggestions;
      },

      // Computed values
      getPromptText: () => {
        const state = get();
        const optionMap = new Map(state.options.map((opt) => [opt.option_id, opt]));
        const tokenTexts = state.tokens.map((t) => {
          const option = optionMap.get(t.option_id);
          const tokenValue = option?.label_en || option?.value || t.value;
          if (t.weight !== 1) {
            return `(${tokenValue}:${t.weight.toFixed(1)})`;
          }
          return tokenValue;
        });
        
        const parts = [];

        // Character mode fields (쉼표로 이어붙이기, 빈 필드 무시)
        if (state.characterMode) {
          const cf = state.characterFields;
          const cfParts = [cf.identity, cf.ethnicity, cf.role, cf.feature, cf.outfit].filter(Boolean);
          if (cfParts.length > 0) parts.push(cfParts.join(', '));
        } else if (state.customText) {
          parts.push(state.customText);
        }

        parts.push(...tokenTexts);
        
        return parts.join(', ');
      },

      getNegativePromptText: () => {
        const state = get();
        return state.promptParams.negative || '';
      },

      getFullPromptText: () => {
        const state = get();
        const promptText = state.getPromptText();
        const negativeText = state.getNegativePromptText();
        const model = state.getSelectedModel();
        
        let result = promptText;
        
        // Add parameters based on model format
        if (model) {
          const params = state.promptParams;
          const format = model.prompt_format;
          
          if (format === 'midjourney' && model.block_id !== 'midjourney_video') {
            // Midjourney format: --ar, --s, --c, --v, etc.
            if (model.capabilities.no && negativeText) {
              result += ` --no ${negativeText}`;
            }
            
            if (model.capabilities.aspect_ratio && params.ar) {
              result += ` --ar ${params.ar}`;
            }
            
            if (model.capabilities.stylize && params.stylize !== undefined) {
              result += ` --s ${params.stylize}`;
            }
            
            if (model.capabilities.chaos && params.chaos) {
              result += ` --c ${params.chaos}`;
            }
            
            if (model.capabilities.weird && params.weird) {
              result += ` --weird ${params.weird}`;
            }
            
            if (model.capabilities.raw && params.raw) {
              result += ` --style raw`;
            }
            
            if (model.capabilities.sv && params.sv) {
              result += ` --sv ${params.sv}`;
            }
            
            if (model.capabilities.exp && params.exp) {
              result += ` --exp ${params.exp}`;
            }
            
            if (model.capabilities.q && params.q && params.q !== 1) {
              result += ` --q ${params.q}`;
            }
            
            if (model.capabilities.draft && params.draft) {
              result += ` --draft`;
            }
            
            // --sref: combine active sref codes from refCodes (deduplicated)
            const activeRefs = state.refCodes.filter((c) => c.isActive);
            const allSrefCodes = [...new Set(activeRefs.flatMap((c) => c.srefCodes).filter(Boolean))];
            if (allSrefCodes.length > 0) {
              result += ` --sref ${allSrefCodes.join(' ')}`;
              const swEntry = activeRefs.find((c) => c.srefCodes.length > 0 && c.sw !== 100);
              if (swEntry) {
                result += ` --sw ${swEntry.sw}`;
              }
            }

            // --p: combine active p codes from refCodes (deduplicated)
            const allPCodes = [...new Set(activeRefs.flatMap((c) => c.pCodes).filter(Boolean))];
            if (allPCodes.length > 0) {
              result += ` --p ${allPCodes.join(' ')}`;
            }
            
            if (model.capabilities.profile && params.profile) {
              result += ` --profile ${params.profile}`;
            }
            
            if (model.capabilities.tile && params.tile) {
              result += ` --tile`;
            }
            
            if (model.capabilities.fps && params.fps) {
              result += ` --fps ${params.fps}`;
            }
            
            if (model.capabilities.duration && params.duration) {
              result += ` --duration ${params.duration}`;
            }
            
            if (model.capabilities.motion && params.motion) {
              result += ` --motion ${params.motion}`;
            }
            
            if (model.capabilities.loop && params.loop) {
              result += ` --loop`;
            }
            
            // Version: prefer active refCode version, fallback to model.version from blocks.json
            const refVersion = activeRefs.find((c) => c.version)?.version;
            const effectiveVersion = refVersion || model.version || '';
            if (effectiveVersion) {
              if (effectiveVersion.startsWith('niji')) {
                result += ` --${effectiveVersion}`;
              } else if (effectiveVersion !== 'video') {
                result += ` --v ${effectiveVersion}`;
              }
            }
          } else if (format === 'stable_diffusion') {
            // Stable Diffusion: 파라미터는 프롬프트에 포함하지 않음 (UI에서 별도 설정)
            // 네거티브 프롬프트만 별도 표기
            if (negativeText) {
              result += `\n\nNegative prompt: ${negativeText}`;
            }
            // aspect ratio, steps, cfg_scale 등은 프롬프트가 아닌 설정값으로 사용
          } else if (format === 'natural') {
            // 자연어 형식 (Runway, Sora, Kling 등): 자연어로 파라미터 추가
            const naturalParts = [];
            
            if (model.capabilities.aspect_ratio && params.ar) {
              const arMap: Record<string, string> = {
                '1:1': 'square format',
                '16:9': 'widescreen 16:9 format',
                '9:16': 'vertical 9:16 format',
                '4:3': '4:3 format',
                '3:4': '3:4 portrait format',
                '21:9': 'ultrawide 21:9 cinematic format',
                '3:2': '3:2 format',
                '2:3': '2:3 portrait format',
              };
              const arText = arMap[params.ar] || `${params.ar} aspect ratio`;
              naturalParts.push(arText);
            }
            
            if (model.capabilities.duration && params.duration) {
              naturalParts.push(`${params.duration} seconds duration`);
            }
            
            if (model.capabilities.fps && params.fps) {
              naturalParts.push(`${params.fps} fps`);
            }
            
            if (model.capabilities.motion && params.motion) {
              const motionMap: Record<number, string> = {
                1: 'minimal motion',
                2: 'subtle motion',
                3: 'moderate motion',
                4: 'dynamic motion',
                5: 'intense motion',
              };
              const motionText = motionMap[params.motion] || `motion intensity ${params.motion}`;
              naturalParts.push(motionText);
            }
            
            if (model.capabilities.loop && params.loop) {
              naturalParts.push('seamless loop');
            }
            
            if (naturalParts.length > 0) {
              if (result.trim()) {
                result += `, ${naturalParts.join(', ')}`;
              } else {
                result = naturalParts.join(', ');
              }
            }
          }
        }
        
        return result;
      },

      getStructuredPromptText: () => {
        const state = get();
        const sections = state.structureSections
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order);
        const optionMap = new Map(state.options.map((opt) => [opt.option_id, opt]));

        const lines: string[] = [];

        for (const section of sections) {
          const parts: string[] = [];

          // Tokens that belong to this section's categories
          if (section.category_ids.length > 0) {
            const catSet = new Set(section.category_ids);
            const sectionTokens = state.tokens.filter((t) => catSet.has(t.category_id));
            for (const t of sectionTokens) {
              const option = optionMap.get(t.option_id);
              const val = option?.label_en || option?.value || t.value;
              if (t.weight !== 1) {
                parts.push(`(${val}:${t.weight.toFixed(1)})`);
              } else {
                parts.push(val);
              }
            }
          }

          // Custom text for Subject section
          if (section.is_custom_text) {
            if (state.characterMode) {
              const cf = state.characterFields;
              const cfParts = [cf.identity, cf.ethnicity, cf.role, cf.feature, cf.outfit].filter(Boolean);
              if (cfParts.length > 0) parts.unshift(cfParts.join(', '));
            } else if (state.customText) {
              parts.unshift(state.customText);
            }
          }

          // Free text input for this section
          const freetext = state.structuredTexts[section.section_id];
          if (freetext) {
            parts.push(freetext);
          }

          if (parts.length > 0) {
            lines.push(`[${section.label}] ${parts.join(', ')}`);
          }
        }

        return lines.join('\n');
      },

      getSelectedModel: () => {
        const state = get();
        const found = state.blocks.find((b) => b.block_id === state.selectedModelId);
        // Fallback: if selectedModelId doesn't match any block, use first block
        if (!found && state.blocks.length > 0) {
          return state.blocks[0];
        }
        return found;
      },

      getFilteredOptions: (categoryId) => {
        const state = get();
        let filtered = state.options.filter((o) => o.category_id === categoryId);
        
        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.label.toLowerCase().includes(query) ||
              o.value.toLowerCase().includes(query) ||
              o.label_ko?.toLowerCase().includes(query)
          );
        }
        
        return filtered.sort((a, b) => a.sort_order - b.sort_order);
      },

      getGroupedOptions: () => {
        const state = get();
        const grouped = new Map<string, Option[]>();
        
        for (const opt of state.options) {
          const key = opt.category_id;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(opt);
        }
        
        return grouped;
      },
    }),
    {
      name: 'prompt-studio-storage',
      version: 10,
      partialize: (state) => ({
        presets: state.presets,
        localRefCodes: state.localRefCodes,
      }),
      merge: (persistedState, currentState) => {
        // Merge persisted local codes with JSON base codes
        const persisted = persistedState as Partial<PromptStudioState> | undefined;
        // 접속 시 모든 참조코드 비활성화
        const local = (persisted?.localRefCodes || []).map((c: any) => ({ ...c, isActive: false }));
        return {
          ...currentState,
          ...persisted,
          localRefCodes: local,
          refCodes: [...baseRefCodes, ...local],
        };
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 6) {
          return {
            presets: persistedState?.presets || [],
            localRefCodes: [],
          };
        }
        // Normalize old refCodes → localRefCodes with source='local'
        const oldRefs = persistedState?.localRefCodes || persistedState?.refCodes || [];
        return {
          ...persistedState,
          localRefCodes: oldRefs.map((entry: any) => ({
            ...entry,
            srefCodes: Array.isArray(entry.srefCodes) ? entry.srefCodes : (entry.sref ? [entry.sref] : []),
            pCodes: Array.isArray(entry.pCodes) ? entry.pCodes : (entry.pCode ? [entry.pCode] : []),
            version: entry.version ?? '',
            source: 'local',
            isActive: false,
          })),
        };
      },
    }
  )
);

export default usePromptStore;
