import React, { useState } from 'react';
import { Globe, CheckCircle2, MinusCircle, AlertTriangle, HelpCircle, ExternalLink, ChevronDown, Check } from 'lucide-react';
import api from '../../../../services/api';

export interface WebUsageItem {
  domain: string;
  url?: string;
  pageTitle?: string;
  category?: string;
  durationSeconds: number;
  entriesCount?: number;
}

interface WebUsageListProps {
  websites: WebUsageItem[];
  totalWorkSeconds?: number;
  onCategoryChange?: (domain: string, newCategory: string) => void;
}

export const WebUsageList: React.FC<WebUsageListProps> = ({
  websites = [],
  totalWorkSeconds = 0,
  onCategoryChange,
}) => {
  const [localCategories, setLocalCategories] = useState<Record<string, string>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [savingDomain, setSavingDomain] = useState<string | null>(null);

  const maxDuration = Math.max(...websites.map((w) => w.durationSeconds), 1);
  const totalDuration =
    websites.reduce((acc, w) => acc + (w.durationSeconds || 0), 0) || totalWorkSeconds || 1;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} س ${m} د`;
    return `${m} د`;
  };

  const handleUpdateCategory = async (domain: string, category: string) => {
    setSavingDomain(domain);
    try {
      await api.put('/employee-monitor/categories', {
        name: domain,
        type: 'domain',
        category,
      });
      setLocalCategories((prev) => ({ ...prev, [domain]: category }));
      if (onCategoryChange) onCategoryChange(domain, category);
    } catch (err) {
      console.warn('[WebUsageList] Category update error:', err);
    } finally {
      setSavingDomain(null);
      setActiveDropdown(null);
    }
  };

  const renderCategoryBadge = (domain: string, cat?: string) => {
    const currentCat = localCategories[domain] || cat || 'unrated';
    const isDropdownOpen = activeDropdown === domain;

    return (
      <div className="relative inline-block text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(isDropdownOpen ? null : domain);
          }}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition active:scale-95 ${
            currentCat === 'productive'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
              : currentCat === 'unproductive'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/25'
              : currentCat === 'neutral'
              ? 'bg-muted text-foreground border border-border/50 dark:border-transparent dark:bg-zinc-500/15 dark:text-zinc-300 hover:bg-muted/80 dark:hover:bg-zinc-500/25'
              : 'bg-teal-50 text-teal-700 border border-teal-200 dark:border-transparent dark:bg-teal-500/15 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/25'
          }`}
          title="انقر لتعديل تصنيف هذا الموقع"
        >
          {currentCat === 'productive' && <CheckCircle2 className="h-3 w-3" />}
          {currentCat === 'unproductive' && <AlertTriangle className="h-3 w-3" />}
          {currentCat === 'neutral' && <MinusCircle className="h-3 w-3" />}
          {currentCat === 'unrated' && <HelpCircle className="h-3 w-3" />}
          <span>
            {currentCat === 'productive'
              ? 'منتج'
              : currentCat === 'unproductive'
              ? 'غير منتج'
              : currentCat === 'neutral'
              ? 'محايد'
              : 'غير مصنف'}
          </span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className="absolute left-0 z-30 mt-1 w-32 rounded-lg border border-border/60 bg-popover text-popover-foreground p-1 shadow-xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-border/30">
              تصنيف الموقع:
            </div>
            <button
              onClick={() => handleUpdateCategory(domain, 'productive')}
              disabled={savingDomain === domain}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-right text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> منتج
              </span>
              {currentCat === 'productive' && <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={() => handleUpdateCategory(domain, 'neutral')}
              disabled={savingDomain === domain}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-right text-xs text-foreground hover:bg-muted dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className="flex items-center gap-1.5">
                <MinusCircle className="h-3 w-3" /> محايد
              </span>
              {currentCat === 'neutral' && <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={() => handleUpdateCategory(domain, 'unproductive')}
              disabled={savingDomain === domain}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-right text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> غير منتج
              </span>
              {currentCat === 'unproductive' && <Check className="h-3 w-3" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            المواقع والمنصات الرقمية المزارة ({websites.length})
          </h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          إجمالي وقت التصفح: {formatDuration(totalDuration)}
        </span>
      </div>

      {websites.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground">
          لا توجد بيانات تصفح مسجلة لهذا اليوم
        </div>
      ) : (
        <div className="space-y-2.5">
          {websites.slice(0, 10).map((site, idx) => {
            const currentCat = localCategories[site.domain] || site.category || 'unrated';
            const pct = Math.min(100, Math.round((site.durationSeconds / totalDuration) * 100));
            const barWidth = Math.min(100, Math.round((site.durationSeconds / maxDuration) * 100));

            return (
              <div
                key={idx}
                className="group relative rounded-lg border border-border/40 bg-muted/30 dark:bg-zinc-900/40 p-2.5 transition-colors hover:border-border/60 hover:bg-muted/60 dark:hover:bg-zinc-900/70"
              >
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px] font-mono" dir="ltr">
                      {site.domain}
                    </span>
                    {renderCategoryBadge(site.domain, currentCat)}
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatDuration(site.durationSeconds)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                  </div>
                </div>

                {/* Page Title Subtext */}
                {site.pageTitle && site.pageTitle !== site.domain && (
                  <p className="mb-1.5 truncate text-[11px] text-muted-foreground">
                    {site.pageTitle}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      currentCat === 'productive'
                        ? 'bg-emerald-500'
                        : currentCat === 'unproductive'
                        ? 'bg-rose-500'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WebUsageList;
