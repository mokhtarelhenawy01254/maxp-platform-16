import React, { useEffect } from "react";
import {
  RefreshCw,
  SlidersHorizontal,
  BarChart2,
  Eye,
  Play,
  DownloadCloud,
} from "lucide-react";
import { StatusBadge } from "./shared/StatusBadge";
import { useCurrency } from "../../../hooks/useCurrency";
import { useWooCommerceImport } from "../hooks/useWooCommerceImport";
import { ImportJobProgressBanner } from "./ImportJobProgressBanner";
import { Settings } from "../types";

interface ImportTabProps {
  settings: Settings | null;
}

export const ImportTab: React.FC<ImportTabProps> = ({ settings }) => {
  const { formatPrice } = useCurrency();
  const {
    loading,
    importing,
    wooOrders,
    activeJob,
    totalOrdersCount,
    countingOrders,
    selectedWooOrders,
    setSelectedWooOrders,
    loadActiveJobs,
    fetchOrdersCount,
    fetchWooOrders,
    startBackendImport,
    pauseBackendImport,
    resumeBackendImport,
    cancelBackendImport,
    importSelectedOrders,
    showImportOptions,
    setShowImportOptions,
    importOptions,
    setImportOptions,
  } = useWooCommerceImport(settings);

  // Load active jobs on mount
  useEffect(() => {
    loadActiveJobs();
  }, [loadActiveJobs]);

  return (
    <div className="space-y-4">
      {/* Active Import Status Banner */}
      <ImportJobProgressBanner
        activeJob={activeJob}
        pauseBackendImport={pauseBackendImport}
        resumeBackendImport={resumeBackendImport}
        cancelBackendImport={cancelBackendImport}
      />

      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            استيراد الطلبات
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            جلب طلبات متجر WooCommerce إلى النظام المحلي لمتابعة التجهيز والشحن
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
          <button
            type="button"
            onClick={() => setShowImportOptions(!showImportOptions)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors active:scale-[0.98] ${
              showImportOptions
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted hover:bg-muted/80 text-foreground border-border/60"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>خيارات متقدمة</span>
          </button>
          <button
            type="button"
            onClick={fetchOrdersCount}
            disabled={countingOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {countingOrders ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BarChart2 className="h-3.5 w-3.5" />
            )}
            <span>
              {totalOrdersCount !== null
                ? `الإجمالي: ${totalOrdersCount}`
                : "فحص العدد"}
            </span>
          </button>
        </div>
      </div>

      {/* Import Options Panel */}
      {showImportOptions && (
        <div className="p-4 bg-card rounded-xl border border-border/70 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
              العدد المستهدف
            </label>
            <select
              value={importOptions.limit}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  limit: e.target.value as any,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
            >
              <option value="10">آخر 10 طلبات</option>
              <option value="50">آخر 50 طلب</option>
              <option value="100">آخر 100 طلب</option>
              <option value="all">كل الطلبات (استيراد كامل)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
              حالة الطلبات
            </label>
            <select
              value={importOptions.status}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
            >
              <option value="any">أي حالة (الكل)</option>
              <option value="processing">Processing (قيد التنفيذ)</option>
              <option value="completed">Completed (مكتمل)</option>
              <option value="pending">Pending (معلق)</option>
              <option value="on-hold">On Hold (معلق مؤقتاً)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
              إجراء تكرار الطلب
            </label>
            <select
              value={importOptions.duplicateAction}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  duplicateAction: e.target.value as any,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
            >
              <option value="skip">تجاهل الموجود مسبقاً (Skip)</option>
              <option value="update">تحديث البيانات الحالية (Update)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
              التنفيذ
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchWooOrders}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border/60 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]"
                title="معاينة الطلبات قبل الاستيراد"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>معاينة</span>
              </button>
              <button
                type="button"
                onClick={startBackendImport}
                disabled={importing || !!activeJob}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
                title="بدء عملية الاستيراد في الخلفية مباشرة"
              >
                {importing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                <span>بدء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Table */}
      {wooOrders.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
            <div className="font-semibold text-xs text-foreground flex items-center gap-2">
              <span>نتائج المعاينة</span>
              <span className="bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono px-2 py-0.5 rounded-full">
                {wooOrders.length}
              </span>
            </div>
            {selectedWooOrders.size > 0 && (
              <button
                type="button"
                onClick={importSelectedOrders}
                disabled={importing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                <DownloadCloud className="h-3.5 w-3.5" />
                <span>استيراد المحدد ({selectedWooOrders.size})</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/60 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedWooOrders.size === wooOrders.length}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedWooOrders(
                            new Set(wooOrders.map((o) => o.wooCommerceId)),
                          );
                        else setSelectedWooOrders(new Set());
                      }}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold">الطلب</th>
                  <th className="px-3.5 py-2.5 font-semibold">العميل</th>
                  <th className="px-3.5 py-2.5 font-semibold">الحالة</th>
                  <th className="px-3.5 py-2.5 font-semibold">الإجمالي</th>
                  <th className="px-3.5 py-2.5 font-semibold">التاريخ</th>
                  <th className="px-3.5 py-2.5 font-semibold">في النظام؟</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {wooOrders.map((order) => {
                  const isChecked = selectedWooOrders.has(order.wooCommerceId);
                  return (
                    <tr
                      key={order.wooCommerceId}
                      className={`hover:bg-muted/30 transition-colors ${isChecked ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3.5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSet = new Set(selectedWooOrders);
                            if (e.target.checked) newSet.add(order.wooCommerceId);
                            else newSet.delete(order.wooCommerceId);
                            setSelectedWooOrders(newSet);
                          }}
                          className="rounded border-border text-primary focus:ring-0"
                        />
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-foreground">
                        #{order.orderNumber}
                      </td>
                      <td className="px-3.5 py-2.5 text-foreground">
                        <div className="font-medium">{order.customerName}</div>
                        {order.customerEmail && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {order.customerEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge status={order.wooCommerceStatus} />
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums font-semibold text-foreground">
                        {formatPrice(order.total, order.currency)}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums text-muted-foreground" dir="ltr">
                        {new Date(order.wooCommerceDateCreated).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {order.localStatus ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            موجود ({order.localStatus})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                            جديد
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTab;
