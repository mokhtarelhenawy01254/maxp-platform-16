import React from "react";
import { ListFilter, Search } from 'lucide-react';

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
    <Card className="business-page-panel border-0 shadow-none md:hidden">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor={searchId}>{searchLabel}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
              className="h-11 rounded-2xl pr-10 text-right"
              aria-label={searchAriaLabel}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={onSearchSubmit} className="h-11 rounded-2xl">
            <Search className="size-4" />
            بحث
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={onOpenFilters}
          >
            <ListFilter className="size-4" />
            الفلاتر
            {filterCount > 0 ? (
              <span className="mr-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {filterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
            {summaryIcon}
            {summary}
          </div>
          {activeFilters.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="shrink-0 rounded-full px-3 py-1 text-[11px]"
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
        className="max-h-[88vh] rounded-t-[2rem] border-t border-white/10 bg-popover px-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-0"
      >
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
        <SheetHeader className="gap-1 px-4 pb-3 pt-4 text-right">
          <SheetTitle className="text-right">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-right">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="space-y-4 px-4">{children}</div>

        <SheetFooter className="mt-6 grid grid-cols-2 gap-2 px-4 pb-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={onClear}
          >
            {clearLabel}
          </Button>
          <Button type="button" className="h-11 rounded-2xl" onClick={onApply}>
            {applyLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
