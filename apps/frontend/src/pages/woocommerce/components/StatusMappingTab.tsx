import React, { useRef, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import {
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  Plus,
  Search,
  Bot,
  RotateCcw,
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "./shared/StatusBadge";
import { useWooCommerceStatus } from "../hooks/useWooCommerceStatus";
import { Settings } from "../types";

interface StatusMappingTabProps {
  settings: Settings | null;
  settingsForm: any;
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
  saveSettings: () => Promise<void>;
}

const TYPE_META: Record<string, { label: string; name: string; icon: LucideIcon }> = {
  order: { label: "طلب", name: "حالات الطلبات", icon: Package },
  payment: { label: "دفع", name: "حالات الدفع", icon: CreditCard },
  shipping: { label: "شحن", name: "حالات الشحن", icon: Truck },
  preparation: { label: "تجهيز", name: "حالات التجهيز", icon: Settings2 },
};

export const StatusMappingTab: React.FC<StatusMappingTabProps> = ({
  settings,
  settingsForm,
  setSettingsForm,
  saveSettings,
}) => {
  const {
    wooStatuses,
    fetchingStatuses,
    localStatuses,
    localStatusesByType,
    statusColors,
    statusSearch,
    setStatusSearch,
    fetchLocalStatuses,
    fetchWooStatuses,
    autoMapStatuses,
    defaultStatusMapping,
  } = useWooCommerceStatus(settings, settingsForm, setSettingsForm);

  const customStatusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocalStatuses();
  }, [fetchLocalStatuses]);

  useEffect(() => {
    if (settings?.hasCredentials) {
      fetchWooStatuses();
    }
  }, [settings?.hasCredentials, fetchWooStatuses]);

  const filteredStatuses = wooStatuses.filter(
    (s) =>
      s.name.toLowerCase().includes(statusSearch.toLowerCase()) ||
      s.slug.toLowerCase().includes(statusSearch.toLowerCase()),
  );

  const handleStatusChange = (wooSlug: string, localStatus: string) => {
    setSettingsForm((prev: any) => ({
      ...prev,
      statusMapping: {
        ...prev.statusMapping,
        [wooSlug]: localStatus,
      },
    }));
  };

  const handleAddCustomStatus = () => {
    const val = customStatusRef.current?.value?.trim();
    if (val && !settingsForm.statusMapping?.[val]) {
      const newMapping = { ...settingsForm.statusMapping };
      newMapping[val] = "PROCESSING";
      setSettingsForm((prev: any) => ({ ...prev, statusMapping: newMapping }));
      toast.success(`تم إضافة الحالة "${val}"`);
      if (customStatusRef.current) customStatusRef.current.value = "";
    } else if (val && settingsForm.statusMapping?.[val]) {
      tToast.error("StatusMappingTab.msg_d2df");
    }
  };

  const getBorderColor = (mappedValue: string | undefined): string => {
    if (!mappedValue) return "border-r-4 border-r-border/80";
    const color = statusColors[mappedValue];
    if (color) return `border-r-4 [border-right-color:${color}]`;
    return "border-r-4 border-r-border/80";
  };

  const hasAnyTypeStatuses = Object.values(localStatusesByType).some(
    (arr) => arr.length > 0,
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            ربط حالات الطلبات (Status Mapping)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحديد الحالة المقابلة في النظام لكل حالة من حالات WooCommerce المتزامنة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={fetchWooStatuses}
            disabled={fetchingStatuses}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border/60 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            {fetchingStatuses ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <DownloadCloud className="h-3.5 w-3.5 text-primary" />
            )}
            <span>جلب الحالات</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setSettingsForm((prev: any) => ({
                ...prev,
                statusMapping: defaultStatusMapping,
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border/60 transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            <span>الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={autoMapStatuses}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold rounded-lg transition-colors active:scale-[0.98]"
            title="اقتراح الربط تلقائياً بناءً على أسماء الحالات"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>ربط تلقائي</span>
          </button>
          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-xs transition-colors active:scale-[0.98]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>حفظ الخريطة</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* Color Legend */}
        <div className="p-3.5 bg-muted/30 border border-border/50 rounded-lg">
          <div className="text-xs font-semibold text-muted-foreground mb-2.5">
            دليل تصنيف الحالات في النظام:
          </div>
          <div className="space-y-2">
            {Object.entries(TYPE_META).map(([typeKey, meta]) => {
              const typeStatuses = localStatusesByType[typeKey] || [];
              const Icon = meta.icon;
              return (
                <div key={typeKey} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-medium text-foreground ml-2 min-w-[120px] shrink-0 inline-flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{meta.name}:</span>
                  </span>
                  {typeStatuses.length > 0 ? (
                    typeStatuses.map((s) => (
                      <span
                        key={s.value}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-white shadow-2xs"
                        style={{ backgroundColor: s.color || "#6B7280" }}
                      >
                        {s.value}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">جاري التحميل...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن حالة بالاسم أو الرمز البرمجي..."
            value={statusSearch}
            onChange={(e) => setStatusSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-muted/50 rounded-lg text-xs font-semibold text-muted-foreground border border-border/50">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">حالة WooCommerce</div>
            <div className="col-span-1 flex justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <div className="col-span-5">الحالة المقابلة في النظام</div>
          </div>

          <div className="space-y-1.5">
            {filteredStatuses.map((status, index) => {
              const currentMapping = settingsForm.statusMapping?.[status.slug];
              const isMapped = !!currentMapping;
              const borderColor = getBorderColor(
                isMapped ? currentMapping : undefined,
              );

              return (
                <div
                  key={status.slug}
                  className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors ${borderColor}`}
                >
                  <div className="col-span-1 text-muted-foreground flex flex-col items-center font-mono text-xs">
                    <span>{index + 1}</span>
                    {status.isCustom && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1 rounded mt-0.5 font-sans">
                        مخصص
                      </span>
                    )}
                  </div>
                  <div className="col-span-5 min-w-0">
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{status.name}</span>
                      <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/40">
                        {status.slug}
                      </code>
                    </div>
                    {status.nameEn && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {status.nameEn}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center text-muted-foreground">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                  <div className="col-span-5">
                    <select
                      value={settingsForm.statusMapping?.[status.slug] || ""}
                      onChange={(e) =>
                        handleStatusChange(status.slug, e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                      style={
                        isMapped && statusColors[currentMapping]
                          ? { borderRightColor: statusColors[currentMapping], borderRightWidth: "3px" }
                          : undefined
                      }
                    >
                      <option value="">-- اختر الحالة المقابلة --</option>
                      {Object.entries(localStatusesByType).map(
                        ([typeKey, statuses]) => {
                          const meta = TYPE_META[typeKey];
                          if (statuses.length === 0) return null;
                          return (
                            <optgroup key={typeKey} label={`── ${meta?.name || typeKey} ──`}>
                              {statuses.map((s) => (
                                <option key={`${typeKey}-${s.value}`} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        },
                      )}
                      {!hasAnyTypeStatuses &&
                        localStatuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Custom Status */}
          <div className="mt-5 pt-4 border-t border-border/60">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>إضافة حالة مخصصة</span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-muted/20 p-3 rounded-lg border border-border/60">
              <div className="flex-1">
                <input
                  ref={customStatusRef}
                  type="text"
                  placeholder="مثال: driver-assigned"
                  className="w-full px-3 py-1.5 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomStatus();
                  }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  أدخل الاسم البرمجي (slug) للحالة المخصصة في متجر WooCommerce
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomStatus}
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold transition-colors active:scale-[0.98] shadow-xs shrink-0"
              >
                إضافة
              </button>
            </div>
          </div>

          {/* Current Mappings Preview */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              ملخص الخريطة الحالية:
            </h3>
            <div className="bg-muted/20 rounded-lg p-3 font-mono text-xs overflow-x-auto border border-border/50 max-h-36 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(settingsForm.statusMapping || {}).map(
                  ([key, val]) => (
                    <span
                      key={key}
                      className="px-2 py-1 bg-background border border-border/60 rounded-md flex items-center gap-1.5 text-[11px]"
                    >
                      <span className="text-muted-foreground font-medium">{key}</span>
                      <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                      <StatusBadge status={val as string} />
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusMappingTab;