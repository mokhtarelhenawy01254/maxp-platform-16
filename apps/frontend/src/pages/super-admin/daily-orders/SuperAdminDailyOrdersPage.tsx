import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { DailyOrdersSummaryResponse, PeriodType } from "./types";
import { DailyOrdersStats } from "./DailyOrdersStats";
import { DailyOrdersHourlyChart } from "./DailyOrdersHourlyChart";
import { DailyOrdersTable } from "./DailyOrdersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: Array<{ id: PeriodType; label: string }> = [
  { id: "today", label: "اليوم" },
  { id: "yesterday", label: "أمس" },
  { id: "7d", label: "آخر 7 أيام" },
  { id: "30d", label: "آخر 30 يوم" },
  { id: "month", label: "هذا الشهر" },
  { id: "custom", label: "مخصص" },
];

export default function SuperAdminDailyOrdersPage() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery<DailyOrdersSummaryResponse>({
    queryKey: ["super-admin", "daily-orders", period, customStart, customEnd],
    queryFn: async (): Promise<DailyOrdersSummaryResponse> => {
      const params: Record<string, string> = { period };
      if (period === "custom" && customStart && customEnd) {
        params["startDate"] = customStart;
        params["endDate"] = customEnd;
      }
      const res = await apiClient.get<DailyOrdersSummaryResponse>(
        "/super-admin/company-orders/daily-summary",
        { params }
      );
      if (!res.data || !res.data.success) {
        throw new Error("فشل تحميل ملخص الطلبات اليومية");
      }
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // Background poll every minute to keep superadmin live
  });

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <ShoppingBag className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                متابعة الطلبات اليومية للشركات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                مباشر
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              رصد حركة ومبيعات كل شركة وإجمالي معاملات المنصة لحظياً
            </p>
          </div>
        </div>

        {/* Timeframe selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Pills */}
          <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 text-xs overflow-x-auto max-w-full">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all select-none cursor-pointer",
                  period === opt.id
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Range Picker */}
          {period === "custom" && (
            <div className="flex items-center gap-1 text-xs">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 w-32 text-xs bg-background/50 font-mono"
                title="من تاريخ"
              />
              <span className="text-muted-foreground text-xs">إلى</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 w-32 text-xs bg-background/50 font-mono"
                title="إلى تاريخ"
              />
            </div>
          )}

          {/* Live Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw
              className={cn("size-3.5", isFetching && "animate-spin text-primary")}
            />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-muted-foreground">
            جاري استخراج وتجميع حركة الطلبات عبر شركات المنصة...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            حدث خطأ أثناء تحميل بيانات الطلبات. يرجى المحاولة مرة أخرى أو فحص
            الاتصال بالسيرفر.
          </AlertDescription>
        </Alert>
      )}

      {/* Loaded Content */}
      {data && !isLoading && (
        <>
          {/* Top KPI Cards */}
          <DailyOrdersStats summary={data.summary} period={period} />

          {/* Hourly / Daily Trend Chart */}
          <DailyOrdersHourlyChart
            timeline={data.timeline}
            isSingleDay={data.meta.isSingleDay}
          />

          {/* Detailed Companies Ledger */}
          <DailyOrdersTable
            companies={data.companies}
            periodLabel={
              period === "custom"
                ? `${customStart || "start"}_${customEnd || "end"}`
                : period
            }
          />
        </>
      )}
    </div>
  );
}
