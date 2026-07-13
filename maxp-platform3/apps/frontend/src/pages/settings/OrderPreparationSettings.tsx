import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowPathIcon,
  BellIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";

interface WarehouseOption {
  id: string;
  name: string;
}

interface StatusOption {
  code: string;
  name: string;
}

interface PreparationQcChecks {
  quantity: boolean;
  variant: boolean;
  packaging: boolean;
  accessories: boolean;
  invoiceSlip: boolean;
}

interface PreparationSlipDocumentSettings {
  documentTitle: string;
  documentSubtitle: string;
  accentColor: string;
  pageSize: "A4" | "A5";
  pageOrientation: "portrait" | "landscape";
  showCompanyName: boolean;
  showCustomerEmail: boolean;
  showOrderNotes: boolean;
  showPaymentSummary: boolean;
  showFinancialSummary: boolean;
  showItemSku: boolean;
  showItemDetails: boolean;
  showItemColor: boolean;
  showItemSize: boolean;
  showItemPrice: boolean;
  showItemTotal: boolean;
  preparationInstructions: string;
  footerNote: string;
}

interface PreparationSettingsState {
  enabled: boolean;
  defaultWarehouseId: string;
  startingStatus: string;
  handoffStatus: string;
  autoReserveStock: boolean;
  requireStockBeforePreparing: boolean;
  allowPartialPreparation: boolean;
  allowCrossWarehouseTransfer: boolean;
  enableQcChecklist: boolean;
  qcChecks: PreparationQcChecks;
  enableBulkStatusUpdate: boolean;
  enableBulkWarehouseAssignment: boolean;
  enableBulkReserve: boolean;
  prioritizeShortageOrders: boolean;
  notifyOnPreparing: boolean;
  notifyOnPackaged: boolean;
  notifyOnReadyToShip: boolean;
  preparingSlaHours: number;
  packingSlaHours: number;
  handoffSlaHours: number;
  slipDocument: PreparationSlipDocumentSettings;
}

const FALLBACK_PREPARATION_STATUSES: StatusOption[] = [
  { code: "PENDING_PREPARATION", name: "في انتظار التجهيز" },
  { code: "PREPARING", name: "قيد التجهيز" },
  { code: "QUALITY_CHECK", name: "فحص الجودة" },
  { code: "PACKAGED", name: "تم التغليف" },
];

const FALLBACK_HANDOFF_STATUSES: StatusOption[] = [
  { code: "READY_TO_SHIP", name: "جاهز للشحن" },
];

const DEFAULT_SLIP_DOCUMENT_SETTINGS: PreparationSlipDocumentSettings = {
  documentTitle: "ورقة التجهيز",
  documentSubtitle: "مستند داخلي لفريق المخزن والتغليف قبل التسليم لشركة الشحن",
  accentColor: "#2563eb",
  pageSize: "A4",
  pageOrientation: "portrait",
  showCompanyName: true,
  showCustomerEmail: false,
  showOrderNotes: true,
  showPaymentSummary: true,
  showFinancialSummary: true,
  showItemSku: true,
  showItemDetails: true,
  showItemColor: true,
  showItemSize: true,
  showItemPrice: true,
  showItemTotal: true,
  preparationInstructions: "راجع الكمية والمقاس واللون قبل التسليم.",
  footerNote: "تم إنشاء هذا المستند تلقائياً من إدارة الطلبات.",
};

const DEFAULT_SETTINGS: PreparationSettingsState = {
  enabled: true,
  defaultWarehouseId: "",
  startingStatus: "PENDING_PREPARATION",
  handoffStatus: "READY_TO_SHIP",
  autoReserveStock: true,
  requireStockBeforePreparing: true,
  allowPartialPreparation: false,
  allowCrossWarehouseTransfer: true,
  enableQcChecklist: true,
  qcChecks: {
    quantity: true,
    variant: true,
    packaging: true,
    accessories: false,
    invoiceSlip: true,
  },
  enableBulkStatusUpdate: true,
  enableBulkWarehouseAssignment: false,
  enableBulkReserve: true,
  prioritizeShortageOrders: true,
  notifyOnPreparing: false,
  notifyOnPackaged: true,
  notifyOnReadyToShip: true,
  preparingSlaHours: 6,
  packingSlaHours: 4,
  handoffSlaHours: 2,
  slipDocument: DEFAULT_SLIP_DOCUMENT_SETTINGS,
};

const buildSettingsState = (
  rawValue: Partial<PreparationSettingsState> | null | undefined,
): PreparationSettingsState => {
  const safeValue =
    rawValue && typeof rawValue === "object" ? rawValue : undefined;

  return {
    ...DEFAULT_SETTINGS,
    ...safeValue,
    qcChecks: {
      ...DEFAULT_SETTINGS.qcChecks,
      ...(safeValue?.qcChecks || {}),
    },
    slipDocument: {
      ...DEFAULT_SLIP_DOCUMENT_SETTINGS,
      ...(safeValue?.slipDocument || {}),
    },
  };
};

const normalizeStatuses = (value: unknown): StatusOption[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (
        item,
      ): item is {
        code: string;
        name?: string;
        nameAr?: string;
        nameEn?: string;
      } => Boolean(item && typeof item === "object" && "code" in item),
    )
    .map((item) => ({
      code: String(item.code).toUpperCase(),
      name: item.name || item.nameAr || item.nameEn || item.code,
    }));
};

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
          checked ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

const OrderPreparationSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PreparationSettingsState>(
    DEFAULT_SETTINGS,
  );
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [preparationStatuses, setPreparationStatuses] = useState<StatusOption[]>(
    FALLBACK_PREPARATION_STATUSES,
  );
  const [handoffStatuses, setHandoffStatuses] = useState<StatusOption[]>(
    FALLBACK_HANDOFF_STATUSES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const companyId = user?.companyId || "";

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [companyRes, warehousesRes, preparationStatusesRes, shippingRes] =
          await Promise.all([
            apiClient.get("/companies/current"),
            apiClient.get("/warehouses"),
            apiClient.get("/order-status?statusType=preparation"),
            apiClient.get("/order-status?statusType=shipping"),
          ]);

        const companySettings = companyRes.data?.data?.settings || {};
        setSettings(
          buildSettingsState(companySettings?.orderPreparation || undefined),
        );

        const warehousesPayload: Array<{
          id?: string | number;
          name?: string | null;
        }> = Array.isArray(warehousesRes.data?.data)
          ? warehousesRes.data.data
          : [];
        setWarehouses(
          warehousesPayload.map((warehouse) => ({
            id: String(warehouse.id),
            name: warehouse.name || "مخزن غير مسمى",
          })),
        );

        const nextPreparationStatuses = normalizeStatuses(
          preparationStatusesRes.data?.data,
        );
        if (nextPreparationStatuses.length > 0) {
          setPreparationStatuses(nextPreparationStatuses);
        }

        const nextShippingStatuses = normalizeStatuses(shippingRes.data?.data);
        const readyStatuses = nextShippingStatuses.filter(
          (status) => status.code === "READY_TO_SHIP",
        );
        if (readyStatuses.length > 0) {
          setHandoffStatuses(readyStatuses);
        }
      } catch (error) {
        console.error("Failed to load preparation settings:", error);
        toast.error("تعذر تحميل إعدادات تجهيز الطلبات");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [companyId]);

  const defaultWarehouseName = useMemo(() => {
    return (
      warehouses.find((warehouse) => warehouse.id === settings.defaultWarehouseId)
        ?.name || "بدون مخزن افتراضي"
    );
  }, [settings.defaultWarehouseId, warehouses]);

  const enabledQcChecks = useMemo(() => {
    return Object.values(settings.qcChecks).filter(Boolean).length;
  }, [settings.qcChecks]);

  const enabledSlipColumns = useMemo(() => {
    return [
      settings.slipDocument.showItemSku ? "SKU" : null,
      settings.slipDocument.showItemDetails ? "التفاصيل" : null,
      settings.slipDocument.showItemColor ? "اللون" : null,
      settings.slipDocument.showItemSize ? "المقاس" : null,
      settings.slipDocument.showItemPrice ? "السعر" : null,
      settings.slipDocument.showItemTotal ? "الإجمالي" : null,
    ].filter(Boolean) as string[];
  }, [settings.slipDocument]);

  const updateSetting = <K extends keyof PreparationSettingsState>(
    key: K,
    value: PreparationSettingsState[K],
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateQcCheck = (key: keyof PreparationQcChecks, value: boolean) => {
    setSettings((previous) => ({
      ...previous,
      qcChecks: {
        ...previous.qcChecks,
        [key]: value,
      },
    }));
  };

  const updateSlipDocumentSetting = <
    K extends keyof PreparationSlipDocumentSettings,
  >(
    key: K,
    value: PreparationSlipDocumentSettings[K],
  ) => {
    setSettings((previous) => ({
      ...previous,
      slipDocument: {
        ...previous.slipDocument,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("لا يمكن تحديد الشركة الحالية");
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/companies/${companyId}`, {
        settings: {
          orderPreparation: settings,
        },
      });
      toast.success("تم حفظ إعدادات تجهيز الطلبات");
    } catch (error) {
      console.error("Failed to save preparation settings:", error);
      toast.error("فشل حفظ إعدادات تجهيز الطلبات");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(buildSettingsState(DEFAULT_SETTINGS));
    toast.success("تم استرجاع الإعدادات الافتراضية داخل النموذج");
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            جاري تحميل إعدادات تجهيز الطلبات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-6 shadow-sm dark:border-orange-900/40 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white/80 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-gray-900/60 dark:text-orange-300">
              <CubeIcon className="h-4 w-4" />
              Fulfillment Settings
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              إعدادات تجهيز الطلبات
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              تحكم في قواعد تشغيل صفحة التجهيز، سياسات المخزون، فحص الجودة،
              والإجراءات الجماعية الخاصة بالمخزن.
            </p>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              يتم حفظ هذه الإعدادات داخل إعدادات الشركة الحالية حتى تكون متاحة
              لجميع المستخدمين داخل نفس الشركة.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
            <div className="font-semibold">
              {settings.enabled ? "المسار مفعل" : "المسار متوقف"}
            </div>
            <div className="mt-1 text-xs opacity-80">
              المخزن الافتراضي: {defaultWarehouseName}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                الحالة الافتتاحية
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {preparationStatuses.find(
                  (status) => status.code === settings.startingStatus,
                )?.name || settings.startingStatus}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                نقاط فحص الجودة
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {enabledQcChecks} عناصر
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-cyan-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تنبيه الجاهزية للشحن
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {settings.notifyOnReadyToShip ? "مفعل" : "متوقف"}
              </p>
            </div>
            <BellIcon className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                زمن التسليم للشحن
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {settings.handoffSlaHours} ساعة
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-violet-500" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تشغيل المسار
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                الإعدادات الأساسية التي تتحكم في رحلة الطلب داخل المخزن.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              title="تفعيل صفحة تجهيز الطلبات"
              description="إظهار الصفحة كجزء من workflow التشغيل اليومي للمخزن."
              checked={settings.enabled}
              onChange={(value) => updateSetting("enabled", value)}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  المخزن الافتراضي
                </span>
                <select
                  value={settings.defaultWarehouseId}
                  onChange={(event) =>
                    updateSetting("defaultWarehouseId", event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">بدون افتراضي</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  أول مرحلة
                </span>
                <select
                  value={settings.startingStatus}
                  onChange={(event) =>
                    updateSetting("startingStatus", event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {preparationStatuses.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                حالة التسليم للشحن
              </span>
              <select
                value={settings.handoffStatus}
                onChange={(event) =>
                  updateSetting("handoffStatus", event.target.value)
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {handoffStatuses.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <BuildingStorefrontIcon className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                سياسات المخزن
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                كيف يتعامل النظام مع الجاهزية والنقص والتحويل بين المخازن.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              title="حجز المخزون تلقائيًا"
              description="عند بدء التجهيز يتم اعتبار الكميات مرتبطة بالطلب لتقليل التضارب."
              checked={settings.autoReserveStock}
              onChange={(value) => updateSetting("autoReserveStock", value)}
            />

            <ToggleRow
              title="اشتراط توفر المخزون قبل بدء التجهيز"
              description="منع التحريك إلى قيد التجهيز إذا كانت المنتجات غير مكتملة."
              checked={settings.requireStockBeforePreparing}
              onChange={(value) =>
                updateSetting("requireStockBeforePreparing", value)
              }
            />

            <ToggleRow
              title="السماح بالتجهيز الجزئي"
              description="تمكين تجهيز الأجزاء المتاحة من الطلب حتى مع وجود نواقص."
              checked={settings.allowPartialPreparation}
              onChange={(value) =>
                updateSetting("allowPartialPreparation", value)
              }
            />

            <ToggleRow
              title="السماح بالتحويل بين المخازن"
              description="إبراز خيار النقل من مخزن آخر عند وجود عجز في الكمية."
              checked={settings.allowCrossWarehouseTransfer}
              onChange={(value) =>
                updateSetting("allowCrossWarehouseTransfer", value)
              }
            />

            <ToggleRow
              title="إعطاء أولوية للطلبات التي بها نقص"
              description="تمييز الطلبات المتعثرة في الواجهة حتى يراجعها فريق المخزن أولًا."
              checked={settings.prioritizeShortageOrders}
              onChange={(value) =>
                updateSetting("prioritizeShortageOrders", value)
              }
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-cyan-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                فحص الجودة
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                متى يتم تفعيل مراجعة الجودة، وما هي العناصر الإلزامية قبل
                التغليف.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              title="تفعيل قائمة فحص الجودة"
              description="إضافة خطوة QA قبل إنهاء التجهيز وتحويل الطلب للتغليف."
              checked={settings.enableQcChecklist}
              onChange={(value) => updateSetting("enableQcChecklist", value)}
            />

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <h4 className="font-medium text-gray-900 dark:text-white">
                عناصر الفحص المطلوبة
              </h4>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  {
                    key: "quantity" as const,
                    label: "مراجعة الكمية",
                  },
                  {
                    key: "variant" as const,
                    label: "مراجعة المقاس / اللون",
                  },
                  {
                    key: "packaging" as const,
                    label: "سلامة التغليف",
                  },
                  {
                    key: "accessories" as const,
                    label: "الملحقات والإكسسوارات",
                  },
                  {
                    key: "invoiceSlip" as const,
                    label: "إرفاق الورقة الداخلية",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={settings.qcChecks[item.key]}
                      onChange={(event) =>
                        updateQcCheck(item.key, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-5 w-5 text-sky-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ورقة التجهيز المطبوعة
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    تحكم في شكل المستند الذي يخرج عند طباعة ورقة التجهيز من
                    صفحة الطلب أو من صفحة التشغيل.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-100">
              <div className="font-semibold">
                {settings.slipDocument.pageSize} /{" "}
                {settings.slipDocument.pageOrientation === "portrait"
                  ? "رأسي"
                  : "أفقي"}
              </div>
              <div className="mt-1 text-xs opacity-80">
                الأعمدة الإضافية:{" "}
                {enabledSlipColumns.length > 0
                  ? enabledSlipColumns.join(" • ")
                  : "عرض أساسي فقط"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-5 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
              <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  الهوية والإخراج
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  عنوان الورقة، النص التعريفي، اللون الرئيسي، ومقاس الصفحة.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    عنوان المستند
                  </span>
                  <input
                    type="text"
                    value={settings.slipDocument.documentTitle}
                    onChange={(event) =>
                      updateSlipDocumentSetting(
                        "documentTitle",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    الوصف المختصر
                  </span>
                  <input
                    type="text"
                    value={settings.slipDocument.documentSubtitle}
                    onChange={(event) =>
                      updateSlipDocumentSetting(
                        "documentSubtitle",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    مقاس الصفحة
                  </span>
                  <select
                    value={settings.slipDocument.pageSize}
                    onChange={(event) =>
                      updateSlipDocumentSetting(
                        "pageSize",
                        event.target.value as "A4" | "A5",
                      )
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    اتجاه الصفحة
                  </span>
                  <select
                    value={settings.slipDocument.pageOrientation}
                    onChange={(event) =>
                      updateSlipDocumentSetting(
                        "pageOrientation",
                        event.target.value as "portrait" | "landscape",
                      )
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="portrait">رأسي</option>
                    <option value="landscape">أفقي</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    اللون الرئيسي
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                    <input
                      type="color"
                      value={settings.slipDocument.accentColor}
                      onChange={(event) =>
                        updateSlipDocumentSetting(
                          "accentColor",
                          event.target.value,
                        )
                      }
                      className="h-10 w-12 rounded-xl border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={settings.slipDocument.accentColor}
                      onChange={(event) =>
                        updateSlipDocumentSetting(
                          "accentColor",
                          event.target.value,
                        )
                      }
                      className="w-full bg-transparent text-sm text-gray-900 outline-none dark:text-white"
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <ToggleRow
                  title="إظهار اسم الشركة"
                  description="إظهار اسم الشركة أعلى ورقة التجهيز بجانب عنوان المستند."
                  checked={settings.slipDocument.showCompanyName}
                  onChange={(value) =>
                    updateSlipDocumentSetting("showCompanyName", value)
                  }
                />

                <ToggleRow
                  title="إظهار البريد الإلكتروني"
                  description="إضافة بريد العميل داخل بيانات الشحن إذا كان متوفرًا."
                  checked={settings.slipDocument.showCustomerEmail}
                  onChange={(value) =>
                    updateSlipDocumentSetting("showCustomerEmail", value)
                  }
                />

                <ToggleRow
                  title="إظهار ملاحظات الطلب"
                  description="عرض الملاحظات التي تم تسجيلها على الطلب داخل الورقة."
                  checked={settings.slipDocument.showOrderNotes}
                  onChange={(value) =>
                    updateSlipDocumentSetting("showOrderNotes", value)
                  }
                />
              </div>
            </div>

            <div className="space-y-5 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
              <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  المحتوى الظاهر داخل الورقة
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  تحديد الأعمدة الظاهرة والملخصات المالية والنصوص التشغيلية داخل
                  الطباعة.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  {
                    key: "showItemSku" as const,
                    label: "إظهار SKU",
                  },
                  {
                    key: "showItemDetails" as const,
                    label: "إظهار التفاصيل",
                  },
                  {
                    key: "showItemColor" as const,
                    label: "إظهار اللون",
                  },
                  {
                    key: "showItemSize" as const,
                    label: "إظهار المقاس",
                  },
                  {
                    key: "showItemPrice" as const,
                    label: "إظهار السعر",
                  },
                  {
                    key: "showItemTotal" as const,
                    label: "إظهار الإجمالي",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={settings.slipDocument[item.key]}
                      onChange={(event) =>
                        updateSlipDocumentSetting(item.key, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div className="space-y-4">
                <ToggleRow
                  title="إظهار ملخص الدفع"
                  description="عرض طريقة الدفع وحالة الدفع وقيمة التحصيل داخل الورقة."
                  checked={settings.slipDocument.showPaymentSummary}
                  onChange={(value) =>
                    updateSlipDocumentSetting("showPaymentSummary", value)
                  }
                />

                <ToggleRow
                  title="إظهار الملخص المالي"
                  description="عرض المجموع الفرعي، الشحن، الضريبة، الخصم والإجمالي."
                  checked={settings.slipDocument.showFinancialSummary}
                  onChange={(value) =>
                    updateSlipDocumentSetting("showFinancialSummary", value)
                  }
                />
              </div>

              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  تعليمات التجهيز
                </span>
                <textarea
                  rows={3}
                  value={settings.slipDocument.preparationInstructions}
                  onChange={(event) =>
                    updateSlipDocumentSetting(
                      "preparationInstructions",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  نص الفوتر
                </span>
                <textarea
                  rows={2}
                  value={settings.slipDocument.footerNote}
                  onChange={(event) =>
                    updateSlipDocumentSetting("footerNote", event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="h-5 w-5 text-violet-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الإجراءات الجماعية
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تحديد ما الذي يمكن لفريق المخزن تنفيذه دفعة واحدة من الصفحة
                التشغيلية.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              title="تحديث المرحلة جماعيًا"
              description="السماح بتحريك أكثر من طلب لمرحلة واحدة في نفس الوقت."
              checked={settings.enableBulkStatusUpdate}
              onChange={(value) =>
                updateSetting("enableBulkStatusUpdate", value)
              }
            />

            <ToggleRow
              title="تعيين مخزن جماعيًا"
              description="إتاحة تعيين مخزن افتراضي لمجموعة طلبات من نفس الصفحة."
              checked={settings.enableBulkWarehouseAssignment}
              onChange={(value) =>
                updateSetting("enableBulkWarehouseAssignment", value)
              }
            />

            <ToggleRow
              title="حجز المخزون جماعيًا"
              description="إتاحة تنفيذ reserve لعدة طلبات مرة واحدة."
              checked={settings.enableBulkReserve}
              onChange={(value) => updateSetting("enableBulkReserve", value)}
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  عند تفعيل الإجراءات الجماعية، يفضّل مراجعة صلاحيات المستخدمين
                  من مسار الطلبات والصلاحيات للتأكد من أن التنفيذ محكوم بشكل
                  صحيح.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BellIcon className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الإشعارات ومؤشرات التأخير
              </h3>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              تنبيهات العميل والفريق، والحدود الزمنية لمراقبة بطء التنفيذ داخل
              المخزن.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <ToggleRow
              title="إشعار عند بدء التجهيز"
              description="يمكن استخدامه لاحقًا مع رسائل الواتساب أو الإشعارات الداخلية."
              checked={settings.notifyOnPreparing}
              onChange={(value) => updateSetting("notifyOnPreparing", value)}
            />
            <ToggleRow
              title="إشعار عند اكتمال التغليف"
              description="مفيد لإخطار الفريق بأن الطلب أصبح جاهزًا لخطوة ما قبل الشحن."
              checked={settings.notifyOnPackaged}
              onChange={(value) => updateSetting("notifyOnPackaged", value)}
            />
            <ToggleRow
              title="إشعار عند الجاهزية للشحن"
              description="تجهيز الطلبات التي يمكن تسليمها لشركة الشحن فورًا."
              checked={settings.notifyOnReadyToShip}
              onChange={(value) => updateSetting("notifyOnReadyToShip", value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                SLA التجهيز
              </span>
              <input
                type="number"
                min={1}
                value={settings.preparingSlaHours}
                onChange={(event) =>
                  updateSetting(
                    "preparingSlaHours",
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                SLA التغليف
              </span>
              <input
                type="number"
                min={1}
                value={settings.packingSlaHours}
                onChange={(event) =>
                  updateSetting(
                    "packingSlaHours",
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                SLA التسليم للشحن
              </span>
              <input
                type="number"
                min={1}
                value={settings.handoffSlaHours}
                onChange={(event) =>
                  updateSetting(
                    "handoffSlaHours",
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            حفظ وتطبيق الإعدادات
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            سيتم حفظ القواعد الحالية داخل إعدادات الشركة، ويمكن تعديلها في أي
            وقت من نفس التبويب.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-200"
          >
            <ArrowPathIcon className="h-4 w-4" />
            استرجاع الافتراضي
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
            حفظ إعدادات التجهيز
          </button>
        </div>
      </section>
    </div>
  );
};

export default OrderPreparationSettings;
