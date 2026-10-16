import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Tags, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Category } from "@/types/marketplace";
import { categoryIcons } from "@/utils/marketplace";
import { groupCategoriesByHub } from "@/utils/marketplaceSystems";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  className?: string;
  isMobile?: boolean;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelect,
  className,
  isMobile = false,
}: CategorySidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = groupCategoriesByHub(categories);
  const totalCount = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderCategoryItem = (cat: Category) => {
    const Icon = categoryIcons[cat.category] || Tags;
    const active = selectedCategory === cat.category;
    return (
      <button
        key={cat.category}
        onClick={() => {
          onSelect(cat.category);
          if (isMobile) setIsOpen(false);
        }}
        className={cn(
          "group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 text-primary font-bold"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon size={14} className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground/70")} />
          <span className="truncate">{cat.name}</span>
        </span>
        <span className={cn("shrink-0 text-[11px] font-semibold tabular-nums", active ? "text-primary" : "text-muted-foreground/60")}>
          {cat.count}
        </span>
      </button>
    );
  };

  const content = (
    <div className="space-y-1">
      <button
        onClick={() => {
          onSelect("");
          if (isMobile) setIsOpen(false);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
          !selectedCategory
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <LayoutGrid size={14} className="shrink-0" />
          <span className="truncate">{t('marketplace.categories.all')}</span>
        </span>
        <span className={cn("shrink-0 text-[11px] font-semibold tabular-nums", !selectedCategory ? "text-primary-foreground/80" : "text-muted-foreground/60")}>
          {totalCount}
        </span>
      </button>

      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.id);
        return (
          <div key={group.id} className="pt-3">
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              {t(group.labelKey)}
              <ChevronDown size={12} className={cn("transition-transform", isCollapsed && "-rotate-90")} />
            </button>
            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {group.items.map(renderCategoryItem)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 rounded-xl text-xs font-bold", className)}>
            <Tags size={13} />
            {t('marketplace.categories.title')}
            {selectedCategory && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {categories.find(c => c.category === selectedCategory)?.count ?? 0}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:w-[360px] overflow-y-auto">
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Tags size={16} />
              {t('marketplace.categories.title')}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              <X size={16} />
            </Button>
          </SheetHeader>
          <div className="mt-5">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn("rounded-2xl border border-border/30 bg-card p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-extrabold text-foreground">
        <Tags size={15} className="text-primary" />
        {t('marketplace.categories.title')}
      </h3>
      {content}
    </aside>
  );
}

export default CategorySidebar;
