import React from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

interface BusinessMobileSearchPanelProps {
  searchId: string;
  searchName?: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  searchAriaLabel: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onOpenFilters: () => void;
  filterCount?: number;
  summaryIcon?: React.ReactNode;
  summary: React.ReactNode;
  activeFilters?: string[];
}

interface BusinessFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onClear: () => void;
  onApply: () => void;
  clearLabel?: string;
  applyLabel?: string;
  children: React.ReactNode;
}

export const BusinessMobileSearchPanel: React.FC<
  BusinessMobileSearchPanelProps
> = ({
  searchId,
  searchName,
  searchLabel,
  searchPlaceholder,
  searchValue,
  searchAriaLabel,
  onSearchChange,
  onSearchSubmit,
  onOpenFilters,
  filterCount = 0,
  summaryIcon,
  summary,
  activeFilters = [],
}) => {
  return (
    <Card className="business-page-panel rounded-xl border border-border/70 bg-card/50 shadow-none backdrop-blur-sm md:hidden">
      <CardContent className="space-y-3.5 p-3.5">
        <div className="space-y-1.5">
          <Label htmlFor={searchId} className="text-xs font-medium text-muted-foreground">
            {searchLabel}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              id={searchId}
              name={searchName}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearchSubmit();
                }
              }}
              placeholder={searchPlaceholder}
              className="h-10 rounded-lg border-border/70 bg-background/80 pr-9 text-right text-xs placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary"
              aria-label={searchAriaLabel}
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onSearchSubmit();
                }}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                aria-label="مسح البحث"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={onSearchSubmit}
            className="h-9 gap-1.5 rounded-lg text-xs font-medium"
          >
            <Search className="size-3.5" />
            بحث
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-border/70 bg-background/60 text-xs font-medium hover:bg-muted/50"
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            الفلاتر
            {filterCount > 0 ? (
              <span className="mr-1 rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-primary tabular-nums">
                {filterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground tabular-nums">
            {summaryIcon}
            <span>{summary}</span>
          </div>
          {activeFilters.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="shrink-0 rounded-md border-border/60 bg-background/50 px-2 py-0.5 font-mono text-[11px] font-normal text-foreground tabular-nums"
            >
              {label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const BusinessFilterSheet: React.FC<BusinessFilterSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onClear,
  onApply,
  clearLabel = "مسح الكل",
  applyLabel = "تطبيق",
  children,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-2xl border-t border-border/70 bg-card px-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-0 shadow-2xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="gap-1 border-b border-border/60 px-4 pb-3 pt-3.5 text-right">
          <SheetTitle className="text-right text-sm font-semibold text-foreground">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-right text-xs text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-4 py-3 text-xs">{children}</div>

        <SheetFooter className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 px-4 pt-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-border/70 text-xs font-medium hover:bg-muted/50"
            onClick={onClear}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            className="h-9 rounded-lg text-xs font-medium"
            onClick={onApply}
          >
            {applyLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
