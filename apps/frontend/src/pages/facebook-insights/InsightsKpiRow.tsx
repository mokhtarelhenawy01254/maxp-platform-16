export interface KpiItem {
  key: string;
  label: string;
  value: number | null;
  hint?: string;
  tone?: "default" | "accent";
}

interface InsightsKpiRowProps {
  items: KpiItem[];
  loading?: boolean;
}

const formatValue = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export function InsightsKpiRow({ items, loading = false }: InsightsKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-border/70 bg-card px-3 py-2.5"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-medium text-muted-foreground">
              {item.label}
            </span>
            <span
              className={
                item.tone === "accent"
                  ? "h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  : "h-1.5 w-1.5 shrink-0 rounded-full bg-border"
              }
              aria-hidden="true"
            />
          </div>

          {loading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <div className="text-xl font-semibold leading-tight tabular-nums text-foreground">
              {item.value === null || item.value === undefined
                ? "—"
                : formatValue(item.value)}
            </div>
          )}

          {item.hint ? (
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
              {item.hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
