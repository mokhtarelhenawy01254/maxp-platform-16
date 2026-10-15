import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { Download, FileSpreadsheet, FileText, Table } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF, type ExportColumn } from "../../utils/exportHelpers";
import type { DashboardData } from "./types";

type Props = {
  dashboard: DashboardData;
  periodLabel: string;
  disabled?: boolean;
};

export function DashboardExportMenu({ dashboard, periodLabel, disabled }: Props) {
  const { t } = useTranslation();

  const { rows, columns } = useMemo(() => {
    const c = dashboard.counts ?? {};
    const f = dashboard.financials ?? {};
    const m = dashboard.metrics ?? {};
    const oh = dashboard.orderHealth ?? {};
    const inv = dashboard.inventory ?? { lowStockCount: 0, outOfStockCount: 0 };
    const ra = dashboard.recentActivity ?? {};
    const cols: ExportColumn[] = [
      { key: "metric", label: t("companyDashboard.export.metric") },
      { key: "value", label: t("companyDashboard.export.value") },
    ];
    const mk = (metric: string, value: number | null | undefined) => ({ metric, value: value ?? 0 });
    const data = [
      mk(t("companyDashboard.rangeStats.orders"), oh.trackedOrders),
      mk(t("companyDashboard.rangeStats.items"), m.items),
      mk(t("companyDashboard.rangeStats.storeVisits"), m.visits),
      mk(t("companyDashboard.rangeStats.conversionRate"), m.conversionRate),
      mk(t("companyDashboard.financials.revenue"), f.totalRevenue),
      mk(t("companyDashboard.financials.profit"), f.grossProfit),
      mk(t("companyDashboard.financials.aov"), f.aov),
      mk(t("companyDashboard.metrics.confirmationRate"), oh.confirmedRate),
      mk(t("companyDashboard.metrics.cancellationRate"), oh.cancellationRate),
      mk(t("companyDashboard.metrics.returnRate"), oh.returnRate),
      mk(t("companyDashboard.metrics.piecesPerOrder"), oh.piecesPerOrder),
      mk(t("companyDashboard.inventory.outOfStock"), inv.outOfStockCount),
      mk(t("companyDashboard.inventory.lowStock"), inv.lowStockCount),
      mk(t("companyDashboard.stats.customers"), c.customers),
      mk(t("companyDashboard.stats.products"), c.products),
      mk(t("companyDashboard.activity.newCustomers"), ra.newCustomers),
      mk(t("companyDashboard.activity.newConversations"), ra.newConversations),
    ];
    return { rows: data, columns: cols };
  }, [dashboard, t]);

  const baseName = `dashboard_${(dashboard.dateRange?.start ?? "range").replace(/-/g, "")}_${(dashboard.dateRange?.end ?? "").replace(/-/g, "")}`;
  const title = `${dashboard.company?.name ?? t("companyDashboard.title")} — ${periodLabel}`;

  const handleCSV = () => exportToCSV(rows, columns, `${baseName}.csv`);
  const handleExcel = () => exportToExcel(rows, columns, `${baseName}.xlsx`, "Dashboard");
  const handlePDF = () => exportToPDF(rows, columns, title, `${baseName}.pdf`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-border/70 bg-card hover:bg-muted/60 text-foreground text-xs font-medium rounded-xl gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{t("companyDashboard.export.label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="bg-card border border-border/80 rounded-xl shadow-xl text-xs font-sans p-1">
        <DropdownMenuItem onClick={handleCSV} className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-1.5 hover:bg-muted/60">
          <Table className="w-3.5 h-3.5 text-primary" />
          <span>{t("companyDashboard.export.csv")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel} className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-1.5 hover:bg-muted/60">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t("companyDashboard.export.excel")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-1.5 hover:bg-muted/60">
          <FileText className="w-3.5 h-3.5 text-rose-500" />
          <span>{t("companyDashboard.export.pdf")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}