import { useState } from "react";
import { Facebook, Search, Loader2, Check, AlertTriangle, Building } from 'lucide-react';
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import { ChevronDown } from 'lucide-react';
import { cn } from "../../../lib/utils";
import type { FacebookPageResult } from "../types";

export function FacebookLookup({
  query, onQueryChange, onSearch, onClear,
  loading, error, searched, results,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
  error: string;
  searched: boolean;
  results: FacebookPageResult[];
}) {
  const [expanded, setExpanded] = useState(false);
  const showResults = loading || Boolean(error) || searched;

  return (
    <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="facebook-lookup-panel"
        className="flex w-full items-center justify-between gap-3 text-right"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-[#1877F2]/12 text-[#1877F2]" aria-hidden="true">
            <Facebook className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-foreground">فحص صفحة فيسبوك</p>
              {searched && !loading && !error ? (
                <Badge variant="outline" className="rounded-full border-border/70 bg-background px-2.5 py-1 text-[13px]">
                  {results.length} {results.length === 1 ? "نتيجة" : "نتائج"}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              ابحث باسم الصفحة أو الـ ID واعرف إذا كانت مرتبطة بشركة داخل المنصة.
            </p>
          </div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
      </button>

      {expanded && (
        <div id="facebook-lookup-panel" className="mt-3 space-y-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Facebook className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#1877F2]" aria-hidden="true" />
              <Input
                aria-label="بحث صفحة فيسبوك"
                name="facebook-page-lookup"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearch(); } }}
                placeholder="اسم الصفحة أو الـ ID..."
                className="h-11 rounded-lg border-border/70 bg-white pr-11 dark:bg-card"
              />
            </div>
            <Button type="button" className="h-11 rounded-lg px-4 sm:min-w-[7.75rem]" onClick={onSearch} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {loading ? "جاري الفحص..." : "افحص الآن"}
            </Button>
            {(query || showResults) && (
              <Button type="button" variant="ghost" className="h-11 rounded-lg px-4 text-xs" onClick={onClear}>مسح</Button>
            )}
          </div>

          {showResults ? (
            <div className="space-y-3 border-t border-border/60 pt-3">
              {error ? (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>تعذر تنفيذ الفحص</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {loading ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-white p-4 dark:bg-card">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-3 h-3 w-40" />
                      <Skeleton className="mt-2 h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : searched && results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/90 bg-background px-4 py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">لا توجد نتائج مطابقة</p>
                  <p className="mt-1 text-xs text-muted-foreground">غالبًا الصفحة غير مربوطة حاليًا بأي شركة.</p>
                </div>
              ) : results.length ? (
                <div className="max-h-[22rem] space-y-3 overflow-y-auto pl-1">
                  {results.map((page) => (
                    <div key={page.id} className="rounded-lg border border-border/70 bg-white p-4 dark:bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{page.pageName}</h3>
                            <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-[13px] font-bold", page.isRegistered ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300")}>
                              {page.isRegistered ? "مسجلة" : "غير مسجلة"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">معرف الصفحة: {page.pageId}</p>
                          {page.company ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[13px]">
                                <Building2 className="size-3.5" />
                                {page.company.name}
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-muted-foreground">غير مرتبطة بأي شركة</p>
                          )}
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
                          {page.isRegistered ? <BadgeCheck className="size-5" /> : <AlertTriangle className="size-5" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
