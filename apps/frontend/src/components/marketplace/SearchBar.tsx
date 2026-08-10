import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  suggestions?: string[];
  className?: string;
  placeholder?: string;
}

const RECENT_SEARCHES_KEY = "mp_marketplace_recent_searches";
const MAX_RECENT = 5;

export function SearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  suggestions = [],
  className,
  placeholder,
}: SearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addToRecent = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSelect = (query: string) => {
    onChange(query);
    addToRecent(query);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const showDropdown = isFocused && (recentSearches.length > 0 || suggestions.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={17} />
        <Input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { setIsFocused(true); onFocus?.(); }}
          onBlur={() => onBlur?.()}
          placeholder={placeholder || t('marketplace.searchPlaceholder')}
          className="h-11 w-full rounded-2xl border-border/30 bg-muted/30 pl-10 pr-20 text-sm shadow-sm focus:border-primary/40 focus:bg-background focus:shadow-md transition-all duration-200"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              <X size={13} />
            </Button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {value && suggestions.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{t('marketplace.searchSuggestions')}</p>
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted text-left"
                    onClick={() => handleSelect(s)}
                  >
                    <Search size={13} className="text-muted-foreground/40 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}

            {!value && recentSearches.length > 0 && (
              <div className="p-2 border-t border-border/40">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{t('marketplace.searchHistory')}</p>
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                    }}
                  >
                    {t('marketplace.clearSearch')}
                  </button>
                </div>
                {recentSearches.map(s => (
                  <button
                    key={s}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted text-left"
                    onClick={() => handleSelect(s)}
                  >
                    <Clock size={13} className="text-muted-foreground/40 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchBar;
