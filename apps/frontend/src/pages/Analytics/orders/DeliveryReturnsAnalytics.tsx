// Logistics Operations & Delivery-Returns Cockpit v2.2 - Linear Chassis
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Building2,
  MapPin,
  AlertCircle,
  Package,
  Download,
  Search,
  PieChart as PieChartIcon,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodKey, PeriodRange } from "../../../components/common/PeriodSelector";
import { DeliveryReturnsKpis, LogisticsSummary } from "./deliveryReturns/DeliveryReturnsKpis";
import { DeliveryReturnsBranchesTable, BranchPerformance } from "./deliveryReturns/DeliveryReturnsBranchesTable";
import { DeliveryReturnsGovTable, GovernoratePerformance } from "./deliveryReturns/DeliveryReturnsGovTable";
import { DeliveryReturnsReasonsCard, ReturnReasonStat, RestockStatus } from "./deliveryReturns/DeliveryReturnsReasonsCard";
import { DeliveryReturnsProductsTable, TopReturnedProduct } from "./deliveryReturns/DeliveryReturnsProductsTable";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

type ActiveTab = "overview" | "branches" | "governorates" | "reasons" | "products";

interface DeliveryReturnsLogisticsData {
  summary: LogisticsSummary;
  branches: BranchPerformance[];
  governorates: GovernoratePerformance[];
  returnReasons: ReturnReasonStat[];
  restockStatus: RestockStatus;
  topReturnedProducts: TopReturnedProduct[];
}

interface ApiResponse {
  success: boolean;
  data?: DeliveryReturnsLogisticsData;
  message?: string;
}

const DeliveryReturnsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useEffect(() => {
    if (!range) return;
    const params: Record<string, string> = {
      period: range.period,
      ...(range.startDate ? { startDate: range.startDate } : {}),
      ...(range.endDate ? { endDate: range.endDate } : {}),
    };
    setSearchParams(params, { replace: true });
  }, [range, setSearchParams]);

  const query = useQuery({
    queryKey: ["analytics", "delivery-returns-logistics", range?.period, range?.startDate, range?.endDate],
    queryFn: (): Promise<ApiResponse> =>
      analyticsService.getDeliveryReturnsLogisticsAnalytics(range?.period, range?.startDate, range?.endDate) as Promise<ApiResponse>,
    select: (res): DeliveryReturnsLogisticsData | null => (res?.success && res?.data ? res.data : null),
    staleTime: 60_000,
    enabled: Boolean(range),
  });

  const data = query.data;
  const summary = data?.summary;
  const branches = data?.branches ?? [];
  const governorates = data?.governorates ?? [];
  const returnReasons = data?.returnReasons ?? [];
  const restockStatus = data?.restockStatus ?? { restockedCount: 0, pendingWithCarrierCount: 0, restockedValue: 0, pendingCarrierValue: 0, stockRecoveryRate: 0 };
  const topReturnedProducts = data?.topReturnedProducts ?? [];

  const compositionData = useMemo(() => {
    if (!summary || summary.totalShipped <= 0) return [];
    return [
      { key: "delivered", name: t("deliveryReturnsReport.delivered", "تم التسليم"), value: summary.deliveredOrders, color: "#10B981" },
      { key: "returned", name: t("deliveryReturnsReport.returned", "مرتجع"), value: summary.returnedOrders, color: "#F59E0B" },
      { key: "inTransit", name: t("deliveryReturnsReport.inTransit", "في الطريق"), value: summary.inTransitOrders, color: "#3B82F6" },
    ].filter((d) => d.value > 0);
  }, [summary, t]);

  const handleExport = () => {
    if (!data || branches.length === 0) return;
    const rows = branches.map((b) => ({
      الفرع_أو_الشركة: b.name,
      إجمالي_المشحون: b.totalShipped,
      تم_التسليم: b.delivered,
      مرتجع: b.returned,
      في_الطريق: b.inTransit,
      نسبة_الحسم: `${b.deliveryRate}%`,
      نسبة_المرتجع: `${b.returnRate}%`,
      نقد_محصل: b.codCollected,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-returns-logistics-${range?.period || "30"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card p-4 rounded-xl border border-border/70">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-500" />
            {t("deliveryReturnsReport.title", "إحصائيات الشحن والمرتجعات اللوجستية")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("deliveryReturnsReport.subtitle", "أداء شركات الشحن، نسب الإرجاع والتسليم، وتغطية المحافظات")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            initialPeriod={(searchParams.get("period") as PeriodKey) || "30"}
            initialStartDate={searchParams.get("startDate") || ""}
            initialEndDate={searchParams.get("endDate") || ""}
            onRangeChange={setRange}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={branches.length === 0} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            {t("deliveryReturnsReport.csvExport", "تصدير CSV")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {query.isError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span>{t("deliveryReturnsReport.fetchError", "تعذر جلب بيانات الشحن")}</span></div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} className="h-7 text-xs">إعادة المحاولة</Button>
        </div>
      )}

      {/* Logistics KPIs Ribbon */}
      <DeliveryReturnsKpis summary={summary} />

      {/* Surface Chassis with Tabs */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-lg bg-muted/50 p-1 border border-border/70 text-xs overflow-x-auto">
            <button onClick={() => setActiveTab("overview")} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "overview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <PieChartIcon className="h-3.5 w-3.5 text-indigo-500" />
              نظرة عامة
            </button>
            <button onClick={() => setActiveTab("branches")} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "branches" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              شركات الشحن ({branches.length})
            </button>
            <button onClick={() => setActiveTab("governorates")} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "governorates" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              المحافظات ({governorates.length})
            </button>
            <button onClick={() => setActiveTab("reasons")} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "reasons" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              أسباب الارتجاع ({returnReasons.length})
            </button>
            <button onClick={() => setActiveTab("products")} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "products" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Package className="h-3.5 w-3.5 text-emerald-500" />
              المنتجات ({topReturnedProducts.length})
            </button>
          </div>

          {activeTab !== "overview" && (
            <div className="relative max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في النتائج…" className="w-full pr-8 pl-3 py-1.5 text-xs bg-background border border-border/70 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-foreground" />
            </div>
          )}
        </div>

        <div className="p-4">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-muted/20 rounded-xl p-4 border border-border/70 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-semibold text-foreground">توزيع الشحنات</h4>
                      <span className="text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{summary?.totalShipped ?? 0} مشحون</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">نسب التسليم والارتجاع الإجمالية</p>
                  </div>
                  <div className="h-44 min-w-0">
                    <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie data={compositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                          {compositionData.map((entry) => (<Cell key={entry.key} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </DeferredResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 pt-2 border-t border-border/50 text-[11px]">
                    {compositionData.map((d) => {
                      const pctOfShipped = summary?.totalShipped ? Math.round((d.value / summary.totalShipped) * 1000) / 10 : 0;
                      return (
                        <div key={d.key} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground truncate text-[10px]">{d.name}</span>
                          </div>
                          <p className="font-mono font-bold text-foreground mt-0.5 tabular-nums text-xs">{d.value.toLocaleString()}</p>
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{pctOfShipped}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <DeliveryReturnsReasonsCard reasons={returnReasons} restock={restockStatus} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-foreground">أداء الفروع وشركات الشحن (أبرز النتائج)</h4>
                  <button onClick={() => setActiveTab("branches")} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    عرض كل الفروع ({branches.length})
                  </button>
                </div>
                <DeliveryReturnsBranchesTable branches={branches.slice(0, 5)} search="" />
              </div>
            </div>
          )}

          {activeTab === "branches" && <DeliveryReturnsBranchesTable branches={branches} search={search} />}
          {activeTab === "governorates" && <DeliveryReturnsGovTable governorates={governorates} search={search} />}
          {activeTab === "reasons" && <DeliveryReturnsReasonsCard reasons={returnReasons} restock={restockStatus} />}
          {activeTab === "products" && <DeliveryReturnsProductsTable products={topReturnedProducts} search={search} />}
        </div>
      </Card>
    </div>
  );
};

export default DeliveryReturnsAnalytics;
