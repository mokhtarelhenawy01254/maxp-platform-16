import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Check } from "lucide-react";
import type { WidgetDefinition, WidgetData } from "./types";
import { AppWidgetCard } from "./AppWidgetCard";
import { AppWidgetMini } from "./AppWidgetMini";

const MAX_LARGE = 8;

type Props = {
  widgets: WidgetDefinition[];
  getData: (widget: WidgetDefinition) => WidgetData | null;
  companyId?: string;
};

function loadHidden(companyId?: string): Set<string> {
  if (!companyId) return new Set();
  try {
    const raw = localStorage.getItem(`dashHidden_${companyId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function AppWidgetGrid({ widgets, getData, companyId }: Props) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState<Set<string>>(() => loadHidden(companyId));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    localStorage.setItem(`dashHidden_${companyId}`, JSON.stringify([...hidden]));
  }, [hidden, companyId]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visible = useMemo(() => {
    const withData = widgets
      .filter((w) => !hidden.has(w.id))
      .map((w) => ({ widget: w, data: getData(w) }))
      .filter(({ data }) => data?.metrics && data.metrics.length > 0);
    const sorted = withData.sort((a, b) => {
      const aScore = a.data?.metrics?.length ?? 0;
      const bScore = b.data?.metrics?.length ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.widget.priority - b.widget.priority;
    });
    return { large: sorted.slice(0, MAX_LARGE), mini: sorted.slice(MAX_LARGE) };
  }, [widgets, getData, hidden]);

  if (widgets.length === 0) return null;

  const totalVisible = visible.large.length + visible.mini.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 relative" ref={ref}>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t("companyDashboard.widgets.sectionTitle")}
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-mono tabular-nums border border-border/60">
            {totalVisible} {t("companyDashboard.widgets.active")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 active:scale-95 shadow-2xs ${
            open
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          title={t("companyDashboard.widgets.customize") as string}
          aria-label={t("companyDashboard.widgets.customize") as string}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{t("companyDashboard.widgets.customize")}</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-1.5 z-50 w-full sm:w-72 max-w-[calc(100vw-2rem)] bg-card border border-border/80 rounded-xl shadow-xl p-3 space-y-1.5 overflow-y-auto max-h-80 backdrop-blur-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60 mb-1">
              <span className="text-xs font-semibold text-foreground">
                {t("companyDashboard.widgets.customize")}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                {visible.large.length + visible.mini.length} / {widgets.length}
              </span>
            </div>
            {widgets.map((w) => {
              const Icon = w.icon;
              const isChecked = !hidden.has(w.id);
              return (
                <label
                  key={w.id}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors duration-150 select-none ${
                    isChecked
                      ? "bg-muted/40 hover:bg-muted/70 text-foreground"
                      : "hover:bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border/80 bg-background"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(w.id)}
                    className="sr-only"
                  />
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: w.color }} />
                  <span className="truncate flex-1">{t(w.titleKey)}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 grid-flow-row-dense gap-3 sm:gap-4">
        {visible.large.map(({ widget, data }) => (
          <div key={widget.id} className={widget.colSpan === 2 ? "sm:col-span-2 xl:col-span-2" : ""}>
            <AppWidgetCard widget={widget} data={data} />
          </div>
        ))}
      </div>

      {visible.mini.length > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-2.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("companyDashboard.widgets.moreModules")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
            {visible.mini.map(({ widget, data }) => (
              <AppWidgetMini key={widget.id} widget={widget} data={data} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
