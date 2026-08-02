import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CategoryBarProps {
  categories: Array<{ id: string; name: string; icon: LucideIcon }>;
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

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => onSelect("")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0",
            !selectedCategory
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t('marketplace.allApps')}
        </button>

        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id === selectedCategory ? "" : cat.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0",
                cat.id === selectedCategory
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={14} />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBar;
