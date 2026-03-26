'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Palette, ToggleLeft, ToggleRight, Download, Globe, HardDrive } from 'lucide-react';
import { usePromptStore } from '@/store/promptStore';
import metaData from '@/data/normalized/meta.json';

const VERSION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '기본 (파라미터 따름)' },
  ...(metaData.versions as { value: string; label: string }[]),
];

const MAX_CODES = (metaData as Record<string, unknown>).max_ref_codes as number || 3;
const EMPTY_CODES = Array.from({ length: MAX_CODES }, () => '');

/**
 * RefCodePanel — 참조 코드 관리 패널 (--sref + --p + image 통합)
 *
 * 입력 폼: sref 코드 ×3, p 코드 ×3, 이미지 링크, 라벨, --sw 입력 후 저장
 * 저장된 리스트: 활성/비활성 토글, 마우스 오버 시 이미지 프리뷰
 * 여러 코드를 조합하여 --sref code1 code2 --p p1 p2 형태로 출력
 */
export default function RefCodePanel() {
  const {
    refCodes,
    addRefCode,
    removeRefCode,
    toggleRefCodeActive,
    exportRefCodesToClipboard,
  } = usePromptStore();

  // Form state — 3 inputs each for sref and p
  const [srefInputs, setSrefInputs] = useState<string[]>([...EMPTY_CODES]);
  const [pInputs, setPInputs] = useState<string[]>([...EMPTY_CODES]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [swInput, setSwInput] = useState(100);
  const [versionInput, setVersionInput] = useState('');

  // Helpers to update individual sref/p inputs
  const setSrefAt = useCallback((idx: number, val: string) => {
    setSrefInputs((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }, []);
  const setPAt = useCallback((idx: number, val: string) => {
    setPInputs((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }, []);

  // Active codes preview
  const activePreview = useMemo(() => {
    const active = refCodes.filter((c) => c.isActive);
    if (active.length === 0) return '';
    const parts: string[] = [];

    const allSref = [...new Set(active.flatMap((c) => c.srefCodes).filter(Boolean))];
    if (allSref.length > 0) {
      parts.push(`--sref ${allSref.join(' ')}`);
      const swEntry = active.find((c) => c.srefCodes.length > 0 && c.sw !== 100);
      if (swEntry) parts.push(`--sw ${swEntry.sw}`);
    }

    const allP = [...new Set(active.flatMap((c) => c.pCodes).filter(Boolean))];
    if (allP.length > 0) {
      parts.push(`--p ${allP.join(' ')}`);
    }

    const ver = active.find((c) => c.version)?.version;
    if (ver) {
      parts.push(ver === 'niji' ? '--niji' : `--v ${ver}`);
    }

    return parts.join(' ');
  }, [refCodes]);

  // Check if form has at least one code
  const hasAnyCode = useMemo(
    () => srefInputs.some((v) => v.trim()) || pInputs.some((v) => v.trim()),
    [srefInputs, pInputs]
  );

  // Save handler
  const handleSave = useCallback(() => {
    const srefCodes = srefInputs.map((v) => v.trim()).filter(Boolean);
    const pCodes = pInputs.map((v) => v.trim()).filter(Boolean);
    if (srefCodes.length === 0 && pCodes.length === 0) return;

    const ok = addRefCode({
      srefCodes,
      pCodes,
      imageUrl: imageUrlInput.trim(),
      label: labelInput.trim(),
      sw: swInput,
      version: versionInput,
    });

    if (!ok) {
      setDupMsg('동일한 코드 조합이 이미 존재합니다');
      setTimeout(() => setDupMsg(''), 2500);
      return;
    }

    setSrefInputs([...EMPTY_CODES]);
    setPInputs([...EMPTY_CODES]);
    setImageUrlInput('');
    setLabelInput('');
    setSwInput(100);
    setVersionInput('');
  }, [srefInputs, pInputs, imageUrlInput, labelInput, swInput, versionInput, addRefCode]);

  // Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const [exportMsg, setExportMsg] = useState('');
  const [dupMsg, setDupMsg] = useState('');

  const handleExport = useCallback(() => {
    const json = exportRefCodesToClipboard();
    navigator.clipboard.writeText(json).then(() => {
      setExportMsg('✓ 클립보드에 복사됨');
      setTimeout(() => setExportMsg(''), 2000);
    });
  }, [exportRefCodesToClipboard]);

  const activeCount = refCodes.filter((c) => c.isActive).length;

  const codeInputClass =
    'w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white dark:border-[#4d4d4d] dark:bg-[#373737] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">참조 코드</h2>
          </div>
          {refCodes.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="전체 코드를 JSON으로 복사 (refcodes.json에 붙여넣으세요)"
            >
              <Download className="w-3.5 h-3.5" />
              {exportMsg || 'JSON 내보내기'}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          --sref(스타일)과 --p(개인화) 코드를 최대 3개씩 조합하여 관리합니다.
          <span className="text-muted-foreground/60 ml-1">
            · <Globe className="w-3 h-3 inline" /> git공유 · <HardDrive className="w-3 h-3 inline" /> 로컬전용
          </span>
        </p>
      </div>

      {/* Input Form */}
      <div className="shrink-0 px-6 pb-4">
        <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
          {/* Row 1: 3x sref codes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">--sref 코드 (최대 3개)</label>
            <div className="flex gap-2">
              {srefInputs.map((val, idx) => (
                <input
                  key={`sref-${idx}`}
                  type="text"
                  value={val}
                  onChange={(e) => setSrefAt(idx, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`코드 ${idx + 1}`}
                  className={codeInputClass}
                />
              ))}
            </div>
          </div>

          {/* Row 2: 3x p codes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">--p 코드 (최대 3개)</label>
            <div className="flex gap-2">
              {pInputs.map((val, idx) => (
                <input
                  key={`p-${idx}`}
                  type="text"
                  value={val}
                  onChange={(e) => setPAt(idx, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`코드 ${idx + 1}`}
                  className={codeInputClass}
                />
              ))}
            </div>
          </div>

          {/* Row 3: image link + label + version */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">이미지 링크</label>
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com/preview.jpg"
                className="
                  w-full px-3 py-2 rounded-lg border border-gray-200 bg-white
                  dark:border-[#4d4d4d] dark:bg-[#373737]
                  text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                "
              />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">라벨</label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="이름 (선택)"
                className="
                  w-full px-3 py-2 rounded-lg border border-gray-200 bg-white
                  dark:border-[#4d4d4d] dark:bg-[#373737]
                  text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                "
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">버전</label>
              <select
                value={versionInput}
                onChange={(e) => setVersionInput(e.target.value)}
                className="
                  w-full px-3 py-2 rounded-lg border border-gray-200 bg-white
                  dark:border-[#4d4d4d] dark:bg-[#373737]
                  text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                "
              >
                {VERSION_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: sw slider + save button */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                --sw (Style Weight): {swInput}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  value={swInput}
                  min={0}
                  max={1000}
                  step={10}
                  onChange={(e) => setSwInput(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-gray-500 dark:accent-[#d4d4d4]"
                />
                <input
                  type="number"
                  value={swInput}
                  min={0}
                  max={1000}
                  onChange={(e) => setSwInput(Math.max(0, Math.min(1000, Number(e.target.value))))}
                  className="w-16 px-2 py-1 text-xs rounded border border-gray-200 bg-white dark:border-[#4d4d4d] dark:bg-[#373737] text-right font-mono"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasAnyCode}
              className="
                px-5 py-2 rounded-lg text-sm font-medium transition-colors
                bg-primary text-primary-foreground hover:bg-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center gap-1.5 shrink-0
              "
            >
              <Plus className="w-4 h-4" />
              저장
            </button>
          </div>
          {dupMsg && (
            <p className="text-xs text-red-500 font-medium mt-1">{dupMsg}</p>
          )}
        </div>
      </div>

      {/* Active Preview */}
      {activePreview && (
        <div className="shrink-0 px-6 pb-3">
          <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              프롬프트에 추가됨 ({activeCount}개 활성)
            </p>
            <code className="text-sm font-mono text-foreground break-all">{activePreview}</code>
          </div>
        </div>
      )}

      {/* Saved Gallery */}
      <div className="px-6 pb-6">
        {refCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Palette className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">저장된 참조 코드가 없습니다</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              위 폼에서 --sref 코드나 --p 코드를 입력하고 저장하세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {refCodes.map((entry) => (
              <div
                key={entry.id}
                className={`
                  group relative rounded-xl border-2 overflow-hidden transition-all cursor-default
                  ${entry.isActive
                    ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-dashed border-muted-foreground/25 bg-muted/10'
                  }
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.label || 'ref'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                      <Palette className="w-6 h-6" />
                      <span className="text-[10px]">이미지 없음</span>
                    </div>
                  )}
                </div>

                {/* Source badge */}
                <div className="absolute top-1.5 left-1.5">
                  {entry.source === 'json' ? (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/80 text-white text-[9px] font-medium">
                      <Globe className="w-2.5 h-2.5" />git
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/80 text-white text-[9px] font-medium">
                      <HardDrive className="w-2.5 h-2.5" />로컬
                    </span>
                  )}
                </div>

                {/* Bottom bar: toggle + delete */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-background/80 border-t border-border">
                  <button
                    onClick={() => toggleRefCodeActive(entry.id)}
                    className="transition-colors"
                    title={entry.isActive ? '비활성화' : '활성화'}
                  >
                    {entry.isActive ? (
                      <ToggleRight className="w-5 h-5 text-primary" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => removeRefCode(entry.id)}
                    disabled={entry.source === 'json'}
                    className={`
                      p-0.5 rounded-md transition-all
                      ${entry.source === 'json'
                        ? 'opacity-20 cursor-not-allowed text-muted-foreground'
                        : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                      }
                    `}
                    title={entry.source === 'json' ? 'git 코드는 JSON 파일에서 삭제하세요' : '삭제'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
