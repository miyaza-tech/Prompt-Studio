'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePromptStore } from '@/store/promptStore';
import {
  Copy,
  Download,
  FileJson,
  Check,
  RotateCcw,
  Bookmark,
  Trash2,
  Upload,
} from 'lucide-react';
import type { PromptExport } from '@/types';

/**
 * PromptOutputBar — 하단 우측 프롬프트 출력 패널
 *
 * 조합된 프롬프트 텍스트 미리보기 + 직접 편집 + 복사 + 내보내기.
 */
export default function PromptOutputBar() {
  const {
    tokens,
    getFullPromptText,
    getStructuredPromptText,
    getPromptText,
    getSelectedModel,
    selectedModelId,
    promptParams,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
  } = usePromptStore();

  const [copySuccess, setCopySuccess] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null); // null = 동기화 상태
  const prevGeneratedRef = useRef<string>('');

  // Preset UI state
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);
  const presetBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const isStructuredTab = usePromptStore((s) => s.paramsActiveTab === 'structured');
  const generatedPrompt = isStructuredTab ? getStructuredPromptText() : getFullPromptText();

  // 토큰/파라미터가 바뀌면 수정 내용을 자동으로 업데이트 — 단, 사용자가 직접 수정 중이면 유지
  useEffect(() => {
    if (generatedPrompt !== prevGeneratedRef.current) {
      prevGeneratedRef.current = generatedPrompt;
      setEditedText(null); // 자동 생성 내용으로 리셋
    }
  }, [generatedPrompt]);

  const displayText = editedText !== null ? editedText : generatedPrompt;
  const isEdited = editedText !== null && editedText !== generatedPrompt;
  const model = getSelectedModel();

  const handleReset = () => setEditedText(null);

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!presetOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        presetRef.current && !presetRef.current.contains(target) &&
        presetBtnRef.current && !presetBtnRef.current.contains(target)
      ) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [presetOpen]);

  const togglePresetDropdown = () => {
    if (!presetOpen && presetBtnRef.current) {
      const rect = presetBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.top - 4, // 버튼 위로
        left: rect.right - 256, // w-64 = 256px, 오른쪽 정렬
      });
    }
    setPresetOpen(!presetOpen);
  };

  const handleSavePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    savePreset(trimmed);
    setPresetName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
    setPresetOpen(false);
  };

  // Copy to clipboard with fallback
  const handleCopy = useCallback(async () => {
    if (!displayText) return;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(displayText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API failed:', err);
      }
    }

    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = displayText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  }, [displayText]);

  // Export TXT
  const handleExportTxt = () => {
    const blob = new Blob([displayText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON
  const handleExportJson = () => {
    const exportData: PromptExport = {
      promptFormat: model?.prompt_format || 'midjourney',
      modelId: selectedModelId,
      tokens,
      params: promptParams,
      promptText: displayText,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-border bg-card px-3 py-2 h-full flex flex-col">
      {/* Top row: label + actions */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">프롬프트 출력</span>
        {isEdited && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
            수정됨
          </span>
        )}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isEdited && (
            <button
              onClick={handleReset}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="자동 생성 내용으로 되돌리기"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={!displayText}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : displayText
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            title="복사"
          >
            {copySuccess ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copySuccess ? '복사됨!' : '복사'}
          </button>
          <button
            onClick={handleExportTxt}
            disabled={!displayText}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-30"
            title="TXT 내보내기"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportJson}
            disabled={!displayText}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-30"
            title="JSON 내보내기"
          >
            <FileJson className="w-3.5 h-3.5" />
          </button>

          {/* Preset button + dropdown */}
          <div className="relative">
            <button
              ref={presetBtnRef}
              onClick={togglePresetDropdown}
              className={`p-1 rounded transition-colors ${
                presetOpen
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="프리셋"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Preset dropdown portal */}
      {presetOpen && createPortal(
        <div
          ref={presetRef}
          className="fixed w-64 bg-popover border border-border rounded-lg shadow-lg"
          style={{ zIndex: 9999, top: dropdownPos.top, left: dropdownPos.left, transform: 'translateY(-100%)' }}
        >
          {/* Save section */}
          <div className="p-2 border-b border-border">
            <div className="flex gap-1">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                placeholder="프리셋 이름 입력"
                className="flex-1 min-w-0 text-xs px-2 py-1 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  saveSuccess
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : presetName.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {saveSuccess ? '저장됨!' : '저장'}
              </button>
            </div>
          </div>

          {/* Preset list */}
          <div className="max-h-48 overflow-y-auto">
            {presets.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                저장된 프리셋이 없습니다
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted/50 group"
                >
                  <button
                    onClick={() => handleLoadPreset(preset.id)}
                    className="flex-1 min-w-0 text-left"
                    title={`불러오기: ${preset.name}`}
                  >
                    <div className="text-xs font-medium text-foreground truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {preset.tokens.length}개 토큰 · {new Date(preset.updatedAt).toLocaleDateString('ko-KR')}
                    </div>
                  </button>
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Editable prompt textarea */}
      <textarea
        value={displayText}
        onChange={(e) => setEditedText(e.target.value)}
        placeholder="토큰을 선택하면 프롬프트가 여기에 표시됩니다"
        className="
          text-sm leading-relaxed flex-1 min-h-[40px] resize-none rounded-md p-2
          bg-background border border-border text-foreground/80
          focus:outline-none focus:ring-1 focus:ring-primary/50
          placeholder:text-muted-foreground placeholder:italic placeholder:text-xs
        "
        spellCheck={false}
      />
    </div>
  );
}
