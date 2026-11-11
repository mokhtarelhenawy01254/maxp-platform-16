export interface ChartPoint {
  label: string;
  value: number;
}

interface InsightsTrendChartProps {
  title: string;
  points: ChartPoint[];
  period: string;
  loading?: boolean;
}

const PERIOD_LABEL: Record<string, string> = {
  day: "يومي",
  week: "أسبوعي",
  days_28: "28 يوم",
};

const formatValue = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const formatTick = (endTime: string | null): string => {
  if (!endTime) return "";
  const date = new Date(endTime);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export function InsightsTrendChart({
  title,
  points,
  period,
  loading = false,
}: InsightsTrendChartProps) {
  const maxValue = points.reduce(
    (max, point) => (point.value > max ? point.value : max),
    0,
  );
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const lastPoint = points.length ? points[points.length - 1] : null;
  const labelStep = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
          <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {PERIOD_LABEL[period] || period}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            الإجمالي:{" "}
            <span className="font-semibold text-foreground">
              {formatValue(total)}
            </span>
          </span>
          <span className="tabular-nums">
            الأعلى:{" "}
            <span className="font-semibold text-foreground">
              {formatValue(maxValue)}
            </span>
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        {loading ? (
          <div className="h-40 animate-pulse rounded bg-muted/60" />
        ) : points.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            لا توجد بيانات في الفترة المحددة
          </div>
        ) : (
          <>
            <div
              className="flex h-40 items-end gap-[2px] border-b border-border/60 pb-px"
              role="img"
              aria-label={`مخطط ${title}`}
            >
              {points.map((point, index) => {
                const height =
                  maxValue > 0 ? Math.max((point.value / maxValue) * 100, 1.5) : 1.5;
                const isLast = index === points.length - 1;

                return (
                  <div
                    key={`${point.label}-${index}`}
                    className="group relative flex h-full flex-1 items-end"
                    title={`${formatTick(point.label) || point.label}: ${formatValue(point.value)}`}
                  >
                    <div
                      className={
                        isLast
                          ? "w-full rounded-t-sm bg-primary"
                          : "w-full rounded-t-sm bg-primary/45 transition-colors group-hover:bg-primary/75"
                      }
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5 flex gap-[2px] text-[9px] text-muted-foreground">
              {points.map((point, index) => (
                <div key={`tick-${point.label}-${index}`} className="flex-1 text-center">
                  {index % labelStep === 0 ? (
                    <span className="tabular-nums">{formatTick(point.label)}</span>
                  ) : (
                    <span aria-hidden="true">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>

            {lastPoint ? (
              <div className="mt-2 text-[10px] text-muted-foreground">
                آخر قيمة مسجلة:{" "}
                <span className="tabular-nums font-medium text-foreground">
                  {formatValue(lastPoint.value)}
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
