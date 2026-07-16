import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
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
  } catch { return new Set(); }
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
    setHidden((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 relative" ref={ref}>
        <h2 className="text-sm font-semibold text-foreground">
          {t("companyDashboard.widgets.sectionTitle")}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {visible.large.length + visible.mini.length} {t("companyDashboard.widgets.active")}
        </span>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="mr-auto p-1 rounded-md hover:bg-muted transition-colors"
          title={t("companyDashboard.widgets.customize")}
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-1 z-50 w-full sm:w-64 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-lg p-3 space-y-1 overflow-y-auto max-h-80">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {t("companyDashboard.widgets.customize")}
            </p>
            {widgets.map((w) => {
              const Icon = w.icon;
              return (
                <label
                  key={w.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!hidden.has(w.id)}
                    onChange={() => toggle(w.id)}
                    className="rounded border-border accent-primary"
                  />
                  <Icon className="w-4 h-4 shrink-0" style={{ color: w.color }} />
                  <span className="truncate">{t(w.titleKey)}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {visible.large.map(({ widget, data }) => (
          <div key={widget.id} className={widget.colSpan === 2 ? "xl:col-span-2" : ""}>
            <AppWidgetCard widget={widget} data={data} />
          </div>
        ))}
      </div>

      {visible.mini.length > 0 && (
        <>
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("companyDashboard.widgets.moreModules")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
            {visible.mini.map(({ widget, data }) => (
              <AppWidgetMini key={widget.id} widget={widget} data={data} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
