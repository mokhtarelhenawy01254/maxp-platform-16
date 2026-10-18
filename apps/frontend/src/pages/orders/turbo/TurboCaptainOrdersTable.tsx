import React from "react";
import { Link } from "react-router-dom";
import type { OrderItem } from "./turboCaptainHelpers";
import { statusBadgeClass, statusArabic } from "./turboCaptainHelpers";

interface TurboCaptainOrdersTableProps {
  orders: OrderItem[];
  statusFilter: string;
  onFilterChange: (status: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const FILTER_OPTIONS = [
  { key: "", label: "كافة الشحنات" },
  { key: "delivered", label: "تم التسليم" },
  { key: "returned", label: "مرتجع" },
  { key: "active", label: "قيد التوصيل" },
  { key: "delayed", label: "مؤجلة" },
];

export const TurboCaptainOrdersTable: React.FC<TurboCaptainOrdersTableProps> = ({
  orders,
  statusFilter,
  onFilterChange,
  page,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="bg-card border border-border/70 rounded-xl shadow-xs overflow-hidden space-y-0">
      <div className="p-3 border-b border-border/70 bg-muted/20 flex gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === f.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3">رقم الطلب</th>
              <th className="px-4 py-3">العميل</th>
              <th className="px-4 py-3 text-center">الإجمالي</th>
              <th className="px-4 py-3 text-center">حالة النظام</th>
              <th className="px-4 py-3 text-center">حالة Turbo</th>
              <th className="px-4 py-3">سبب التأخير</th>
              <th className="px-4 py-3">سبب الارتجاع</th>
              <th className="px-4 py-3 text-center">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  لا توجد شحنات مطابقة للفلتر المحدد
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/orders/${encodeURIComponent(o.orderNumber)}`}
                      className="text-primary hover:underline font-mono font-bold"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-foreground">
                      {o.customerName || "—"}
                    </div>
                    {o.customerPhone && (
                      <span
                        className="text-[11px] text-muted-foreground font-mono block"
                        dir="ltr"
                      >
                        {o.customerPhone}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold tabular-nums text-foreground">
                    {parseFloat(o.total.toString()).toFixed(0)}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ج.م
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(
                        o.status
                      )}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(
                        o.turboShipmentStatus
                      )}`}
                    >
                      {statusArabic(o.turboShipmentStatus)}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-[11px] text-amber-600 dark:text-amber-400 max-w-[180px] truncate"
                    title={o.turboDelayReason || ""}
                  >
                    {o.turboDelayReason || "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-[11px] text-rose-600 dark:text-rose-400 max-w-[180px] truncate"
                    title={o.turboReturnReason || ""}
                  >
                    {o.turboReturnReason || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-[11px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-3.5 border-t border-border/70 bg-muted/10">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded-lg text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            صفحة {page} من {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-lg text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
};

export default TurboCaptainOrdersTable;
