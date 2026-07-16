import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetDefinition, WidgetData } from "./types";
import { AppWidgetCard } from "./AppWidgetCard";
import { AppWidgetMini } from "./AppWidgetMini";

const MAX_LARGE = 8;

type Props = {
  widgets: WidgetDefinition[];
  getData: (widget: WidgetDefinition) => WidgetData | null;
};

export function AppWidgetGrid({ widgets, getData }: Props) {
  const { t } = useTranslation();

  const { large, mini } = useMemo(() => {
    const withData = widgets.map((w) => ({ widget: w, data: getData(w) }));
    const sorted = withData.sort((a, b) => {
      const aScore = a.data?.metrics?.length ?? 0;
      const bScore = b.data?.metrics?.length ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.widget.priority - b.widget.priority;
    });
    return {
      large: sorted.slice(0, MAX_LARGE),
      mini: sorted.slice(MAX_LARGE),
    };
  }, [widgets, getData]);

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {t("companyDashboard.widgets.sectionTitle")}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {widgets.length} {t("companyDashboard.widgets.active")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {large.map(({ widget, data }) => (
          <div key={widget.id} className={widget.colSpan === 2 ? "lg:col-span-2" : ""}>
            <AppWidgetCard widget={widget} data={data} />
          </div>
        ))}
      </div>

      {mini.length > 0 && (
        <>
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("companyDashboard.widgets.moreModules")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {mini.map(({ widget, data }) => (
              <AppWidgetMini key={widget.id} widget={widget} data={data} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
