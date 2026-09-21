import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  MessageSquare,
  ShoppingCart,
  Cpu,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Phone,
  QrCode,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { Button } from "../../../components/ui/button";
import { cn } from "@/lib/utils";

interface OperationsPulseData {
  orders: {
    todayOrders: number;
    todayGMV: number;
    avgOrderValue: number;
    topMerchant: {
      id: string;
      name: string;
      slug: string | null;
      ordersCount: number;
      ordersGMV: number;
    } | null;
  };
  whatsapp: {
    totalSessions: number;
    connected: number;
    disconnected: number;
    hasDisconnectedAlert: boolean;
    disconnectedList: Array<{
      id: string;
      companyName: string;
      companyId?: string;
      phoneNumber: string;
      status: string;
    }>;
  };
  abandonedCarts: {
    todayCount: number;
    todayValue: number;
    todayRecovered: number;
    recoveryRatePercent: number;
  };
  aiActivity: {
    todayInteractions: number;
    avgLatencyMs: number;
  };
  trials: {
    expiringCount: number;
    hasExpiringAlert: boolean;
    expiringList: Array<{
      id: string;
      name: string;
      phone: string | null;
      endsAt: string | null;
    }>;
  };
}

export const PlatformOperationsPulse: React.FC = () => {
  const { data, isLoading, isFetching, refetch } = useQuery<{
    success: boolean;
    pulse: OperationsPulseData;
  }>({
    queryKey: ["super-admin", "operations-pulse"],
    queryFn: async () => {
      const res = await apiClient.get("/super-admin/dashboard/operations-pulse");
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const pulse = data?.pulse;

  if (isLoading && !pulse) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-bold text-foreground">
              نبض العمليات والمتاجر الحية
            </span>
          </div>
          <span className="text-xs text-muted-foreground animate-pulse">
            جاري فحص مؤشرات المنصة...
          </span>
        </div>
      </div>
    );
  }

  if (!pulse) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur-xl space-y-4">
      {/* Control / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              نبض العمليات والمتاجر الحية
            </h2>
            <p className="text-xs text-muted-foreground">
              رادار لحظي للطلبات، اتصالات الواتساب، السلال المتروكة، واستهلاك الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5 ml-1.5", isFetching && "animate-spin text-primary")} />
            تحديث
          </Button>

          <Link to="/super-admin/daily-orders">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            >
              <span>متابعة الطلبات التفصيلية</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Asymmetric Bento Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: الطلبات والمبيعات اليوم */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 transition-all hover:bg-background hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              طلبات ومبيعات اليوم
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {pulse.orders.todayOrders.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">طلب اليوم</span>
            </div>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
              {pulse.orders.todayGMV.toLocaleString()} ج.م
              <span className="text-[10px] text-muted-foreground mr-1 font-normal">
                (متوسط {pulse.orders.avgOrderValue.toLocaleString()} ج.م)
              </span>
            </p>
          </div>
          {pulse.orders.topMerchant && (
            <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span className="truncate max-w-[130px]" title={pulse.orders.topMerchant.name}>
                الأعلى: {pulse.orders.topMerchant.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {pulse.orders.topMerchant.ordersCount} طلب
              </span>
            </div>
          )}
        </div>

        {/* Card 2: رادار اتصالات الواتساب */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 transition-all hover:bg-background hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              صحة اتصالات الواتساب
            </span>
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                pulse.whatsapp.hasDisconnectedAlert
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <MessageSquare className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {pulse.whatsapp.connected}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                / {pulse.whatsapp.totalSessions} جهاز متصل
              </span>
            </div>

            {pulse.whatsapp.hasDisconnectedAlert ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="size-3 shrink-0" />
                <span>{pulse.whatsapp.disconnected} أرقام مفصولة تحتاج فحص</span>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="size-3 shrink-0" />
                <span>جميع أجهزة واتساب نشطة</span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-border/40">
            <Link
              to="/super-admin/whatsapp/companies"
              className="text-[11px] text-primary hover:underline flex items-center justify-between font-medium"
            >
              <span>إدارة اتصالات واتساب</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: السلال المتروكة والاسترداد */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 transition-all hover:bg-background hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              السلال المتروكة اليوم
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShoppingCart className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {pulse.abandonedCarts.todayCount.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">سلة متروكة</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium tabular-nums">
              بقيمة تقديرية:{" "}
              <span className="text-foreground font-semibold">
                {pulse.abandonedCarts.todayValue.toLocaleString()} ج.م
              </span>
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-border/40 text-[11px] flex items-center justify-between text-muted-foreground">
            <span>تم استردادها:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
              {pulse.abandonedCarts.todayRecovered} سلة ({pulse.abandonedCarts.recoveryRatePercent}%)
            </span>
          </div>
        </div>

        {/* Card 4: الذكاء الاصطناعي والتنبيهات */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 transition-all hover:bg-background hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              نشاط الذكاء الاصطناعي
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Cpu className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {pulse.aiActivity.todayInteractions.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">طلب وكلاء</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              متوسط الاستجابة:{" "}
              <span className="font-semibold text-foreground">
                {pulse.aiActivity.avgLatencyMs}ms
              </span>
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-border/40">
            <Link
              to="/super-admin/ai-consumption"
              className="text-[11px] text-primary hover:underline flex items-center justify-between font-medium"
            >
              <span>سجل استهلاك الـ AI</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Actionable Banner (Only appears if there are disconnected sessions or expiring trials) */}
      {(pulse.whatsapp.hasDisconnectedAlert || pulse.trials.hasExpiringAlert) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span>
              <strong>تنبيه تشغيلي مباشر:</strong>{" "}
              {pulse.whatsapp.hasDisconnectedAlert && (
                <span>
                  هناك {pulse.whatsapp.disconnected} أجهزة واتساب مفصولة أو بانتظار مسح QR.{" "}
                </span>
              )}
              {pulse.trials.hasExpiringAlert && (
                <span>
                  هناك {pulse.trials.expiringCount} شركات توشك مهلتها التجريبية على الانتهاء خلال 48 ساعة.
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pulse.whatsapp.hasDisconnectedAlert && (
              <Link to="/super-admin/whatsapp/companies">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <QrCode className="size-3 ml-1" />
                  فحص أرقام الواتساب
                </Button>
              </Link>
            )}
            {pulse.trials.hasExpiringAlert && (
              <Link to="/super-admin/follow-up">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <Phone className="size-3 ml-1" />
                  متابعة الاشتراكات
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
