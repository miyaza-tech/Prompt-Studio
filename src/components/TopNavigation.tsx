'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Sun, Moon, Search, X as XIcon, Plus, Check } from 'lucide-react';
import { usePromptStore } from '@/store/promptStore';

export default function TopNavigation() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { options, fields, groups, tokens, addToken, removeToken } = usePromptStore();

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setIsDark(stored === 'dark');
    } else {
      setIsDark(true);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark, mounted]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results across all options
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return options
      .filter(
        (o) =>
          o.label_en?.toLowerCase().includes(q) ||
          o.label_ko?.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          o.label?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [options, searchQuery]);

  // Resolve group_display_name for an option
  const getGroupDisplayName = (option: typeof options[0]) => {
    const grp = groups.find(
      (g) => g.category_key === option.category_id && g.group === option.group
    );
    const name = grp?.group_display_name || option.group || '';
    return name.toLowerCase() === 'default' ? '' : name;
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleToggleToken = (option: typeof options[0]) => {
    const existing = tokens.find((t) => t.option_id === option.option_id);
    if (existing) {
      removeToken(existing.id);
    } else {
      addToken(option);
    }
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">PS</span>
        </div>
        <span className="font-semibold text-base text-foreground">Prompt Studio</span>
      </div>

      {/* Global Search — right side, before dark mode toggle */}
      <div ref={searchRef} className="relative ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (searchQuery) setIsOpen(true); }}
          placeholder="전체 옵션 검색..."
          className="
            w-full pl-9 pr-8 py-1.5 rounded-lg border border-border
            bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/50
            placeholder:text-muted-foreground
          "
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/60 text-muted-foreground"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown results */}
        {isOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">검색 결과 없음</p>
            ) : (
              <>
                <div className="px-3 py-1.5 border-b border-border">
                  <span className="text-[11px] text-muted-foreground">검색결과 {searchResults.length}개</span>
                </div>
                {searchResults.map((option) => {
                  const isSelected = tokens.some((t) => t.option_id === option.option_id);
                  const groupName = getGroupDisplayName(option);
                  const pathParts = [option.category_name, groupName].filter(Boolean);

                  return (
                    <div
                      key={option.option_id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-[11px] text-muted-foreground truncate">
                          {pathParts.join(' > ')}
                        </div>
                        <div className="text-sm text-foreground">
                          {option.label_en || option.value}
                          {option.label_ko && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {option.label_ko}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleToken(option)}
                        className={`
                          shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors
                          ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'
                          }
                        `}
                        title={isSelected ? '제거' : '추가'}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-1.5 rounded hover:bg-card transition-colors"
          title={isDark ? '라이트 모드' : '다크 모드'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  );
}
