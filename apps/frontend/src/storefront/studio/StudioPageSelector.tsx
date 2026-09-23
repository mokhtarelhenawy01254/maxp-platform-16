import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { STUDIO_PAGES, type StudioPageDefinition } from "./StudioTypes";

interface StudioPageSelectorProps {
  activePageKey: string;
  onPageChange: (pageKey: string) => void;
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  shop: ShoppingBagIcon,
  pdp: CubeIcon,
  cart: ShoppingCartIcon,
  checkout: CreditCardIcon,
};

export const StudioPageSelector: React.FC<StudioPageSelectorProps> = ({
  activePageKey,
  onPageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePageDef: StudioPageDefinition =
    STUDIO_PAGES.find((p) => p.id === activePageKey) || STUDIO_PAGES[0];
  const ActiveIcon = PAGE_ICONS[activePageDef.id] || Squares2X2Icon;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (pageId: string) => {
      onPageChange(pageId);
      setIsOpen(false);
    },
    [onPageChange]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button with obvious dropdown affordance */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`تعديل الصفحة: ${activePageDef.label}. انقر لفتح قائمة صفحات المتجر`}
        title="انقر لتبديل الصفحة وتعديل أقسامها"
        className={`group flex h-9 items-center gap-2 rounded-xl border bg-card px-3 text-xs font-bold transition-all shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isOpen
            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
            : "border-border text-foreground hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        {/* Page Icon */}
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
            isOpen
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>

        {/* Page Prefix */}
        <span className="hidden items-center text-[11px] font-medium text-muted-foreground sm:inline-flex">
          الصفحة:
        </span>

        {/* Word + Arrow Group (Crystal clear indication of dropdown options) */}
        <span className="inline-flex items-center gap-1.5 font-black text-foreground text-xs sm:text-sm">
          <span>{activePageDef.label}</span>
          <ChevronDownIcon
            className={`h-4 w-4 text-primary stroke-[2.5] transition-transform duration-200 group-hover:scale-110 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>

        {/* Total Pages Counter Badge */}
        <span className="hidden md:inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {STUDIO_PAGES.length}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="قائمة صفحات المتجر"
          className="absolute top-full mt-2 start-0 z-50 w-72 sm:w-80 rounded-2xl border border-border/80 bg-card p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 mb-1">
            <div>
              <p className="text-xs font-black text-foreground">صفحات المتجر</p>
              <p className="text-[10px] text-muted-foreground">اختر الصفحة لتعديل أقسامها ومظهرها</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {STUDIO_PAGES.length} صفحات
            </span>
          </div>

          {/* List of Pages */}
          <div className="space-y-1">
            {STUDIO_PAGES.map((page) => {
              const isSelected = page.id === activePageKey;
              const PageIcon = PAGE_ICONS[page.id] || Squares2X2Icon;

              return (
                <button
                  key={page.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(page.id)}
                  className={`group flex w-full items-center justify-between rounded-xl p-2 text-start transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border border-primary/25 bg-primary/10 text-primary"
                      : "border border-transparent text-foreground hover:bg-muted/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <PageIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {page.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {page.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
