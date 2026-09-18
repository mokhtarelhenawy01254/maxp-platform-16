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
  RefreshCcw,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodKey,
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { DeliveryReturnsKpis, LogisticsSummary } from "./deliveryReturns/DeliveryReturnsKpis";
import { DeliveryReturnsBranchesTable, BranchPerformance } from "./deliveryReturns/DeliveryReturnsBranchesTable";
import { DeliveryReturnsGovTable, GovernoratePerformance } from "./deliveryReturns/DeliveryReturnsGovTable";
import { DeliveryReturnsReasonsCard, ReturnReasonStat, RestockStatus } from "./deliveryReturns/DeliveryReturnsReasonsCard";
import { DeliveryReturnsProductsTable, TopReturnedProduct } from "./deliveryReturns/DeliveryReturnsProductsTable";

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

const DELIVERED_COLOR = "#10B981";
const RETURNED_COLOR = "#F59E0B";
const IN_TRANSIT_COLOR = "#3B82F6";

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
    queryKey: [
      "analytics",
      "delivery-returns-logistics",
      range?.period,
      range?.startDate,
      range?.endDate,
    ],
    queryFn: (): Promise<ApiResponse> =>
      analyticsService.getDeliveryReturnsLogisticsAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      ) as Promise<ApiResponse>,
    select: (res): DeliveryReturnsLogisticsData | null =>
      res?.success && res?.data ? res.data : null,
    staleTime: 60_000,
    enabled: Boolean(range),
  });

  const data = query.data;
  const summary = data?.summary;
  const branches = data?.branches ?? [];
  const governorates = data?.governorates ?? [];
  const returnReasons = data?.returnReasons ?? [];
  const restockStatus = data?.restockStatus ?? {
    restockedCount: 0,
    pendingWithCarrierCount: 0,
    restockedValue: 0,
    pendingCarrierValue: 0,
    stockRecoveryRate: 0,
  };
  const topReturnedProducts = data?.topReturnedProducts ?? [];

  const compositionData = useMemo(() => {
    if (!summary || summary.totalShipped <= 0) return [];
    return [
      { key: "delivered", name: t("deliveryReturnsReport.delivered"), value: summary.deliveredOrders, color: DELIVERED_COLOR },
      { key: "returned", name: t("deliveryReturnsReport.returned"), value: summary.returnedOrders, color: RETURNED_COLOR },
      { key: "inTransit", name: t("deliveryReturnsReport.inTransit"), value: summary.inTransitOrders, color: IN_TRANSIT_COLOR },
    ].filter((d) => d.value > 0);
  }, [summary, t]);

  const handleExport = () => {
    if (!data) return;
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

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-returns-logistics-${range?.period || "30"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40" dir="rtl">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-700 dark:text-rose-300 font-medium">
          {t("deliveryReturnsReport.fetchError")}
        </p>
        <button
          onClick={() => query.refetch()}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {t("deliveryReturnsReport.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700/70 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            {t("deliveryReturnsReport.title")}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {t("deliveryReturnsReport.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            initialPeriod={(searchParams.get("period") as PeriodKey) || "30"}
            initialStartDate={searchParams.get("startDate") || ""}
            initialEndDate={searchParams.get("endDate") || ""}
            onRangeChange={setRange}
          />
          <button
            onClick={handleExport}
            disabled={branches.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-slate-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("deliveryReturnsReport.csvExport")}
          </button>
        </div>
      </div>

      {/* Logistics KPIs */}
      <DeliveryReturnsKpis summary={summary} />

      {/* Surface Chassis with Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm overflow-hidden">
        {/* Tab Header & Search */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <PieChartIcon className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.overviewTab")}
            </button>

            <button
              onClick={() => setActiveTab("branches")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "branches"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.branchesTab")} ({branches.length})
            </button>

            <button
              onClick={() => setActiveTab("governorates")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "governorates"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.governoratesTab")} ({governorates.length})
            </button>

            <button
              onClick={() => setActiveTab("reasons")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "reasons"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.reasonsTab")} ({returnReasons.length})
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "products"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.productsTab")} ({topReturnedProducts.length})
            </button>
          </div>

          {activeTab !== "overview" && (
            <div className="relative max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("deliveryReturnsReport.searchPlaceholder") as string}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-4">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Pipeline Donut + Restock Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Status Donut */}
                <div className="bg-slate-50/50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">
                      {t("deliveryReturnsReport.composition")}
                    </h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                      توزيع الشحنات التي خرجت للتوصيل
                    </p>
                  </div>

                  <div className="h-44 min-w-0">
                    <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={compositionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={70}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {compositionData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", direction: "rtl", fontSize: "11px" }} />
                      </PieChart>
                    </DeferredResponsiveContainer>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                    {compositionData.map((d) => (
                      <div key={d.key} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-500 dark:text-gray-400">{d.name}</span>
                        </div>
                        <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5 tabular-nums">
                          {d.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Restock & Return Reasons side by side */}
                <div className="lg:col-span-2">
                  <DeliveryReturnsReasonsCard reasons={returnReasons} restock={restockStatus} />
                </div>
              </div>

              {/* Top Branches Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                    أداء الفروع وشركات الشحن (أبرز النتائج)
                  </h4>
                  <button
                    onClick={() => setActiveTab("branches")}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    عرض كل الفروع ({branches.length})
                  </button>
                </div>
                <DeliveryReturnsBranchesTable branches={branches.slice(0, 5)} search="" />
              </div>
            </div>
          )}

          {activeTab === "branches" && (
            <DeliveryReturnsBranchesTable branches={branches} search={search} />
          )}

          {activeTab === "governorates" && (
            <DeliveryReturnsGovTable governorates={governorates} search={search} />
          )}

          {activeTab === "reasons" && (
            <DeliveryReturnsReasonsCard reasons={returnReasons} restock={restockStatus} />
          )}

          {activeTab === "products" && (
            <DeliveryReturnsProductsTable products={topReturnedProducts} search={search} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryReturnsAnalytics;
