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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  { code: "CONFIRMED", name: "مؤكد" },
  { code: "PENDING_PREPARATION", name: "في انتظار التجهيز" },
  { code: "PREPARING", name: "قيد التجهيز" },
  { code: "QUALITY_CHECK", name: "فحص الجودة" },
  { code: "PACKAGED", name: "تم التغليف" },
  { code: "READY_TO_SHIP", name: "جاهز للشحن" },
  { code: "STOCK_SHORTAGE", name: "عجز مخزون" },
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
  allowPartialPreparation: true,
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

const PIPELINE_STAGES = [
  { key: "CONFIRMED", label: "مؤكد", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "PENDING_PREPARATION", label: "في انتظار التجهيز", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "PREPARING", label: "قيد التجهيز", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "QUALITY_CHECK", label: "فحص الجودة", color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { key: "PACKAGED", label: "تم التغليف", color: "text-violet-600 bg-violet-50 border-violet-200" },
  { key: "READY_TO_SHIP", label: "جاهز للشحن", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const buildSettingsState = (
  rawValue: Partial<PreparationSettingsState> | null | undefined,
): PreparationSettingsState => {
  const safeValue =
    rawValue && typeof rawValue === "object" ? rawValue : undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...safeValue,
    qcChecks: { ...DEFAULT_SETTINGS.qcChecks, ...(safeValue?.qcChecks || {}) },
    slipDocument: { ...DEFAULT_SLIP_DOCUMENT_SETTINGS, ...(safeValue?.slipDocument || {}) },
  };
};

const normalizeStatuses = (value: unknown): StatusOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { code: string; name?: string; nameAr?: string; nameEn?: string } =>
      Boolean(item && typeof item === "object" && "code" in item),
    )
    .map((item) => ({
      code: String(item.code).toUpperCase(),
      name: item.name || item.nameAr || item.nameEn || item.code,
    }));
};

const OrderPreparationSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PreparationSettingsState>(DEFAULT_SETTINGS);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [preparationStatuses, setPreparationStatuses] = useState<StatusOption[]>(FALLBACK_PREPARATION_STATUSES);
  const [handoffStatuses, setHandoffStatuses] = useState<StatusOption[]>(FALLBACK_HANDOFF_STATUSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");

  const companyId = user?.companyId || "";

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) { setLoading(false); return; }
      try {
        setLoading(true);
        const [companyRes, warehousesRes, preparationStatusesRes, shippingRes] = await Promise.all([
          apiClient.get("/companies/current"),
          apiClient.get("/warehouses"),
          apiClient.get("/order-status?statusType=preparation"),
          apiClient.get("/order-status?statusType=shipping"),
        ]);

        const companySettings = companyRes.data?.data?.settings || {};
        setSettings(buildSettingsState(companySettings?.orderPreparation || undefined));

        const warehousesPayload: Array<{ id?: string | number; name?: string | null }> =
          Array.isArray(warehousesRes.data?.data) ? warehousesRes.data.data : [];
        setWarehouses(warehousesPayload.map((w) => ({ id: String(w.id), name: w.name || "مخزن غير مسمى" })));

        const nextPrep = normalizeStatuses(preparationStatusesRes.data?.data);
        if (nextPrep.length > 0) setPreparationStatuses(nextPrep);

        const nextShip = normalizeStatuses(shippingRes.data?.data);
        const ready = nextShip.filter((s) => s.code === "READY_TO_SHIP");
        if (ready.length > 0) setHandoffStatuses(ready);
      } catch {
        toast.error("تعذر تحميل إعدادات تجهيز الطلبات");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [companyId]);

  const defaultWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === settings.defaultWarehouseId)?.name || "بدون مخزن افتراضي",
    [settings.defaultWarehouseId, warehouses],
  );

  const updateSetting = <K extends keyof PreparationSettingsState>(key: K, value: PreparationSettingsState[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateQcCheck = (key: keyof PreparationQcChecks, value: boolean) =>
    setSettings((prev) => ({ ...prev, qcChecks: { ...prev.qcChecks, [key]: value } }));

  const updateSlip = <K extends keyof PreparationSlipDocumentSettings>(key: K, value: PreparationSlipDocumentSettings[K]) =>
    setSettings((prev) => ({ ...prev, slipDocument: { ...prev.slipDocument, [key]: value } }));

  const handleSave = async () => {
    if (!companyId) { toast.error("لا يمكن تحديد الشركة الحالية"); return; }
    try {
      setSaving(true);
      await apiClient.put(`/companies/${companyId}`, { settings: { orderPreparation: settings } });
      toast.success("تم حفظ إعدادات تجهيز الطلبات");
    } catch {
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
          <p className="mt-4 text-sm text-gray-500">جاري تحميل إعدادات تجهيز الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <CubeIcon className="h-4 w-4" />
              Fulfillment Settings
            </div>
            <CardTitle className="mt-3 text-2xl">إعدادات تجهيز الطلبات</CardTitle>
            <CardDescription>
              تحكم في قواعد تشغيل صفحة التجهيز، سياسات المخزون، فحص الجودة، والإجراءات الجماعية الخاصة بالمخزن.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={settings.enabled ? "default" : "secondary"} className="gap-1 px-3 py-1.5 text-sm">
              {settings.enabled ? "🟢 المسار مفعل" : "⏸ المسار متوقف"}
            </Badge>
            <span className="text-xs text-gray-500">{defaultWarehouseName}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start gap-0 rounded-2xl border bg-gray-50 p-1">
          <TabsTrigger value="pipeline" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CubeIcon className="ml-2 h-4 w-4" />
            مسار التجهيز
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShieldCheckIcon className="ml-2 h-4 w-4" />
            المخزون والجودة
          </TabsTrigger>
          <TabsTrigger value="document" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <DocumentTextIcon className="ml-2 h-4 w-4" />
            ورقة التجهيز
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Pipeline ===== */}
        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">مسار التجهيز</CardTitle>
              <CardDescription>المراحل اللي بيمر بيها الطلب من التأكيد لحد التسليم لشركة الشحن</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pipeline Visual */}
              <div className="mb-8 flex flex-wrap items-center gap-2">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <React.Fragment key={stage.key}>
                    <div className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold ${stage.color}`}>
                      {stage.label}
                    </div>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div className="text-gray-300">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m0 0l-4-4m4 4l-4 4" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>أول مرحلة</Label>
                  <p className="text-xs text-gray-500">الحالة اللي يبدء منها الطلب لما يدخل صفحة التجهيز</p>
                  <Select
                    value={settings.startingStatus}
                    onValueChange={(v) => updateSetting("startingStatus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {preparationStatuses.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حالة التسليم للشحن</Label>
                  <p className="text-xs text-gray-500">الحالة اللي لما يوصلها الطلب يبقى جاهز للتسليم لشركة الشحن</p>
                  <Select
                    value={settings.handoffStatus}
                    onValueChange={(v) => updateSetting("handoffStatus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {handoffStatuses.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المخزن</CardTitle>
              <CardDescription>إعدادات المخزن الافتراضي لصفحة التجهيز</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>المخزن الافتراضي</Label>
                  <Select
                    value={settings.defaultWarehouseId}
                    onValueChange={(v) => updateSetting("defaultWarehouseId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="بدون مخزن افتراضي" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون مخزن افتراضي</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 2: Quality & Stock ===== */}
        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سياسات المخزون</CardTitle>
              <CardDescription>كيف يتعامل النظام مع توفر المنتجات والتحويل بين المخازن</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title="حجز المخزون تلقائيًا"
                description="عند بدء التجهيز يتم اعتبار الكميات مرتبطة بالطلب لتقليل التضارب"
                checked={settings.autoReserveStock}
                onChange={(v) => updateSetting("autoReserveStock", v)}
              />
              <ToggleRow
                title="اشتراط توفر المخزون قبل بدء التجهيز"
                description="منع التحريك إلى قيد التجهيز إذا كانت المنتجات غير مكتملة"
                checked={settings.requireStockBeforePreparing}
                onChange={(v) => updateSetting("requireStockBeforePreparing", v)}
              />
              <ToggleRow
                title="السماح بالتجهيز الجزئي"
                description="تمكين تجهيز الأجزاء المتاحة من الطلب حتى مع وجود نواقص"
                checked={settings.allowPartialPreparation}
                onChange={(v) => updateSetting("allowPartialPreparation", v)}
              />
              <ToggleRow
                title="السماح بالتحويل بين المخازن"
                description="إبراز خيار النقل من مخزن آخر عند وجود عجز في الكمية"
                checked={settings.allowCrossWarehouseTransfer}
                onChange={(v) => updateSetting("allowCrossWarehouseTransfer", v)}
              />
              <ToggleRow
                title="إعطاء أولوية للطلبات التي بها نقص"
                description="تمييز الطلبات المتعثرة في الواجهة حتى يراجعها فريق المخزن أولًا"
                checked={settings.prioritizeShortageOrders}
                onChange={(v) => updateSetting("prioritizeShortageOrders", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">فحص الجودة</CardTitle>
              <CardDescription>متى يتم تفعيل مراجعة الجودة، وما هي العناصر الإلزامية قبل التغليف</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="تفعيل قائمة فحص الجودة"
                description="إضافة خطوة QA قبل إنهاء التجهيز وتحويل الطلب للتغليف"
                checked={settings.enableQcChecklist}
                onChange={(v) => updateSetting("enableQcChecklist", v)}
              />

              {settings.enableQcChecklist && (
                <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-gray-50 p-4 md:grid-cols-3">
                  {[
                    { key: "quantity" as const, label: "مراجعة الكمية" },
                    { key: "variant" as const, label: "مراجعة المقاس / اللون" },
                    { key: "packaging" as const, label: "سلامة التغليف" },
                    { key: "accessories" as const, label: "الملحقات والإكسسوارات" },
                    { key: "invoiceSlip" as const, label: "إرفاق الورقة الداخلية" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm hover:bg-gray-50"
                    >
                      <Switch
                        checked={settings.qcChecks[item.key]}
                        onCheckedChange={(v) => updateQcCheck(item.key, v)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الإجراءات الجماعية</CardTitle>
              <CardDescription>تحديد ما الذي يمكن لفريق المخزن تنفيذه دفعة واحدة من الصفحة التشغيلية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title="تحديث المرحلة جماعيًا"
                description="السماح بتحريك أكثر من طلب لمرحلة واحدة في نفس الوقت"
                checked={settings.enableBulkStatusUpdate}
                onChange={(v) => updateSetting("enableBulkStatusUpdate", v)}
              />
              <ToggleRow
                title="تعيين مخزن جماعيًا"
                description="إتاحة تعيين مخزن افتراضي لمجموعة طلبات من نفس الصفحة"
                checked={settings.enableBulkWarehouseAssignment}
                onChange={(v) => updateSetting("enableBulkWarehouseAssignment", v)}
              />
              <ToggleRow
                title="حجز المخزون جماعيًا"
                description="إتاحة تنفيذ reserve لعدة طلبات مرة واحدة"
                checked={settings.enableBulkReserve}
                onChange={(v) => updateSetting("enableBulkReserve", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الإشعارات ومؤشرات التأخير</CardTitle>
              <CardDescription>تنبيهات العميل والفريق، والحدود الزمنية لمراقبة بطء التنفيذ داخل المخزن</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title="إشعار عند بدء التجهيز"
                description="يمكن استخدامه لاحقًا مع رسائل الواتساب أو الإشعارات الداخلية"
                checked={settings.notifyOnPreparing}
                onChange={(v) => updateSetting("notifyOnPreparing", v)}
              />
              <ToggleRow
                title="إشعار عند اكتمال التغليف"
                description="مفيد لإخطار الفريق بأن الطلب أصبح جاهزًا لخطوة ما قبل الشحن"
                checked={settings.notifyOnPackaged}
                onChange={(v) => updateSetting("notifyOnPackaged", v)}
              />
              <ToggleRow
                title="إشعار عند الجاهزية للشحن"
                description="تجهيز الطلبات التي يمكن تسليمها لشركة الشحن فورًا"
                checked={settings.notifyOnReadyToShip}
                onChange={(v) => updateSetting("notifyOnReadyToShip", v)}
              />

              <Separator className="my-2" />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">SLA التجهيز (ساعة)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.preparingSlaHours}
                    onChange={(e) => updateSetting("preparingSlaHours", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SLA التغليف (ساعة)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.packingSlaHours}
                    onChange={(e) => updateSetting("packingSlaHours", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SLA التسليم للشحن (ساعة)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.handoffSlaHours}
                    onChange={(e) => updateSetting("handoffSlaHours", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 3: Document ===== */}
        <TabsContent value="document" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">إعدادات ورقة التجهيز</CardTitle>
                <CardDescription>تحكم في شكل المستند الذي يخرج عند طباعة ورقة التجهيز</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>عنوان المستند</Label>
                  <Input
                    value={settings.slipDocument.documentTitle}
                    onChange={(e) => updateSlip("documentTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الوصف المختصر</Label>
                  <Input
                    value={settings.slipDocument.documentSubtitle}
                    onChange={(e) => updateSlip("documentSubtitle", e.target.value)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>مقاس الصفحة</Label>
                    <Select
                      value={settings.slipDocument.pageSize}
                      onValueChange={(v: "A4" | "A5") => updateSlip("pageSize", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>اتجاه الصفحة</Label>
                    <Select
                      value={settings.slipDocument.pageOrientation}
                      onValueChange={(v: "portrait" | "landscape") => updateSlip("pageOrientation", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">رأسي</SelectItem>
                        <SelectItem value="landscape">أفقي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>اللون الرئيسي</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.slipDocument.accentColor}
                      onChange={(e) => updateSlip("accentColor", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border p-0.5"
                    />
                    <Input
                      value={settings.slipDocument.accentColor}
                      onChange={(e) => updateSlip("accentColor", e.target.value)}
                      className="w-32 font-mono"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base">الأعمدة الظاهرة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "showCompanyName" as const, label: "إظهار اسم الشركة" },
                      { key: "showCustomerEmail" as const, label: "إظهار البريد الإلكتروني" },
                      { key: "showOrderNotes" as const, label: "إظهار ملاحظات الطلب" },
                      { key: "showPaymentSummary" as const, label: "إظهار ملخص الدفع" },
                      { key: "showFinancialSummary" as const, label: "إظهار الملخص المالي" },
                    ].map((item) => (
                      <ToggleRow
                        key={item.key}
                        title={item.label}
                        description=""
                        checked={settings.slipDocument[item.key]}
                        onChange={(v) => updateSlip(item.key, v)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base">أعمدة المنتجات</Label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {[
                      { key: "showItemSku" as const, label: "SKU" },
                      { key: "showItemDetails" as const, label: "التفاصيل" },
                      { key: "showItemColor" as const, label: "اللون" },
                      { key: "showItemSize" as const, label: "المقاس" },
                      { key: "showItemPrice" as const, label: "السعر" },
                      { key: "showItemTotal" as const, label: "الإجمالي" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <Switch
                          checked={settings.slipDocument[item.key]}
                          onCheckedChange={(v) => updateSlip(item.key, v)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>تعليمات التجهيز</Label>
                  <Textarea
                    value={settings.slipDocument.preparationInstructions}
                    onChange={(e) => updateSlip("preparationInstructions", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>نص الفوتر</Label>
                  <Textarea
                    value={settings.slipDocument.footerNote}
                    onChange={(e) => updateSlip("footerNote", e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card className="xl:sticky xl:top-4 xl:self-start">
              <CardHeader>
                <CardTitle className="text-lg">معاينة</CardTitle>
                <CardDescription>شكل ورقة التجهيز بعد الطباعة</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="overflow-hidden rounded-xl border-2 bg-white p-6 shadow-sm"
                  style={{
                    backgroundColor: "#fff",
                    color: "#1f2937",
                    minHeight: 300,
                  }}
                >
                  {/* Header */}
                  <div className="mb-4 border-b-2 pb-3" style={{ borderColor: settings.slipDocument.accentColor }}>
                    <h3 className="text-lg font-bold" style={{ color: settings.slipDocument.accentColor }}>
                      {settings.slipDocument.documentTitle}
                    </h3>
                    {settings.slipDocument.showCompanyName && (
                      <p className="mt-1 text-xs text-gray-600">اسم الشركة: شركة كذا</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">{settings.slipDocument.documentSubtitle}</p>
                  </div>

                  {/* Instructions */}
                  {settings.slipDocument.preparationInstructions && (
                    <div className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                      📋 {settings.slipDocument.preparationInstructions}
                    </div>
                  )}

                  {/* Table */}
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: `${settings.slipDocument.accentColor}30` }}>
                        {settings.slipDocument.showItemSku && <th className="p-1.5 text-right font-semibold">SKU</th>}
                        {settings.slipDocument.showItemDetails && <th className="p-1.5 text-right font-semibold">المنتج</th>}
                        {settings.slipDocument.showItemColor && <th className="p-1.5 text-right font-semibold">اللون</th>}
                        {settings.slipDocument.showItemSize && <th className="p-1.5 text-right font-semibold">المقاس</th>}
                        <th className="p-1.5 text-right font-semibold">الكمية</th>
                        {settings.slipDocument.showItemPrice && <th className="p-1.5 text-right font-semibold">السعر</th>}
                        {settings.slipDocument.showItemTotal && <th className="p-1.5 text-right font-semibold">الإجمالي</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        {settings.slipDocument.showItemSku && <td className="p-1.5">SKU-001</td>}
                        {settings.slipDocument.showItemDetails && <td className="p-1.5">Şık Sole</td>}
                        {settings.slipDocument.showItemColor && <td className="p-1.5">رصاصي</td>}
                        {settings.slipDocument.showItemSize && <td className="p-1.5">37</td>}
                        <td className="p-1.5">١</td>
                        {settings.slipDocument.showItemPrice && <td className="p-1.5">٧٢٠ ج.م</td>}
                        {settings.slipDocument.showItemTotal && <td className="p-1.5">٧٢٠ ج.م</td>}
                      </tr>
                    </tbody>
                  </table>

                  {/* Summary */}
                  {settings.slipDocument.showFinancialSummary && (
                    <div className="mt-3 space-y-0.5 border-t pt-2 text-xs">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>٧٢٠ ج.م</span></div>
                      <div className="flex justify-between"><span>الشحن</span><span>١١٠ ج.م</span></div>
                      <div className="flex justify-between font-bold"><span>الإجمالي</span><span>٨٣٠ ج.م</span></div>
                    </div>
                  )}

                  {/* Payment */}
                  {settings.slipDocument.showPaymentSummary && (
                    <div className="mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                      💰 الدفع: ٨٣٠ ج.م عند الاستلام
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 border-t pt-2 text-xs text-gray-400">
                    {settings.slipDocument.footerNote}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save / Reset */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border bg-gray-50 p-4">
        <p className="text-sm text-gray-600">سيتم حفظ القواعد الحالية داخل إعدادات الشركة، ويمكن تعديلها في أي وقت</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <ArrowPathIcon className="ml-2 h-4 w-4" />
            استرجاع الافتراضي
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ إعدادات التجهيز"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3 hover:bg-gray-50">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default OrderPreparationSettings;
