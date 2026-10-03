import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/api";
import { useCompany } from "../../contexts/CompanyContext";
import { CheckCircleIcon, ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const COLUMN_OPTIONS = [
  { id: "orderNumber", label: "رقم الطلب", required: true },
  { id: "customer", label: "العميل", required: false },
  { id: "customerRating", label: "تقييم العميل", required: false },
  { id: "amount", label: "المبلغ", required: false },
  { id: "status", label: "الحالة", required: false },
  { id: "payment", label: "الدفع", required: false },
  { id: "date", label: "التاريخ", required: false },
  { id: "actions", label: "إجراءات", required: false },
] as const;

const DEFAULT_COLUMNS = COLUMN_OPTIONS.map((col) => col.id);
const REQUIRED_COLUMNS = COLUMN_OPTIONS.filter((col) => col.required).map(
  (col) => col.id,
);

const OrderColumnsSettings: React.FC = () => {
  const { company, refreshCompany } = useCompany();
  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(DEFAULT_COLUMNS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSearchToggle, setSavingSearchToggle] = useState(false);

  const parsedSettings = useMemo(() => {
    if (!company?.settings) return {};
    if (typeof company.settings === "string") {
      try {
        return JSON.parse(company.settings);
      } catch (e) {
        return {};
      }
    }
    return company.settings;
  }, [company?.settings]);

  const showSearchInHeader = parsedSettings.showOrderSearchInHeader !== false;

  const allowedColumns = useMemo(
    () => new Set(COLUMN_OPTIONS.map((col) => col.id)),
    [],
  );

  useEffect(() => {
    if (!company) return;

    const saved = parsedSettings.ordersTableColumns;
    if (Array.isArray(saved) && saved.length > 0) {
      const filtered = saved.filter((col: any) => allowedColumns.has(col));
      setSelectedColumns(filtered.length > 0 ? filtered : DEFAULT_COLUMNS);
    } else {
      setSelectedColumns(DEFAULT_COLUMNS);
    }
    setLoading(false);
  }, [company, allowedColumns, parsedSettings]);

  const isSelected = (id: string) => selectedColumns.includes(id);

  const toggleColumn = (id: string) => {
    if (REQUIRED_COLUMNS.includes(id)) return;

    setSelectedColumns((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((col) => col !== id);
        return next.length > 0 ? next : prev;
      }
      return [...prev, id];
    });
  };

  const handleSelectAll = () => {
    setSelectedColumns(DEFAULT_COLUMNS);
  };

  const handleReset = () => {
    setSelectedColumns(DEFAULT_COLUMNS);
  };

  const handleToggleSearchInHeader = async () => {
    try {
      setSavingSearchToggle(true);
      const newVal = !showSearchInHeader;

      const response = await apiClient.put("/settings/company", {
        settings: {
          ...parsedSettings,
          showOrderSearchInHeader: newVal,
        },
      });

      if (response.data?.success) {
        tToast.success("OrderColumnsSettings.success_update_f41e");
        await refreshCompany(true);
      } else {
        tToast.error("OrderColumnsSettings.failed_update_d0d4");
      }
    } catch (error) {
      console.error("Error updating search toggle:", error);
      tToast.error("OrderColumnsSettings.error_error_f49e");
    } finally {
      setSavingSearchToggle(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/settings/company", {
        settings: {
          ...parsedSettings,
          ordersTableColumns: selectedColumns,
        },
      });

      if (response.data?.success) {
        tToast.success("OrderColumnsSettings.success_save_ba84");
        await refreshCompany(true);
      } else {
        tToast.error("OrderColumnsSettings.failed_save_ed22");
      }
    } catch (error) {
      console.error("Error saving order columns settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Search Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl shrink-0">
              <MagnifyingGlassIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                إعدادات شريط التنقل العلوي
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                تفعيل أو تعطيل ظهور مربع البحث عن الطلبات في شريط التنقل العلوي للوحة التحكم
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              showSearchInHeader
                ? "bg-blue-600"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
            role="switch"
            aria-checked={showSearchInHeader}
            onClick={handleToggleSearchInHeader}
            disabled={savingSearchToggle}
          >
            <span className="sr-only">إظهار البحث في الهيدر</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showSearchInHeader
                  ? "-translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              أعمدة صفحة الطلبات
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              اختر الأعمدة التي تريد إظهارها في جدول الطلبات.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              تحديد الكل
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              إعادة الضبط
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COLUMN_OPTIONS.map((column) => {
            const disabled = column.required;
            return (
              <label
                key={column.id}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  isSelected(column.id)
                    ? "border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                } ${disabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {column.label}
                  </div>
                  {disabled && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      عمود أساسي
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            عمود رقم الطلب إلزامي ولا يمكن إخفاؤه.
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderColumnsSettings;
