import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SlidersHorizontal, X, Star, Filter,
  Brain, BadgeCheck, Clock, Rocket, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MarketplaceFilters } from "@/types/marketplace";

interface FilterSidebarProps {
  filters: MarketplaceFilters;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  className?: string;
  isMobile?: boolean;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  className,
  isMobile = false,
}: FilterSidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof MarketplaceFilters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== "" && v !== "ALL").length;

  const filterContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <SlidersHorizontal size={15} />
          {t('marketplace.filters.title')}
        </h3>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={resetFilters}
          >
            <X size={12} className="mr-1" />
            {t('marketplace.clearFilters')}
          </Button>
        )}
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-bold text-muted-foreground mb-2.5">{t('marketplace.filters.priceModel')}</h4>
        <div className="space-y-2">
          {[
            { id: "ALL", label: t('marketplace.allApps') },
            { id: "FREE", label: t('marketplace.freePrice'), icon: CheckCircle2 },
            { id: "PAID", label: t('marketplace.paid'), icon: Star },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => updateFilter("priceModel", opt.id === filters.priceModel ? undefined : opt.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                filters.priceModel === opt.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {opt.icon && <opt.icon size={13} />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-bold text-muted-foreground mb-2.5">{t('marketplace.filters.rating')}</h4>
        <div className="space-y-1.5">
          {[4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              onClick={() => updateFilter("minRating", filters.minRating === rating ? undefined : rating)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                filters.minRating === rating
                  ? "bg-primary/10 text-primary font-bold"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className={i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                ))}
              </div>
              <span className="text-xs">& up</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-bold text-muted-foreground mb-2.5">{t('marketplace.filters.tags')}</h4>
        <div className="space-y-2">
          {[
            { key: "isAiPowered", label: t('marketplace.filters.aiApps'), icon: Brain },
            { key: "isOfficial", label: t('marketplace.filters.officialApps'), icon: BadgeCheck },
            { key: "isNew", label: t('marketplace.filters.newApps'), icon: Rocket },
            { key: "isRecentlyUpdated", label: t('marketplace.filters.recentlyUpdated'), icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <Checkbox
                checked={!!filters[key as keyof MarketplaceFilters]}
                onCheckedChange={(checked) => updateFilter(key as keyof MarketplaceFilters, checked || undefined)}
                className="rounded"
              />
              <Icon size={14} className="text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-xs font-bold">
            <Filter size={13} />
            {t('marketplace.filters.title')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('marketplace.filters.title')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{filterContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn("rounded-2xl border border-border/30 bg-card p-5", className)}>
      {filterContent}
    </aside>
  );
}

export default FilterSidebar;
