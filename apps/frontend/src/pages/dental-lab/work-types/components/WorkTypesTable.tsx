import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  FileText,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
  Wrench,
} from "lucide-react";
import { fmtMoney, type DentalWorkType, MODAL_INPUT_CLS } from "../../shared";
import { CATEGORY_LABELS } from "../types/workTypeTypes";

interface WorkTypesTableProps {
  rows: DentalWorkType[];
  loading: boolean;
  searchInput: string;
  onSearchChange: (value: string) => void;
  removingId: string | null;
  onEdit: (workType: DentalWorkType) => void;
  onStagesModal: (workType: DentalWorkType) => void;
  onToggleActive: (workType: DentalWorkType) => void;
  onRemove: (workType: DentalWorkType) => void;
}

export function WorkTypesTable({
  rows,
  loading,
  searchInput,
  onSearchChange,
  removingId,
  onEdit,
  onStagesModal,
  onToggleActive,
  onRemove,
}: WorkTypesTableProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold">
            {t("dentalLab.workTypes.title")}{" "}
            <span className="font-mono tabular-nums">({rows.length})</span>
          </h3>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${inputCls} pr-9 w-64`}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو الخامة أو الماركة..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
          <Wrench className="w-10 h-10 mx-auto mb-3" />
          {t("dentalLab.common.noResults")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  {t("dentalLab.common.name")}
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  {t("dentalLab.workTypes.category")}
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  طريقة التسعير
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  السعر للعيادة
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  التكلفة والربح
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  الخامة والماركة
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  {t("dentalLab.workTypes.leadTimeDays")}
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  {t("dentalLab.common.status")}
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  {t("dentalLab.common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const profit = Math.max(0, (w.price ?? 0) - (w.costPrice ?? 0));
                const margin =
                  (w.price ?? 0) > 0
                    ? Math.round((profit / (w.price ?? 1)) * 100)
                    : 0;
                return (
                  <tr
                    key={w.id}
                    className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      <Link
                        to={`/dental-lab/cases?workTypeId=${w.id}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                        title="عرض كل حالات هذا النوع فقط"
                      >
                        {w.name}
                      </Link>
                      {w.instructions && (
                        <span
                          className="flex items-center gap-1 text-[11px] text-gray-400 font-normal truncate max-w-xs mt-0.5"
                          title={w.instructions}
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{w.instructions}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                        {CATEGORY_LABELS[w.category ?? ""] || w.category || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          w.pricingMode === "PER_UNIT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                        }`}
                      >
                        {w.pricingMode === "PER_UNIT"
                          ? "لكل وحدة"
                          : "سعر ثابت للخدمة"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-gray-900 dark:text-gray-100">
                      {fmtMoney(w.price)} {t("dentalLab.common.egp")}
                    </td>
                    <td className="py-3 px-4">
                      {(w.costPrice ?? 0) > 0 ? (
                        <div className="text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
                            +{fmtMoney(profit)} ج.م
                          </span>
                          <span className="text-[10px] text-gray-400 mr-1 font-mono tabular-nums">
                            ({margin}%)
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono tabular-nums">
                            ت: {fmtMoney(w.costPrice)} ج.م
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">غير محدد</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                        {w.defaultMaterial || "—"}
                      </div>
                      {w.materialBrand && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{w.materialBrand}</span>
                        </div>
                      )}
                      {(w.defaultWarrantyYears ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="font-mono tabular-nums">
                            ضمان {w.defaultWarrantyYears} سنوات
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium">
                      <div className="tabular-nums font-mono">
                        {w.leadTimeDays ?? 0} أيام
                      </div>
                      {(w.urgentLeadTimeDays ?? 0) > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
                          مستعجل: {w.urgentLeadTimeDays} يوم
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleActive(w)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          w.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800"
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {w.isActive
                          ? t("dentalLab.common.active")
                          : t("dentalLab.common.inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onStagesModal(w)}
                          className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                          title="قالب مراحل الإنتاج ومواصفات SLA"
                        >
                          <Workflow className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(w)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title={t("dentalLab.common.edit")}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemove(w)}
                          disabled={removingId !== null}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg disabled:opacity-40"
                          title={t("dentalLab.common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default WorkTypesTable;
