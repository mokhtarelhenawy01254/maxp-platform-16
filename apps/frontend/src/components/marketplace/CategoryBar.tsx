import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CategoryBarProps {
  categories: Array<{ id: string; name: string; icon: LucideIcon; count?: number }>;
  selectedCategory: string;
  onSelect: (category: string) => void;
  className?: string;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onSelect,
  className,
}: CategoryBarProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalCount = categories.reduce((sum, c) => sum + (c.count || 0), 0);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          type="button"
          onClick={() => onSelect("")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
            !selectedCategory
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
          )}
        >
          <span>{t('marketplace.allApps', 'كل الفئات')}</span>
          {totalCount > 0 && (
            <span className={cn(
              "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
              !selectedCategory ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground/70"
            )}>
              {totalCount}
            </span>
          )}
        </button>

        {categories.map(cat => {
          const Icon = cat.icon;
          const active = cat.id === selectedCategory;
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => onSelect(cat.id === selectedCategory ? "" : cat.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
              )}
            >
              <Icon size={13} className="shrink-0" />
              <span>{cat.name}</span>
              {typeof cat.count === "number" && cat.count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground/70"
                )}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBar;
