import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/apiClient";
import {
  ClockIcon,
  UserCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

interface AuditChange {
  before: any;
  after: any;
}

interface ProductAuditRecord {
  id: string;
  companyId: string;
  productId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  changes?: Record<string, AuditChange> | null;
  source?: string;
  createdAt: string;
}

interface ProductAuditTabProps {
  productId?: string;
}

const ACTION_MAP: Record<string, { label: string; badgeClass: string }> = {
  CREATE: {
    label: "إنشاء منتج",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  UPDATE: {
    label: "تعديل بيانات",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  BULK_UPDATE: {
    label: "تعديل جماعي",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  IMPORT: {
    label: "استيراد",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  DELETE: {
    label: "حذف",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  STATUS_CHANGE: {
    label: "تغيير الحالة",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
  },
};

const SOURCE_MAP: Record<string, string> = {
  UI: "واجهة المستخدم",
  IMPORT: "استيراد",
  API: "واجهة برمجية (API)",
  AGENT: "وكيل ذكي",
};

const FIELD_LABELS: Record<string, string> = {
  name: "اسم المنتج",
  price: "السعر",
  comparePrice: "سعر المقارنة",
  cost: "سعر التكلفة",
  stock: "المخزون",
  sku: "رمز المنتج (SKU)",
  barcode: "الباركود",
  description: "الوصف",
  categoryId: "القسم",
  status: "الحالة",
  isActive: "حالة التفعيل",
  isHidden: "إخفاء من المتجر",
  trackInventory: "تتبع المخزون",
  weight: "الوزن",
  dimensions: "الأبعاد",
  tags: "الوسوم",
  images: "الصور",
  mainImage: "الصورة الرئيسية",
  deletedAt: "سلة المحذوفات",
  workflowStatus: "مرحلة العمل",
};

const formatFieldValue = (field: string, val: any): string => {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") {
    if (field === "isActive") return val ? "مفعل" : "معطل";
    if (field === "isHidden") return val ? "مخفي" : "ظاهر";
    if (field === "trackInventory") return val ? "مفعّل" : "معطّل";
    return val ? "نعم" : "لا";
  }
  if (field === "price" || field === "cost" || field === "comparePrice") {
    return `${val} ج.م`;
  }
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

export const ProductAuditTab: React.FC<ProductAuditTabProps> = ({ productId }) => {
  const [logs, setLogs] = useState<ProductAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any>(
        `products/${productId}/history?page=${page}&limit=10`
      );
      if (response && response.data) {
        const payload = response.data;
        const fetchedLogs = Array.isArray(payload)
          ? payload
          : payload.data || payload.logs || [];
        setLogs(fetchedLogs);
        const pagination = payload.pagination;
        if (pagination) {
          setTotal(pagination.total || fetchedLogs.length);
          setTotalPages(pagination.totalPages || 1);
        } else {
          setTotal(fetchedLogs.length);
          setTotalPages(1);
        }
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error("Error fetching product history:", err);
      setError("فشل في تحميل سجل التعديلات. يرجى المحاولة مرة أخرى.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return "الآن";
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return "أمس";
      if (diffDays < 30) return `منذ ${diffDays} يوم`;
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatExactDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4 sm:p-6 space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              سجل تعديلات المنتج
            </h3>
            {total > 0 && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
                {total} عملية
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            سجل دقيق وتفصيلي يوضح من قام بالتعديل، وما هي الحقول المتغيرة وتاريخ التعديل
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchHistory()}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث السجل
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && logs.length === 0 && (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 border border-gray-100 dark:border-gray-750 rounded-xl bg-gray-50/50 dark:bg-gray-850/50 animate-pulse space-y-3"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            لا يوجد سجل تعديلات
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            لم يتم تسجيل أي تعديلات سابقة على هذا المنتج بعد. سيتم توثيق أي تغيير يتم إجراؤه تلقائيًا هنا.
          </p>
        </div>
      )}

      {/* Timeline List of Logs */}
      {logs.length > 0 && (
        <div className="space-y-4">
          {logs.map((record) => {
            const actionInfo = ACTION_MAP[record.action] || {
              label: record.action,
              badgeClass: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
            };
            const sourceLabel = SOURCE_MAP[record.source || "UI"] || record.source || "واجهة المستخدم";
            const changesList = record.changes ? Object.entries(record.changes) : [];

            return (
              <div
                key={record.id}
                className="border border-gray-200/80 dark:border-gray-700/80 rounded-xl p-4 bg-white dark:bg-gray-850 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-2xs"
              >
                {/* Record Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-750">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${actionInfo.badgeClass}`}
                    >
                      {actionInfo.label}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      عبر {sourceLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span title={formatExactDate(record.createdAt)} className="font-mono">
                      {formatRelativeTime(record.createdAt)}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-[11px] font-mono opacity-80">
                      {formatExactDate(record.createdAt)}
                    </span>
                  </div>
                </div>

                {/* User Snapshot */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <UserCircleIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {record.userName || "مستخدم غير معروف"}
                  </span>
                </div>

                {/* Field Changes Table */}
                {changesList.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 text-[11px]">
                          <th className="py-1.5 px-2 font-semibold">الحقل</th>
                          <th className="py-1.5 px-2 font-semibold">القيمة السابقة</th>
                          <th className="py-1.5 px-2 font-semibold text-center w-8">←</th>
                          <th className="py-1.5 px-2 font-semibold">القيمة الجديدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {changesList.map(([field, diff]) => {
                          const fieldNameAr = FIELD_LABELS[field] || field;
                          const beforeText = formatFieldValue(field, diff?.before);
                          const afterText = formatFieldValue(field, diff?.after);

                          return (
                            <tr key={field} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                              <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <TagIcon className="h-3 w-3 text-gray-400" />
                                {fieldNameAr}
                              </td>
                              <td className="py-2 px-2 text-rose-600 dark:text-rose-400 font-mono">
                                <span className="line-through bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                                  {beforeText}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center text-gray-400 font-bold">
                                ←
                              </td>
                              <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                                <span className="bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                                  {afterText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-gray-400 italic">
                    تم تنفيذ العملية دون تغيير في الحقول المراقبة
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
          <div className="text-gray-500 dark:text-gray-400">
            الصفحة <span className="font-bold text-gray-900 dark:text-white font-mono">{page}</span> من{" "}
            <span className="font-bold text-gray-900 dark:text-white font-mono">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
              السابق
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              التالي
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAuditTab;
