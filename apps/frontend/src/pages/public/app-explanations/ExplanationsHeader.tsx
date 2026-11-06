import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, Search, X } from "lucide-react";

interface ExplanationsHeaderProps {
  title: string;
  homeLabel: string;
  total: number;
  query: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchLabel: string;
  clearLabel: string;
  onOpenCategorySheet?: () => void;
}

/**
 * الشريط الأعلى الثابت (Native App Bar):
 * على الموبايل: شريط موحد متناسق بارتفاع مدمج يحتوي على زر الرجوع وحقل البحث السلس وزر شبكة الأقسام.
 * على الديسكتوب: مسار التنقل الكامل + عنوان الصفحة + إجمالي الشروحات + حقل البحث.
 */
export const ExplanationsHeader: React.FC<ExplanationsHeaderProps> = ({
  title,
  homeLabel,
  total,
  query,
  isSearching,
  onQueryChange,
  inputRef,
  searchLabel,
  clearLabel,
  onOpenCategorySheet,
}) => (
  <header
    data-exp-header
    className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 transition-colors"
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}
  >
    <div className="mx-auto max-w-[1180px] px-3 sm:px-4">
      {/* عرض الموبايل المدمج على صف واحد (< sm) */}
      <div className="flex h-14 items-center gap-2 sm:hidden">
        <Link
          to="/"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground transition-transform hover:bg-muted active:scale-95"
          aria-label={homeLabel}
        >
          <ArrowRight className="size-4.5 rtl:rotate-0 ltr:rotate-180" />
        </Link>

        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="explanation-search-mobile"
            name="search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onQueryChange("");
            }}
            placeholder={isSearching ? `${total} نتيجة…` : searchLabel}
            aria-label={searchLabel}
            autoComplete="off"
            className="h-9.5 w-full rounded-xl border border-border/70 bg-background ps-9 pe-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              aria-label={clearLabel}
              className="absolute end-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {onOpenCategorySheet && (
          <button
            type="button"
            onClick={onOpenCategorySheet}
            className="flex size-9.5 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground transition-transform hover:bg-muted active:scale-95"
            aria-label="عرض الأقسام"
            title="الأقسام"
          >
            <LayoutGrid className="size-4.5 text-primary" />
          </button>
        )}
      </div>

      {/* عرض الديسكتوب والتابلت (>= sm) */}
      <div className="hidden h-[60px] items-center justify-between gap-4 sm:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            to="/"
            className="shrink-0 rounded text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {homeLabel}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ⁄
          </span>
          <h1 className="min-w-0 truncate font-heading text-[15px] font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <span className="hidden shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground sm:inline">
            {total} شرح
          </span>
        </div>

        <div className="relative w-[300px] shrink-0">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="explanation-search"
            name="search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onQueryChange("");
            }}
            placeholder={searchLabel}
            aria-label={searchLabel}
            autoComplete="off"
            className="h-9 w-full rounded-xl border bg-background ps-9 pe-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              aria-label={clearLabel}
              className="absolute end-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </div>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {isSearching ? `${total} نتيجة` : ""}
      </span>
    </div>
  </header>
);
