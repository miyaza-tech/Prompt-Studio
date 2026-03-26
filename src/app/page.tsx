'use client';

import { useCallback, useState, useEffect } from 'react';
import TopNavigation from '@/components/TopNavigation';
import CategoryNavPanel from '@/components/CategoryNavPanel';
import { REFCODE_CATEGORY_ID } from '@/components/CategoryNavPanel';
import TokenSelectionPanel from '@/components/TokenSelectionPanel';
import PromptStructurePanel from '@/components/PromptStructurePanel';
import ParamsPanel from '@/components/ParamsPanel';
import RefCodePanel from '@/components/RefCodePanel';
import PromptOutputBar from '@/components/PromptOutputBar';
import ResizeHandle from '@/components/ResizeHandle';
import { usePromptStore } from '@/store/promptStore';

// === Size constraints ===
const LEFT_MIN = 160;
const LEFT_MAX = 300;
const LEFT_DEFAULT = 200;
const RIGHT_MIN = 240;
const RIGHT_MAX = 420;
const RIGHT_DEFAULT = 300;
const BOTTOM_MIN = 100;
const BOTTOM_MAX = 500;
const BOTTOM_DEFAULT = 220;
// Bottom-left / bottom-right split (percentage-based via pixel width)
const BOTTOM_SPLIT_MIN = 200;
const BOTTOM_SPLIT_MAX = 600;
const BOTTOM_SPLIT_DEFAULT = 360;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT);
  const [bottomHeight, setBottomHeight] = useState(BOTTOM_DEFAULT);
  const [bottomSplitWidth, setBottomSplitWidth] = useState(BOTTOM_SPLIT_DEFAULT);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedCategoryId = usePromptStore((s) => s.selectedCategoryId);
  const isRefCodeView = selectedCategoryId === REFCODE_CATEGORY_ID;

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.min(LEFT_MAX, Math.max(LEFT_MIN, w + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, w + delta)));
  }, []);

  const handleBottomResize = useCallback((delta: number) => {
    setBottomHeight((h) => Math.min(BOTTOM_MAX, Math.max(BOTTOM_MIN, h + delta)));
  }, []);

  const handleBottomSplitResize = useCallback((delta: number) => {
    setBottomSplitWidth((w) => Math.min(BOTTOM_SPLIT_MAX, Math.max(BOTTOM_SPLIT_MIN, w + delta)));
  }, []);

  if (!mounted) {
    return (
      <main className="flex flex-col h-screen overflow-hidden bg-background">
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <span className="text-sm">Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation */}
      <TopNavigation />

      {/* ====== Upper Area: 3 columns ====== */}
      <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left Panel — Custom Text + Category Navigation */}
        <aside
          className="shrink-0 border-r border-border bg-card overflow-hidden flex flex-col"
          style={{ width: leftWidth }}
        >
          <CategoryNavPanel />
        </aside>

        <ResizeHandle side="left" onResize={handleLeftResize} />

        {/* Center Panel — Token Selection (or RefCode) */}
        <section className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {isRefCodeView ? <RefCodePanel /> : <TokenSelectionPanel />}
          </div>
        </section>

        <ResizeHandle side="right" onResize={handleRightResize} />

        {/* Right Panel — Format Selector + Parameters */}
        <aside
          className="shrink-0 border-l border-border bg-card overflow-hidden flex flex-col"
          style={{ width: rightWidth }}
        >
          <ParamsPanel />
        </aside>
      </div>

      {/* ====== Bottom Resize Handle ====== */}
      <ResizeHandle side="bottom" onResize={handleBottomResize} />

      {/* ====== Bottom Area: Token Structure (left) + Prompt Output (right) ====== */}
      <div className="shrink-0 flex flex-row overflow-hidden border-t border-border" style={{ height: bottomHeight }}>
        {/* Bottom Left — Token Order / Weight */}
        <div
          className="shrink-0 overflow-hidden border-r border-border"
          style={{ width: bottomSplitWidth }}
        >
          <PromptStructurePanel />
        </div>

        {/* Bottom Split Resize Handle */}
        <ResizeHandle side="left" onResize={handleBottomSplitResize} />

        {/* Bottom Right — Prompt Output */}
        <div className="flex-1 min-w-0 overflow-visible">
          <PromptOutputBar />
        </div>
      </div>
    </main>
  );
}
