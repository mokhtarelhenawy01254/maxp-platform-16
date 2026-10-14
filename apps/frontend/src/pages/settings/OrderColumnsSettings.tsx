import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/api";
import { useCompany } from "../../contexts/CompanyContext";
import {
  LayoutGrid,
  Search,
  Check,
  RotateCcw,
  Save,
  Loader2,
  Lock,
  Columns,
  Sparkles,
} from "lucide-react";

const COLUMN_OPTIONS = [
  { id: "orderNumber", label: "رقم الطلب", required: true, en: "Order #" },
  { id: "customer", label: "اسم العميل وبياناته", required: false, en: "Customer" },
  { id: "customerRating", label: "تقييم العميل وموثوقيته", required: false, en: "Rating" },
  { id: "amount", label: "إجمالي المبلغ والعملة", required: false, en: "Amount" },
  { id: "status", label: "حالة الطلب الحالية", required: false, en: "Status" },
  { id: "payment", label: "طريقة وحالة الدفع", required: false, en: "Payment" },
  { id: "date", label: "تاريخ ووقت الإنشاء", required: false, en: "Created At" },
  { id: "actions", label: "أزرار الإجراءات السريعة", required: false, en: "Actions" },
] as const;

const DEFAULT_COLUMNS = COLUMN_OPTIONS.map((col) => col.id);
const REQUIRED_COLUMNS = COLUMN_OPTIONS.filter((col) => col.required).map((col) => col.id);

export const OrderColumnsSettings: React.FC = () => {
  const { company, refreshCompany } = useCompany();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
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
    []
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
      toast.error("فشل حفظ إعدادات الأعمدة");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل إعدادات الأعمدة...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">تخصيص الأعمدة والبحث</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            تخصيص أعمدة جدول الطلبات وشريط البحث
          </h2>
          <p className="text-xs text-muted-foreground">
            تحديد الأعمدة المعروضة لفرق العمل والتحكم في ظهور حقل البحث السريع في الهيدر العلوي
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors active:scale-[0.98]"
          >
            <span>تحديد الكل</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground" />
            <span>إعادة الضبط</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ الأعمدة</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>البحث السريع بالهيدر</span>
            <Search className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {showSearchInHeader ? "ظاهر بالهيدر" : "مخفي"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
              showSearchInHeader
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {showSearchInHeader ? "Active" : "Hidden"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الأعمدة النشطة بالجدول</span>
            <Columns className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {selectedColumns.length} / {COLUMN_OPTIONS.length}
            </span>
            <span className="text-[11px] text-muted-foreground">أعمدة معروضة</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>العمود الإلزامي الأساسي</span>
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">رقم الطلب</span>
            <span className="text-[10px] font-mono text-muted-foreground">Order #</span>
          </div>
        </div>
      </div>

      {/* Single Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
        {/* Row 1: Header Search Toggle */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Search className="w-4 h-4" />
              </span>
              <label
                htmlFor="header-search-toggle"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                شريط البحث السريع في الهيدر العلوي
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-muted text-muted-foreground">
                Top Nav Search
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-8">
              إتاحة حقل البحث عن أرقام الطلبات وأسماء العملاء فورياً من الشريط العلوي الثابت للوحة التحكم دون الحاجة للدخول لصفحة الطلبات أولاً.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="header-search-toggle"
              checked={showSearchInHeader}
              onChange={handleToggleSearchInHeader}
              disabled={savingSearchToggle}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Row 2: Columns Selection Grid */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-foreground">قائمة الأعمدة المتاحة لجدول الطلبات</h3>
              <p className="text-[11px] text-muted-foreground">
                حدد الحقول التي يرغب فريق العمل بمشاهدتها مباشرة عند تصفح الطلبات
              </p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {selectedColumns.length} محددة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {COLUMN_OPTIONS.map((col) => {
              const active = isSelected(col.id);
              const disabled = col.required;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumn(col.id)}
                  disabled={disabled}
                  className={`flex items-start justify-between gap-2 p-3 rounded-lg border text-right transition-all active:scale-[0.98] ${
                    active
                      ? "border-primary bg-primary/10 text-foreground font-medium shadow-2xs"
                      : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  } ${disabled ? "opacity-85 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
                      {disabled && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      {col.en}
                    </span>
                  </div>

                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border mt-0.5 ${
                      active
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit footer */}
        <div className="p-3.5 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
          <span>ملاحظة: عمود رقم الطلب إلزامي للنظام ولا يمكن إخفاؤه لضمان دقة التتبع.</span>
          <span className="font-mono text-[11px]">Columns Config v2.4</span>
        </div>
      </div>
    </div>
  );
};

export default OrderColumnsSettings;
