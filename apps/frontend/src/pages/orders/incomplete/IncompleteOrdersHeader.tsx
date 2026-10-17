import React from "react";
import { Link } from "react-router-dom";
import { Settings2, BarChart3, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface IncompleteOrdersHeaderProps {
  exporting: boolean;
  loading: boolean;
  onExport: () => void;
}

export const IncompleteOrdersHeader: React.FC<IncompleteOrdersHeaderProps> = ({
  exporting,
  loading,
  onExport,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t("orders.incompleteTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
          {t("orders.incompleteSubtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to="/settings/orders?tab=incomplete"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 active:scale-[0.98] transition-all"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("orders.incompleteSettings")}</span>
        </Link>

        <Link
          to="/orders/incomplete/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 active:scale-[0.98] transition-all"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{t("orders.incompleteReports")}</span>
        </Link>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span>
            {exporting
              ? t("orders.incompleteExporting")
              : t("orders.incompleteExport")}
          </span>
        </button>
      </div>
    </div>
  );
};

export default IncompleteOrdersHeader;
