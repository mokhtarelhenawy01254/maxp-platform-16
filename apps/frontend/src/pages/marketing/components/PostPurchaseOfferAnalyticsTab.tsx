import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  Clock,
  RotateCcw,
  Truck,
  Percent,
  RefreshCw,
  Package,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { formatCurrency } from "../../../utils/currency";

interface AnalyticsKpis {
  totalOrders: number;
  offerAcceptedOrders: number;
  acceptanceRate: number;
  offerRevenue: number;
  baselineRevenue: number;
  totalRevenue: number;
  baselineAov: number;
  withOfferAov: number;
  aovLift: number;
  aovLiftPercent: number;
  avgAcceptanceSeconds: number | null;
  avgAcceptanceSecondsText: string;
}

interface DeliveryOutcomes {
  deliveredOrders: number;
  deliveredOfferRevenue: number;
  returnedOrders: number;
  returnedOfferRevenue: number;
  inTransitOrders: number;
  inTransitOfferRevenue: number;
  netRealizedOfferRevenue: number;
}

interface VariantBreakdown {
  color: string;
  size: string;
  count: number;
  revenue: number;
}

interface RecentAcceptedOrder {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  offerPrice: number;
  variant?: { color?: string; size?: string };
  acceptedAt?: string;
  timeToAcceptSeconds?: number | null;
  status: string;
  createdAt: string;
}

interface AnalyticsData {
  period: string;
  dateRange: { start: string; end: string };
  kpis: AnalyticsKpis;
  deliveryOutcomes: DeliveryOutcomes;
  variants: VariantBreakdown[];
  recentAcceptedOrders: RecentAcceptedOrder[];
}

const PERIOD_OPTIONS = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "last7days", label: "آخر 7 أيام" },
  { key: "last30days", label: "آخر 30 يوم" },
  { key: "all", label: "كل الفترات" }
] as const;

export const PostPurchaseOfferAnalyticsTab: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<string>("yesterday");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await apiClient.get(`/post-purchase-offer/analytics?period=${period}`)) as {
        data?: { success?: boolean; data?: AnalyticsData };
      };
      if (res?.data?.data) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error("Failed to load post-purchase offer analytics:", err);
      setError(err?.response?.data?.message || err?.message || "فشل تحميل إحصائيات العرض");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = data?.kpis;
  const delivery = data?.deliveryOutcomes;
  const variants = data?.variants || [];
  const recentOrders = data?.recentAcceptedOrders || [];

  return (
    <div className="space-y-6">
      {/* Top Filter & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted text-foreground transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Acceptance Rate */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">معدل القبول</span>
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {kpis ? `${kpis.acceptanceRate}%` : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {kpis ? `${kpis.offerAcceptedOrders} من ${kpis.totalOrders} طلب` : "—"}
          </p>
        </div>

        {/* Card 2: Offer Revenue */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">إيراد العرض الإضافي</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {kpis ? `${formatCurrency(kpis.offerRevenue)}` : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground">
            إيراد مباشر من الـ Upsell
          </p>
        </div>

        {/* Card 3: AOV Lift */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">رفع متوسط السلة (AOV)</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
            {kpis ? `+${formatCurrency(kpis.aovLift)}` : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {kpis ? `+${kpis.aovLiftPercent}% من السلة الأساسية` : "—"}
          </p>
        </div>

        {/* Card 4: Avg Acceptance Time */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">متوسط زمن القبول</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {kpis?.avgAcceptanceSecondsText || "—"}
          </div>
          <p className="text-[10px] text-muted-foreground">
            سرعة اتخاذ القرار بالثواني
          </p>
        </div>

        {/* Card 5: Net Realized Revenue */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">الصافي المحقق (تم التوصيل)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {delivery ? `${formatCurrency(delivery.deliveredOfferRevenue)}` : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {delivery ? `${delivery.deliveredOrders} طلب مسلّم` : "—"}
          </p>
        </div>

        {/* Card 6: Returned / Lost */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">مرتجعات العرض</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {delivery ? `${formatCurrency(delivery.returnedOfferRevenue)}` : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {delivery ? `${delivery.returnedOrders} طلب مرتجع` : "—"}
          </p>
        </div>
      </div>

      {/* Row 2: Delivery Outcomes & Variants Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Delivery Outcomes Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              مصير تسليم طلبات العرض
            </h3>
            <span className="text-[11px] text-muted-foreground">عائد مالي حقيقي</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-semibold text-foreground">تم التسليم بنجاح</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {delivery?.deliveredOrders || 0} طلب
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-600 tabular-nums">
                +{formatCurrency(delivery?.deliveredOfferRevenue || 0)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs font-semibold text-foreground">قيد الشحن / في الطريق</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {delivery?.inTransitOrders || 0} طلب
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-blue-600 tabular-nums">
                {formatCurrency(delivery?.inTransitOfferRevenue || 0)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs font-semibold text-foreground">مرتجع أو ملغي</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {delivery?.returnedOrders || 0} طلب
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-rose-600 tabular-nums">
                -{formatCurrency(delivery?.returnedOfferRevenue || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Variants Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              أكثر المتغيرات طلباً في العرض
            </h3>
            <span className="text-[11px] text-muted-foreground">اللون والمقاس الأكثر مبيعاً</span>
          </div>

          {variants.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              لا توجد بيانات لمتغيرات العرض في هذه الفترة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2.5 text-start font-medium">اللون</th>
                    <th className="pb-2.5 text-start font-medium">المقاس</th>
                    <th className="pb-2.5 text-center font-medium">عدد مرات الشراء</th>
                    <th className="pb-2.5 text-end font-medium">إجمالي الإيراد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {variants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">{v.color || "—"}</td>
                      <td className="py-2.5 font-medium text-foreground">{v.size || "—"}</td>
                      <td className="py-2.5 text-center font-bold text-foreground tabular-nums">
                        {v.count}
                      </td>
                      <td className="py-2.5 text-end font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(v.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Accepted Orders Table */}
      <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            آخر الطلبات التي وافقت على العرض
          </h3>
          <span className="text-[11px] text-muted-foreground">تتبع زمني فوري</span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            لم يتم تسجيل قبول للعرض في هذه الفترة بعد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="pb-2.5 text-start font-medium">رقم الطلب</th>
                  <th className="pb-2.5 text-start font-medium">العميل</th>
                  <th className="pb-2.5 text-start font-medium">المتغير المختار</th>
                  <th className="pb-2.5 text-center font-medium">سعر العرض</th>
                  <th className="pb-2.5 text-center font-medium">سرعة القبول</th>
                  <th className="pb-2.5 text-center font-medium">حالة الطلب</th>
                  <th className="pb-2.5 text-end font-medium">إجمالي الطلب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentOrders.map((ord) => (
                  <tr key={ord.orderNumber} className="hover:bg-muted/30">
                    <td className="py-2.5 font-bold text-foreground font-mono">
                      {ord.orderNumber}
                    </td>
                    <td className="py-2.5 text-foreground">
                      <div className="font-medium">{ord.customerName}</div>
                      {ord.customerPhone && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {ord.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-foreground">
                      {ord.variant?.color || ord.variant?.size ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px]">
                          {ord.variant.color && <span>{ord.variant.color}</span>}
                          {ord.variant.size && <span>• {ord.variant.size}</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(ord.offerPrice)}
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground tabular-nums">
                      {typeof ord.timeToAcceptSeconds === "number"
                        ? `${ord.timeToAcceptSeconds} ثانية`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-end font-bold text-foreground tabular-nums">
                      {formatCurrency(ord.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
