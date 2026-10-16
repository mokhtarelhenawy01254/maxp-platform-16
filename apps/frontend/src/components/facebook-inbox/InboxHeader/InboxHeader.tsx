import React from "react";
import { Search, SlidersHorizontal, BarChart3, Inbox } from "lucide-react";

interface InboxHeaderProps {
  pageName?: string;
  onSearch: (query: string) => void;
  onToggleFilters: () => void;
  onShowStats?: () => void;
}

const InboxHeader: React.FC<InboxHeaderProps> = ({
  pageName,
  onSearch,
  onToggleFilters,
  onShowStats,
}) => {
  return (
    <div className="border-b border-border/70 bg-card/80 backdrop-blur-xs px-5 py-3 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Page Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                صندوق الوارد
              </h1>
              {pageName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/60 font-mono">
                  {pageName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة المحادثات ومتابعة استفسارات العملاء في الوقت الفعلي
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="بحث في المحادثات والرسائل..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-background border border-border/70 rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Stats Button */}
          {onShowStats && (
            <button
              type="button"
              onClick={onShowStats}
              className="p-1.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
              title="الإحصائيات والتحليلات"
              aria-label="الإحصائيات"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}

          {/* Filters Toggle */}
          <button
            type="button"
            onClick={onToggleFilters}
            className="p-1.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
            title="تصفية المحادثات المتقدمة"
            aria-label="فلاتر متقدمة"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxHeader;
