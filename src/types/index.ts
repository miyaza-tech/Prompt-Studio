// =========================================
// Prompt Studio - Type Definitions
// =========================================
// All types are derived from JSON data schema
// Do NOT hardcode any values

// Prompt format types (determines output syntax)
export type PromptFormat = 'midjourney' | 'stable_diffusion' | 'natural';

// Reference code entry (--sref, --p, image link 통합)
export interface RefCodeEntry {
  id: string;
  srefCodes: string[];     // --sref codes (up to 3, e.g., ["1234567890", "9876543210"])
  pCodes: string[];        // --p codes (up to 3)
  imageUrl: string;        // image link for preview (optional)
  label: string;           // user-given name
  sw: number;              // --sw value (0-1000, default 100)
  version: string;         // --v version (e.g., "7", "6.1", "niji", or "" for default)
  isActive: boolean;       // currently active in prompt
  source: 'json' | 'local'; // 'json' = from refcodes.json (git), 'local' = browser localStorage
  createdAt: string;       // ISO timestamp
}

// Tab types (simplified)
export type TabType = 'prompt' | 'params' | 'lab';

// Field definition from fields.json
export interface Field {
  field_id: string;
  category_id: string;
  category: string;
  category_raw: string;
  label: string;
  label_raw: string;
  description: string;
  input_type: string;
  sort_order: number;
  default_generated: boolean;
}

// Option definition from options.json
export interface Option {
  option_id: string;
  category_id: string;
  category_name: string;
  category_name_raw: string;
  value: string;
  value_raw: string;
  label: string;
  label_raw: string;
  label_en: string;
  label_ko: string;
  group: string;
  group_key: string;
  description: string;
  sort_order: number;
  default_generated: boolean;
  media_type: 'image' | 'video' | 'all';
  image_url?: string;  // Optional preview image URL
  token_key?: string;
}

// Group definition from groups.json
export interface Group {
  category: string;
  category_key: string;
  group: string;
  group_key: string;
  group_display_name: string;
  category_sort_order: number;
  group_sort_order: number;
  selection_mode: 'single' | 'multi' | 'max2' | 'max3';
  mutex_group: string;
  output_joiner: string;
}

// Navigation section for left panel
export interface NavSection {
  section: string;
  categories: string[];
}

// Parameter definition from params.json
export interface Param {
  param_id: string;
  param_name: string;
  param_name_raw: string;
  description: string;
  sort_order: number;
  default_generated: boolean;
}

// Model/Block capabilities
export interface BlockCapabilities {
  aspect_ratio?: boolean;
  stylize?: boolean;
  chaos?: boolean;
  sref?: boolean;
  cref?: boolean;
  oref?: boolean;
  iw?: boolean;
  tile?: boolean;
  no?: boolean;
  draft?: boolean;
  stealth?: boolean;
  profile?: boolean;
  version?: boolean;
  fps?: boolean;
  duration?: boolean;
  motion?: boolean;
  loop?: boolean;
  camera_movement?: boolean;
  steps?: boolean;
  cfg_scale?: boolean;
  style?: boolean;
  guidance?: boolean;
  weird?: boolean;
  raw?: boolean;
  sv?: boolean;
  exp?: boolean;
  q?: boolean;
}

// Model/Block definition from blocks.json
export interface Block {
  block_id: string;
  label: string;
  prompt_format: PromptFormat;
  version?: string;
  capabilities: BlockCapabilities;
  param_defaults: Record<string, any>;
  sort_order: number;
}

// Prompt token (selected option)
export interface PromptToken {
  id: string;
  option_id: string;
  category_id: string;
  value: string;
  label: string;
  weight: number; // 0-2 range
  is_negative: boolean;
  sort_order: number;
}

// Parameter value
export interface ParamValue {
  param_id: string;
  value: string | number | boolean;
}

// Prompt state
export interface PromptState {
  tokens: PromptToken[];
  params: Record<string, any>;
  customText: string;
}

// Preset
export interface Preset {
  id: string;
  name: string;
  promptFormat: PromptFormat;
  modelId: string;
  tokens: PromptToken[];
  params: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Lab slot
export interface LabSlot {
  id: 'A' | 'B' | 'C';
  name: string;
  prompt: PromptState;
  modelId: string;
  isActive: boolean;
}

// Export structure
export interface PromptExport {
  promptFormat: PromptFormat;
  modelId: string;
  tokens: PromptToken[];
  params: Record<string, any>;
  promptText: string;
  timestamp: string;
}

// Validation types for debug
export interface ValidationError {
  type: 'empty_label' | 'empty_value' | 'duplicate' | 'orphan_category' | 'missing_field';
  category_id: string;
  option_id?: string;
  value?: string;
  message: string;
}

export interface ValidationReport {
  errors: ValidationError[];
  warnings: ValidationError[];
  row_counts: {
    raw: Record<string, number>;
    normalized: Record<string, number>;
  };
  default_generated: {
    fields: number;
    options: number;
  };
}

// Meta data types
export interface AspectRatio {
  value: string;
  label: string;
}

export interface RangeConfig {
  min: number;
  max: number;
  default?: number;
  step?: number;
  unit?: string;
}

export interface VersionOption {
  value: string;
  label: string;
}

export interface Meta {
  aspect_ratios: AspectRatio[];
  stylize_range: RangeConfig;
  chaos_range: RangeConfig;
  fps_options: number[];
  duration_range: RangeConfig;
  motion_range: RangeConfig;
  versions: VersionOption[];
  image_weight_range: RangeConfig;
  style_weight_range: RangeConfig;
  character_weight_range: RangeConfig;
  weird_range?: RangeConfig;
  exp_range?: RangeConfig;
  default_negative_prompts: string[];
}

// Suggestion rule types
export interface SuggestionTrigger {
  category: string;
  token_value: string;
}

export interface SuggestionItem {
  category: string;
  token_values: string[];
  reason: string;
}

export interface SuggestionRule {
  id: string;
  name: string;
  trigger: SuggestionTrigger;
  suggest: SuggestionItem[];
  priority: number;
}

export interface ResolvedSuggestion {
  option: Option;
  reason: string;
  ruleName: string;
  priority: number;
}

// Structure section definition from structure_sections.json
export interface StructureSection {
  section_id: string;
  label: string;
  sort_order: number;
  category_ids: string[];
  allow_freetext: boolean;
  is_custom_text?: boolean;
  media_type?: 'image' | 'video' | 'all';
  placeholder?: string;
}

// Data file structures
export interface FieldsData {
  fields: Field[];
  count: number;
}

export interface OptionsData {
  options: Option[];
  count: number;
}

export interface ParamsData {
  params: Param[];
  count: number;
}

export interface BlocksData {
  blocks: Block[];
  count: number;
}
