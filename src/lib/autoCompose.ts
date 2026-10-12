import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Group, Option } from '@/types';

/**
 * autoCompose — 커스텀 텍스트(장면 묘사)를 읽고 어울리는 옵션을 AI가 골라준다.
 *
 * 키는 사용자의 브라우저에만 저장되고, 브라우저에서 각 사의 API로 직접 호출한다.
 * 옵션 ID는 토큰 절약/오타 방지를 위해 짧은 별칭(o1, o2, ...)으로 보내고 돌려받는다.
 * AI에 보내는 목록은 영어 이름만 담는다 (화면 표시는 그대로 한글 포함).
 */

export type AiProvider = 'claude' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  claudeKey: string;
  claudeModel: string;
  openaiKey: string;
  openaiModel: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'claude',
  claudeKey: '',
  claudeModel: 'claude-opus-5-5',
  openaiKey: '',
  openaiModel: 'gpt-5.5',
};

export const CLAUDE_MODEL_SUGGESTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
export const OPENAI_MODEL_SUGGESTIONS = ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4-mini', 'gpt-6.1-sol'];

/**
 * Reject values that don't look like an API key — e.g. a site password the
 * browser autofilled — so they are never sent to the provider.
 */
export function getKeyFormatError(provider: AiProvider, key: string): string | null {
  if (!key) return null;
  if (provider === 'claude' && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) {
    return 'Anthropic API 키 형식이 아닙니다 (sk-ant-로 시작). 브라우저가 저장된 비밀번호를 채웠을 수 있으니 지우고 다시 입력해 주세요.';
  }
  if (provider === 'openai' && !/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) {
    return 'OpenAI API 키 형식이 아닙니다 (sk-로 시작). 브라우저가 저장된 비밀번호를 채웠을 수 있으니 지우고 다시 입력해 주세요.';
  }
  return null;
}

export interface AutoComposeResult {
  options: Option[];
  summary: string;
}

const SELECTION_LABEL: Record<Group['selection_mode'], string> = {
  single: 'pick at most 1',
  max2: 'pick at most 2',
  max3: 'pick at most 3',
  multi: 'multiple allowed',
};

const SYSTEM_PROMPT = `You help users of an AI image/video prompt builder turn a scene description into a coherent set of builder options.

The user writes a scene description, usually in Korean. Read it for what it shows (subject, place, season, time of day, weather, mood) and what it implies visually (genre, framing, composition, camera angle, lens, lighting, color, film look). Then choose options from the catalog that together would produce that image.

How to choose:
- The catalog lists options by their English name. Use only option IDs that appear in it (they look like "o123").
- Respect each group's limit shown in brackets, e.g. [pick at most 1].
- Skip categories that don't fit the scene. If the description has no people, leave out pose, expression, and character-related options. Leave out camera-movement and other video-only options unless the description implies motion or video.
- Prefer a consistent look over many loosely related picks: everything you choose should agree with the same mood, era, and lighting. Typically 8 to 20 options in total.
- Pick what the description implies even when it isn't stated outright, e.g. a road curving toward low mountains suggests leading lines or a vanishing-point composition and a wide or landscape framing.

In "summary", explain the overall direction in one or two short Korean sentences (for example the genre, composition, and light you went for). Don't list every option.`;

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    selected_option_ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Catalog option IDs, e.g. "o12"',
    },
    summary: {
      type: 'string',
      description: 'One or two Korean sentences describing the chosen direction',
    },
  },
  required: ['selected_option_ids', 'summary'],
  additionalProperties: false,
} as const;

/** Build the option catalog text plus a lookup from short alias to option. */
export function buildCatalog(options: Option[], groups: Group[]) {
  const aliasToOption = new Map<string, Option>();
  const groupOf = (o: Option) =>
    groups.find((g) => g.category === o.category_name && g.group === o.group);

  // category -> group -> options, keeping catalog order stable so the prompt caches
  const byCategory = new Map<string, Map<string, Option[]>>();
  for (const o of options) {
    if (!byCategory.has(o.category_name)) byCategory.set(o.category_name, new Map());
    const groupsMap = byCategory.get(o.category_name)!;
    if (!groupsMap.has(o.group)) groupsMap.set(o.group, []);
    groupsMap.get(o.group)!.push(o);
  }

  // The AI only sees English names (the UI still shows Korean); repeated
  // names within a category get their Korean label so they stay distinguishable
  const nameOf = (o: Option) => o.label_en || o.value;
  const nameCount = new Map<string, number>();
  for (const o of options) {
    const key = `${o.category_name}::${nameOf(o).toLowerCase()}`;
    nameCount.set(key, (nameCount.get(key) || 0) + 1);
  }

  let n = 0;
  const lines: string[] = [];
  for (const [category, groupsMap] of byCategory) {
    lines.push(`## ${category}`);
    for (const [groupName, opts] of groupsMap) {
      const grp = groupOf(opts[0]);
      const display = grp?.group_display_name || groupName;
      const showName = display.toLowerCase() !== 'default' && !display.endsWith('_default');
      const limit = SELECTION_LABEL[grp?.selection_mode ?? 'multi'];
      lines.push(`### ${showName ? display : '(general)'} [${limit}]`);
      for (const o of [...opts].sort((a, b) => a.sort_order - b.sort_order)) {
        const alias = `o${++n}`;
        aliasToOption.set(alias, o);
        const isDuplicate = (nameCount.get(`${o.category_name}::${nameOf(o).toLowerCase()}`) || 0) > 1;
        const hint = isDuplicate && o.label_ko ? ` (${o.label_ko})` : '';
        const media = o.media_type === 'video' ? ' (video)' : '';
        lines.push(`${alias} | ${nameOf(o)}${hint}${media}`);
      }
    }
  }
  return { catalogText: lines.join('\n'), aliasToOption };
}

interface RawResult {
  selected_option_ids: string[];
  summary: string;
}

async function callClaude(settings: AiSettings, catalogText: string, text: string): Promise<RawResult> {
  const client = new Anthropic({ apiKey: settings.claudeKey, dangerouslyAllowBrowser: true });
  try {
    const response = await client.beta.messages.create({
      model: settings.claudeModel,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        // Picking from a list doesn't need deep reasoning; low keeps thinking tokens down
        effort: 'low',
        format: { type: 'json_schema', schema: RESULT_SCHEMA },
      },
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        // Catalog never changes between calls — cache it for an hour so occasional use still hits
        { type: 'text', text: `# Option catalog\n${catalogText}`, cache_control: { type: 'ephemeral', ttl: '1h' } },
      ],
      messages: [{ role: 'user', content: `Scene description:\n${text}` }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude가 이 요청을 거절했습니다. 문장을 바꿔서 다시 시도해 주세요.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('응답이 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.');
    }
    const textBlock = response.content.find(
      (b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text',
    );
    if (!textBlock) throw new Error('Claude 응답에 결과가 없습니다.');
    return JSON.parse(textBlock.text) as RawResult;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('Claude API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.');
    } else if (error instanceof Anthropic.NotFoundError) {
      throw new Error(`Claude 모델 "${settings.claudeModel}"을(를) 찾을 수 없습니다. 설정에서 모델명을 확인해 주세요.`);
    } else if (error instanceof Anthropic.RateLimitError) {
      throw new Error('Claude 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    } else if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API 오류 (${error.status ?? '네트워크'}): ${error.message}`);
    }
    throw error;
  }
}

async function callOpenAI(settings: AiSettings, catalogText: string, text: string): Promise<RawResult> {
  const client = new OpenAI({ apiKey: settings.openaiKey, dangerouslyAllowBrowser: true });
  try {
    const response = await client.responses.create({
      model: settings.openaiModel,
      instructions: `${SYSTEM_PROMPT}\n\n# Option catalog\n${catalogText}`,
      input: `Scene description:\n${text}`,
      text: {
        format: { type: 'json_schema', name: 'auto_compose', schema: { ...RESULT_SCHEMA }, strict: true },
      },
    });
    if (!response.output_text) throw new Error('GPT 응답에 결과가 없습니다.');
    return JSON.parse(response.output_text) as RawResult;
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      throw new Error('OpenAI API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.');
    } else if (error instanceof OpenAI.NotFoundError) {
      throw new Error(`GPT 모델 "${settings.openaiModel}"을(를) 찾을 수 없습니다. 설정에서 모델명을 확인해 주세요.`);
    } else if (error instanceof OpenAI.RateLimitError) {
      throw new Error('OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    } else if (error instanceof OpenAI.APIConnectionError) {
      // OpenAI omits CORS headers on 401s, so a wrong key surfaces as a connection error in the browser
      throw new Error('OpenAI에 연결하지 못했습니다. API 키가 틀렸을 때도 이렇게 표시되니, 먼저 설정에서 키를 확인해 주세요.');
    } else if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API 오류 (${error.status ?? '네트워크'}): ${error.message}`);
    }
    throw error;
  }
}

export async function autoCompose(
  settings: AiSettings,
  text: string,
  options: Option[],
  groups: Group[],
): Promise<AutoComposeResult> {
  const key = settings.provider === 'claude' ? settings.claudeKey : settings.openaiKey;
  const keyError = getKeyFormatError(settings.provider, key);
  if (keyError) throw new Error(keyError);

  const { catalogText, aliasToOption } = buildCatalog(options, groups);
  const raw =
    settings.provider === 'claude'
      ? await callClaude(settings, catalogText, text)
      : await callOpenAI(settings, catalogText, text);

  // Drop anything that isn't in the catalog
  const picked = (raw.selected_option_ids || [])
    .map((id) => aliasToOption.get(id.trim()))
    .filter((o): o is Option => !!o);
  return { options: picked, summary: raw.summary || '' };
}
