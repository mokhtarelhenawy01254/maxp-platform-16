import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  TicketIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { Coupon } from "./types";

interface CouponsTableProps {
  coupons: Coupon[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onCopyCode: (code: string) => void;
  onToggleStatus: (coupon: Coupon) => void;
  onView: (coupon: Coupon) => void;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
  getTypeText: (type: string) => string;
  getTypeColor: (type: string) => string;
}

export const CouponsTable: React.FC<CouponsTableProps> = ({
  coupons,
  loading,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onCopyCode,
  onToggleStatus,
  onView,
  onEdit,
  onDelete,
  getTypeText,
  getTypeColor,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-right rtl:text-right ltr:text-left">
          <thead className="bg-slate-50/75 dark:bg-slate-900/75 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5">{t("coupons.tableCode")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableName")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableType")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableValue")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableUsage")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableValidity")}</th>
              <th className="px-4 py-2.5">{t("coupons.tableStatus")}</th>
              <th className="px-4 py-2.5 text-center">{t("coupons.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/80">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="inline-flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                  </div>
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <TicketIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <h3 className="mt-2 text-xs font-semibold text-gray-900 dark:text-white">
                    {t("coupons.noCoupons")}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {t("coupons.noCouponsDesc")}
                  </p>
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Code */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40">
                        {coupon.code || coupon.id}
                      </span>
                      <button
                        onClick={() => onCopyCode(coupon.code || coupon.id)}
                        title="نسخ الكود"
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Name & Description */}
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white">
                      {coupon.name}
                    </div>
                    {coupon.description && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-xs">
                        {coupon.description}
                      </div>
                    )}
                    {coupon.minOrderAmount && coupon.minOrderAmount > 0 ? (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                        الحد الأدنى: {formatPrice(coupon.minOrderAmount)}
                      </div>
                    ) : null}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getTypeColor(
                        coupon.type,
                      )}`}
                    >
                      {getTypeText(coupon.type)}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums" dir="ltr">
                    {coupon.type?.toLowerCase() === "percentage"
                      ? `${coupon.value}%`
                      : coupon.type?.toLowerCase() === "free_shipping"
                        ? t("coupons.typeFreeShipping")
                        : formatPrice(coupon.value)}
                  </td>

                  {/* Usage Progress */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono tabular-nums">
                      {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}
                    </div>
                    {coupon.usageLimit && coupon.usageLimit > 0 ? (
                      <div className="w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, (coupon.usageCount / coupon.usageLimit) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </td>

                  {/* Validity */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                    <div>من: {formatDate(coupon.validFrom)}</div>
                    <div>إلى: {formatDate(coupon.validTo)}</div>
                  </td>

                  {/* Status & Quick Toggle */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => onToggleStatus(coupon)}
                      title="انقر للتبديل الفوري"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                        coupon.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          coupon.isActive ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {coupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onView(coupon)}
                        title="عرض التفاصيل"
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(coupon)}
                        title="تعديل الكوبون"
                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(coupon)}
                        title="حذف الكوبون"
                        className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {t("coupons.pageInfo", { page, totalPages })} (إجمالي {totalCount} كوبون)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t("coupons.pagePrev")}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t("coupons.pageNext")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
