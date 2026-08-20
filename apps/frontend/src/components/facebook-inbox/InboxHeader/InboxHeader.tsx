import React from "react";
import { Search, SlidersHorizontal, BarChart3 } from "lucide-react";

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
    <div className="business-inbox-header px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onShowStats && (
            <button
              type="button"
              onClick={onShowStats}
              className="business-icon-button"
              data-tone="primary"
              title="الإحصائيات"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--color-foreground)" }}
            >
              صندوق الوارد
            </h1>
            {pageName && (
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {pageName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="business-inbox-search-wrap w-80">
            <Search className="business-inbox-search-icon h-5 w-5" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              onChange={(e) => onSearch(e.target.value)}
              className="business-inbox-search"
            />
          </div>

          {/* Filters Toggle */}
          <button
            type="button"
            onClick={onToggleFilters}
            className="business-icon-button"
            title="فلاتر متقدمة"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxHeader;
