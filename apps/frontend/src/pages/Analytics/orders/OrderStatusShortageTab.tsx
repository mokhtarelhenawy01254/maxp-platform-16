import React from "react";
import { AlertTriangle, DollarSign, Target, Package, XCircle, RefreshCw, Download } from "lucide-react";
import {
  ShortageFailedOrder,
  ShortageByProduct,
  Summary,
} from "./orderStatusTypes";

interface OrderStatusShortageTabProps {
  summary?: Summary;
  deliveryRate: string;
  shortageByProduct: ShortageByProduct[];
  recentFailed: ShortageFailedOrder[];
  reopeningOrderId: string | null;
  onReopenOrder: (order: ShortageFailedOrder) => void;
  onExport: () => void;
}

export const OrderStatusShortageTab: React.FC<OrderStatusShortageTabProps> = ({
  summary,
  deliveryRate,
  shortageByProduct,
  recentFailed,
  reopeningOrderId,
  onReopenOrder,
  onExport,
}) => {
  return (
    <div className="space-y-4">
      {/* Shortage KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">إجمالي طلبات العجز الفاشل</p>
            <div className="rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {summary?.shortageFailedCount || 0}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            {summary?.shortageFailedPercentage || 0}% من إجمالي الطلبات
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">القيمة المفقودة</p>
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {(summary?.shortageFailedRevenue || 0).toLocaleString("ar-EG")}{" "}
            <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            متوسط:{" "}
            {summary?.shortageFailedCount
              ? ((summary?.shortageFailedRevenue || 0) / summary.shortageFailedCount).toLocaleString("ar-EG")
              : 0}{" "}
            ج.م/طلب
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">نسبة التسليم</p>
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {deliveryRate}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">من إجمالي الطلبات</p>
        </div>
      </div>

      {/* Top products causing shortage failure */}
      {shortageByProduct.length > 0 && (
        <div className="rounded-lg border border-border/70 bg-card shadow-none overflow-hidden">
          <div className="border-b border-border/70 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" /> أكثر المنتجات المتسببة في العجز النهائي
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-right text-[11px] font-semibold text-muted-foreground">
                  <th className="py-2.5 px-4">المنتج</th>
                  <th className="py-2.5 px-4">عدد الطلبات</th>
                  <th className="py-2.5 px-4">القطع</th>
                  <th className="py-2.5 px-4">قيمة الخسارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono tabular-nums">
                {shortageByProduct.map((p) => (
                  <tr key={p.product} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-foreground">{p.product}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{p.ordersCount}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{p.units}</td>
                    <td className="py-2.5 px-4 font-semibold text-purple-600 dark:text-purple-400">
                      {p.revenue.toLocaleString("ar-EG")} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Shortage Failed Orders Table */}
      <div className="rounded-lg border border-border/70 bg-card shadow-none overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <XCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" /> آخر طلبات العجز الفاشل
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              ({recentFailed.length} طلب)
            </span>
          </h3>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> تصدير CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-right text-[11px] font-semibold text-muted-foreground">
                <th className="py-2.5 px-4">رقم الطلب</th>
                <th className="py-2.5 px-4">العميل</th>
                <th className="py-2.5 px-4">الهاتف</th>
                <th className="py-2.5 px-4">المبلغ</th>
                <th className="py-2.5 px-4">المحافظة</th>
                <th className="py-2.5 px-4">التاريخ</th>
                <th className="py-2.5 px-4">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono tabular-nums">
              {recentFailed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground font-sans">
                    لا توجد طلبات عجز فاشل في هذه الفترة
                  </td>
                </tr>
              ) : (
                recentFailed.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-purple-600 dark:text-purple-400">
                      {o.orderNumber}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-foreground">{o.customerName || "-"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground" dir="ltr">
                      {o.customerPhone || "-"}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      {o.total.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="py-2.5 px-4 font-sans text-muted-foreground">{o.governorate || "-"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => void onReopenOrder(o)}
                        disabled={reopeningOrderId === o.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${reopeningOrderId === o.id ? "animate-spin" : ""}`}
                        />
                        إعادة فتح
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusShortageTab;
