import React from "react";

export interface ReturnRequestsPaginationProps {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  total: number;
  t: (key: string) => string;
}

export const ReturnRequestsPagination: React.FC<
  ReturnRequestsPaginationProps
> = ({ page, setPage, totalPages, total, t }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between">
      <span className="text-xs font-mono text-muted-foreground">
        {t("returns.k_149")} {total} · صفحة {page} من {totalPages}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
        >
          السابق
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages
          )
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center gap-1">
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-1 text-xs text-muted-foreground">…</span>
              )}
              <button
                type="button"
                onClick={() => setPage(p)}
                className={`h-7 min-w-7 px-2 text-xs font-mono tabular-nums rounded transition ${
                  page === p
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "border border-border/80 bg-background/80 hover:bg-muted text-foreground"
                }`}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
        >
          التالي
        </button>
      </div>
    </div>
  );
};
