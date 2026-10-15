import React, { useEffect } from "react";
import {
  RefreshCw,
  UploadCloud,
  ShoppingCart,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "./shared/StatusBadge";
import { useWooCommerceExport } from "../hooks/useWooCommerceExport";
import { Settings } from "../types";

interface ExportTabProps {
  settings: Settings | null;
}

export const ExportTab: React.FC<ExportTabProps> = ({ settings }) => {
  const {
    localOrders,
    selectedLocalOrders,
    setSelectedLocalOrders,
    exporting,
    loading,
    fetchLocalOrders,
    exportSelectedOrders,
  } = useWooCommerceExport(settings);

  // Initial fetch
  useEffect(() => {
    fetchLocalOrders();
  }, [fetchLocalOrders]);

  const ordersCount = localOrders?.length || 0;
  const isAllSelected = ordersCount > 0 && selectedLocalOrders.size === ordersCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            تصدير الطلبات إلى WooCommerce
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إرسال الطلبات المحلية المسجلة إلى متجر WooCommerce المتصل
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchLocalOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border/60 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {ordersCount > 0 && (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
          <div className="p-3 sm:p-4 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {selectedLocalOrders.size} من {ordersCount} طلب محدد
            </span>
            <button
              type="button"
              onClick={exportSelectedOrders}
              disabled={exporting || selectedLocalOrders.size === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              <UploadCloud className={`h-3.5 w-3.5 ${exporting ? "animate-pulse" : ""}`} />
              <span>تصدير المحدد ({selectedLocalOrders.size})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/60">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLocalOrders(new Set(localOrders.map((o) => o.id)));
                        } else {
                          setSelectedLocalOrders(new Set());
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold">رقم الطلب</th>
                  <th className="px-3.5 py-2.5 font-semibold">العميل</th>
                  <th className="px-3.5 py-2.5 font-semibold">الحالة</th>
                  <th className="px-3.5 py-2.5 font-semibold">حالة المزامنة</th>
                  <th className="px-3.5 py-2.5 font-semibold">الإجمالي</th>
                  <th className="px-3.5 py-2.5 font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {localOrders.map((order) => {
                  const isChecked = selectedLocalOrders.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-muted/30 transition-colors ${isChecked ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3.5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSet = new Set(selectedLocalOrders);
                            if (e.target.checked) {
                              newSet.add(order.id);
                            } else {
                              newSet.delete(order.id);
                            }
                            setSelectedLocalOrders(newSet);
                          }}
                          className="rounded border-border text-primary focus:ring-0"
                        />
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-foreground">
                        #{order.orderNumber}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-foreground">
                        {order.customerName}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3.5 py-2.5">
                        {order.syncedToWoo ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>متزامن</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>غير متزامن</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums font-semibold text-foreground">
                        {order.total}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ordersCount === 0 && !loading && (
        <div className="rounded-xl border border-border/70 bg-card p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto mb-3 flex items-center justify-center border border-border/50">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            اضغط على "تحديث القائمة" لعرض الطلبات المحلية المتاحة للتصدير
          </p>
        </div>
      )}
    </div>
  );
};

export default ExportTab;
