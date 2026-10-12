'use client';

import { useState, type CSSProperties } from 'react';
import { Sparkles, Settings, Loader2, X as XIcon, Eye, EyeOff, Trash2 } from 'lucide-react';
import { usePromptStore } from '@/store/promptStore';
import {
  autoCompose,
  getKeyFormatError,
  CLAUDE_MODEL_SUGGESTIONS,
  OPENAI_MODEL_SUGGESTIONS,
  type AiProvider,
} from '@/lib/autoCompose';

const PROVIDER_LABEL: Record<AiProvider, string> = { claude: 'Claude', openai: 'GPT' };

/**
 * AutoCompose — 커스텀 텍스트 아래 "AI 자동 구성" 버튼
 *
 * 장면 묘사를 AI에 보내 어울리는 옵션을 골라 선택 상태를 교체한다.
 */
export default function AutoCompose({ text }: { text: string }) {
  const { options, groups, aiSettings, addToken } = usePromptStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const activeKey = aiSettings.provider === 'claude' ? aiSettings.claudeKey : aiSettings.openaiKey;
  const activeModel = aiSettings.provider === 'claude' ? aiSettings.claudeModel : aiSettings.openaiModel;

  const handleCompose = async () => {
    if (!activeKey || getKeyFormatError(aiSettings.provider, activeKey)) {
      setSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await autoCompose(aiSettings, text.trim(), options, groups);
      if (result.options.length === 0) {
        setError('어울리는 옵션을 찾지 못했습니다. 문장을 조금 더 구체적으로 써 보세요.');
        return;
      }
      // Replace the current selection (custom text and params are kept)
      usePromptStore.setState({ tokens: [] });
      for (const option of result.options) addToken(option);
      setSummary(`${result.summary} (${usePromptStore.getState().tokens.length}개 선택)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        <button
          onClick={handleCompose}
          disabled={loading || !text.trim()}
          title={text.trim() ? `${PROVIDER_LABEL[aiSettings.provider]} (${activeModel})로 옵션 자동 구성` : '먼저 장면을 입력하세요'}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? '구성 중...' : 'AI 자동 구성'}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="AI 설정"
          className="px-1.5 rounded border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {error && <p className="mt-1 text-[10px] leading-snug text-red-500">{error}</p>}
      {summary && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{summary}</p>}

      {settingsOpen && <AiSettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function AiSettingsDialog({ onClose }: { onClose: () => void }) {
  const { aiSettings, setAiSettings } = usePromptStore();
  const [showKey, setShowKey] = useState(false);
  const isClaude = aiSettings.provider === 'claude';
  const currentKey = isClaude ? aiSettings.claudeKey : aiSettings.openaiKey;
  const keyFormatError = getKeyFormatError(aiSettings.provider, currentKey);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50" onMouseDown={onClose}>
      <div
        className="w-[360px] max-w-[calc(100vw-32px)] rounded-lg border border-border bg-background p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">AI 자동 구성 설정</h2>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="닫기">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <label className="text-[11px] text-muted-foreground block mb-1">사용할 AI</label>
        <div className="flex mb-3">
          {(['claude', 'openai'] as const).map((p, i) => (
            <button
              key={p}
              onClick={() => setAiSettings({ provider: p })}
              className={`flex-1 px-3 py-1.5 text-xs font-medium border transition-colors
                ${i === 0 ? 'rounded-l' : 'rounded-r -ml-px'}
                ${aiSettings.provider === p
                  ? 'bg-primary/20 border-primary text-primary relative z-10'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
            >
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-muted-foreground block mb-1">
          {isClaude ? 'Anthropic API 키' : 'OpenAI API 키'}
        </label>
        <div className="flex gap-1 mb-1">
          {/* type="text" + CSS masking: browsers ignore autocomplete="off" on password
              fields and may autofill a saved site password, which would then be sent as the key */}
          <input
            type="text"
            name={isClaude ? 'ps-anthropic-key' : 'ps-openai-key'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
            value={currentKey}
            onChange={(e) => setAiSettings(isClaude ? { claudeKey: e.target.value.trim() } : { openaiKey: e.target.value.trim() })}
            placeholder={isClaude ? 'sk-ant-...' : 'sk-...'}
            style={showKey ? undefined : ({ WebkitTextSecurity: 'disc' } as CSSProperties)}
            className="flex-1 min-w-0 px-2 py-1.5 rounded border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            title={showKey ? '키 가리기' : '키 보기'}
            className="px-1.5 rounded border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setAiSettings(isClaude ? { claudeKey: '' } : { openaiKey: '' })}
            disabled={!currentKey}
            title="키 지우기"
            className="px-1.5 rounded border border-border text-muted-foreground hover:text-red-500 hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {keyFormatError
          ? <p className="mb-3 text-[10px] text-red-500">{keyFormatError}</p>
          : <div className="mb-3" />}

        <label className="text-[11px] text-muted-foreground block mb-1">모델</label>
        <input
          list={isClaude ? 'claude-models' : 'openai-models'}
          value={isClaude ? aiSettings.claudeModel : aiSettings.openaiModel}
          onChange={(e) => setAiSettings(isClaude ? { claudeModel: e.target.value.trim() } : { openaiModel: e.target.value.trim() })}
          className="w-full mb-3 px-2 py-1.5 rounded border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <datalist id="claude-models">
          {CLAUDE_MODEL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
        </datalist>
        <datalist id="openai-models">
          {OPENAI_MODEL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
        </datalist>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          키는 이 브라우저에만 저장되며, 요청은 브라우저에서 {isClaude ? 'Anthropic' : 'OpenAI'} API로 직접 전송됩니다.
          두 AI의 키를 모두 넣어두고 위에서 골라 쓸 수 있습니다.
        </p>
      </div>
    </div>
  );
}
