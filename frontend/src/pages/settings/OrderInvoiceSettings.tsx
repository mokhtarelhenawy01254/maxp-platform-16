import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  FileOutput,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  PackageCheck,
  Palette,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  ScanText,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsSection,
  SettingsStatusAlert,
} from "./components/SettingsPagePrimitives";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";

type InvoiceSettings = {
  autoGenerate: boolean;
  autoGenerateOnStatus: string;
  invoicePrefix: string;
  invoiceNumberFormat: string;
  defaultTaxRate: number;
  defaultTerms: string;
  defaultNotes: string;
  defaultDueDays: number;
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  autoEmailToCustomer: boolean;
  emailSubject: string;
  emailBody: string;
  pdfPageSize: "A4" | "Letter" | "Legal";
  pdfOrientation: "portrait" | "landscape";
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
};

type SlipSettings = {
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
};

type SettingsMessageState = {
  type: "success" | "error";
  text: string;
};

type SettingsTabValue = "invoice" | "print" | "slip";

const defaultInvoice: InvoiceSettings = {
  autoGenerate: false,
  autoGenerateOnStatus: "",
  invoicePrefix: "INV",
  invoiceNumberFormat: "INV-YYYYMMDD-XXXXXX",
  defaultTaxRate: 0,
  defaultTerms: "",
  defaultNotes: "",
  defaultDueDays: 7,
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  autoEmailToCustomer: false,
  emailSubject: "",
  emailBody: "",
  pdfPageSize: "A4",
  pdfOrientation: "portrait",
  primaryColor: "#4F46E5",
  secondaryColor: "#6B7280",
  fontFamily: "Arial",
};

const defaultSlip: SlipSettings = {
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

const invoiceFlags = [
  ["showCompanyLogo", "عرض شعار الشركة"],
  ["showTaxBreakdown", "عرض تفاصيل الضريبة"],
  ["showPaymentMethod", "عرض طريقة الدفع"],
  ["showOrderItems", "عرض تفاصيل المنتجات"],
] as const;

const slipFlags = [
  ["showCompanyName", "إظهار اسم الشركة"],
  ["showCustomerEmail", "إظهار بريد العميل"],
  ["showOrderNotes", "إظهار ملاحظات الطلب"],
  ["showPaymentSummary", "إظهار ملخص الدفع"],
  ["showFinancialSummary", "إظهار الملخص المالي"],
  ["showItemSku", "إظهار SKU"],
  ["showItemDetails", "إظهار التفاصيل"],
  ["showItemColor", "إظهار اللون"],
  ["showItemSize", "إظهار المقاس"],
  ["showItemPrice", "إظهار السعر"],
  ["showItemTotal", "إظهار الإجمالي"],
] as const;

const statuses = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
] as const;

const labelForStatus = (status: string) =>
  (
    {
      "": "اختر الحالة",
      CONFIRMED: "مؤكد",
      PROCESSING: "قيد المعالجة",
      SHIPPED: "تم الشحن",
      DELIVERED: "تم التوصيل",
      COMPLETED: "مكتمل",
    } as Record<string, string>
  )[status] || status;

const normalizeInvoice = (
  value: Partial<InvoiceSettings> | null | undefined,
): InvoiceSettings => ({
  ...defaultInvoice,
  ...(value || {}),
  autoGenerateOnStatus: value?.autoGenerateOnStatus || "",
  defaultTerms: value?.defaultTerms || "",
  defaultNotes: value?.defaultNotes || "",
  emailSubject: value?.emailSubject || "",
  emailBody: value?.emailBody || "",
  pdfPageSize:
    value?.pdfPageSize === "Letter" || value?.pdfPageSize === "Legal"
      ? value.pdfPageSize
      : "A4",
  pdfOrientation:
    value?.pdfOrientation === "landscape" ? "landscape" : "portrait",
});

const normalizeSlip = (
  value: Partial<SlipSettings> | null | undefined,
): SlipSettings => ({
  ...defaultSlip,
  ...(value || {}),
  documentTitle: value?.documentTitle || defaultSlip.documentTitle,
  documentSubtitle: value?.documentSubtitle || defaultSlip.documentSubtitle,
  accentColor: value?.accentColor || defaultSlip.accentColor,
  pageSize: value?.pageSize === "A5" ? "A5" : "A4",
  pageOrientation:
    value?.pageOrientation === "landscape" ? "landscape" : "portrait",
  preparationInstructions:
    value?.preparationInstructions || defaultSlip.preparationInstructions,
  footerNote: value?.footerNote || defaultSlip.footerNote,
  showCompanyName:
    typeof value?.showCompanyName === "boolean"
      ? value.showCompanyName
      : defaultSlip.showCompanyName,
  showCustomerEmail:
    typeof value?.showCustomerEmail === "boolean"
      ? value.showCustomerEmail
      : defaultSlip.showCustomerEmail,
  showOrderNotes:
    typeof value?.showOrderNotes === "boolean"
      ? value.showOrderNotes
      : defaultSlip.showOrderNotes,
  showPaymentSummary:
    typeof value?.showPaymentSummary === "boolean"
      ? value.showPaymentSummary
      : defaultSlip.showPaymentSummary,
  showFinancialSummary:
    typeof value?.showFinancialSummary === "boolean"
      ? value.showFinancialSummary
      : defaultSlip.showFinancialSummary,
  showItemSku:
    typeof value?.showItemSku === "boolean"
      ? value.showItemSku
      : defaultSlip.showItemSku,
  showItemDetails:
    typeof value?.showItemDetails === "boolean"
      ? value.showItemDetails
      : defaultSlip.showItemDetails,
  showItemColor:
    typeof value?.showItemColor === "boolean"
      ? value.showItemColor
      : defaultSlip.showItemColor,
  showItemSize:
    typeof value?.showItemSize === "boolean"
      ? value.showItemSize
      : defaultSlip.showItemSize,
  showItemPrice:
    typeof value?.showItemPrice === "boolean"
      ? value.showItemPrice
      : defaultSlip.showItemPrice,
  showItemTotal:
    typeof value?.showItemTotal === "boolean"
      ? value.showItemTotal
      : defaultSlip.showItemTotal,
});

function ToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-950">{title}</p>
          <p className="text-xs leading-6 text-slate-500">{description}</p>
        </div>
        <Switch
          aria-label={title}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

const orientationLabelMap: Record<
  InvoiceSettings["pdfOrientation"] | SlipSettings["pageOrientation"],
  string
> = {
  portrait: "عمودي",
  landscape: "أفقي",
};

const OrderInvoiceSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<SettingsTabValue>("invoice");
  const [message, setMessage] = useState<SettingsMessageState | null>(null);
  const [companyId, setCompanyId] = useState(user?.companyId || "");
  const [invoice, setInvoice] = useState<InvoiceSettings>(defaultInvoice);
  const [rawPreparation, setRawPreparation] = useState<Record<string, unknown>>(
    {},
  );
  const [slip, setSlip] = useState<SlipSettings>(defaultSlip);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const [invoiceRes, companyRes] = await Promise.all([
        apiClient.get("/order-invoice-settings"),
        apiClient.get("/companies/current"),
      ]);

      if (invoiceRes.data?.success) {
        setInvoice(normalizeInvoice(invoiceRes.data.data));
      }

      const company = companyRes.data?.data;
      if (company?.id) {
        setCompanyId(String(company.id));
      }

      const orderPreparation =
        company?.settings?.orderPreparation &&
        typeof company.settings.orderPreparation === "object"
          ? company.settings.orderPreparation
          : {};

      setRawPreparation(orderPreparation);
      setSlip(normalizeSlip(orderPreparation?.slipDocument));
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "خطأ في تحميل إعدادات الفواتير والطباعة",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveAll = useCallback(async () => {
    if (!companyId) {
      setMessage({
        type: "error",
        text: "تعذر تحديد الشركة الحالية",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      await Promise.all([
        apiClient.put("/order-invoice-settings", invoice),
        apiClient.put(`/companies/${companyId}`, {
          settings: {
            orderPreparation: { ...rawPreparation, slipDocument: slip },
          },
        }),
      ]);

      setRawPreparation((previousValue) => ({
        ...previousValue,
        slipDocument: slip,
      }));
      setMessage({
        type: "success",
        text: "تم حفظ إعدادات الفواتير والطباعة وورقة التجهيز",
      });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "خطأ في حفظ إعدادات الفواتير والطباعة",
      });
    } finally {
      setSaving(false);
    }
  }, [companyId, invoice, rawPreparation, slip]);

  const resetInvoice = useCallback(async () => {
    if (!window.confirm("سيتم إعادة إعدادات الفاتورة فقط. هل تريد المتابعة؟")) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/order-invoice-settings/reset", {});
      setInvoice(normalizeInvoice(response.data?.data));
      setMessage({
        type: "success",
        text: "تمت إعادة إعدادات الفاتورة",
      });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "تعذر إعادة إعدادات الفاتورة",
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const visibleInvoice = useMemo(
    () =>
      invoiceFlags
        .filter(([key]) => invoice[key])
        .map(([, label]) => label)
        .join(" • "),
    [invoice],
  );

  const visibleSlip = useMemo(
    () =>
      slipFlags
        .filter(([key]) => slip[key])
        .map(([, label]) => label.replace("إظهار ", ""))
        .join(" • "),
    [slip],
  );

  const invoiceSummary = `${invoice.pdfPageSize} / ${
    invoice.pdfOrientation === "portrait" ? "رأسي" : "أفقي"
  }`;
  const slipSummary = `${slip.pageSize} / ${
    slip.pageOrientation === "portrait" ? "رأسي" : "أفقي"
  }`;

  if (loading) {
    return (
      <SettingsLoadingState
        title="جاري تحميل مركز الفواتير والطباعة..."
        description="بنراجع لك إعدادات الفاتورة وورقة التجهيز من نفس السطح الحديث."
      />
    );
  }

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel="منصة الفاتورة والإخراج"
        title="مركز الفواتير والطباعة"
        description="صفحة تشغيل موحدة تضبط التوليد الآلي للفواتير، إعدادات قالب الطباعة، والنسخة الداخلية الخاصة بورقة تجهيز الطلبات."
        summaryItems={[
          { label: "الفاتورة", value: invoiceSummary },
          { label: "ورقة التجهيز", value: slipSummary },
          {
            label: "البريد التلقائي",
            value: invoice.autoEmailToCustomer ? "مفعل" : "متوقف",
          },
          {
            label: "التوليد التلقائي",
            value: invoice.autoGenerate ? "يعمل" : "متوقف",
          },
        ]}
        gradientClassName="bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(239,246,255,0.9))]"
      />

      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-3 xl:flex xl:flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-2xl"
              onClick={() => navigate("/orders/invoices")}
            >
              <FileText className="size-4" />
              سجل الفواتير
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-2xl"
              onClick={() => navigate("/orders/invoices/print-multiple")}
            >
              <Printer className="size-4" />
              طباعة متعددة
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-2xl"
              onClick={() => navigate("/settings/orders?tab=preparation")}
            >
              <Workflow className="size-4" />
              تجهيز الطلبات التشغيلي
            </Button>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-2xl"
              onClick={() => {
                void loadSettings();
              }}
              disabled={saving}
            >
              <RefreshCcw className="size-4" />
              إعادة تحميل
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-2xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              onClick={() => {
                void resetInvoice();
              }}
              disabled={saving}
            >
              <RotateCcw className="size-4" />
              إعادة الفاتورة
            </Button>
            <Button
              type="button"
              size="lg"
              className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              onClick={() => {
                void saveAll();
              }}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "جاري الحفظ..." : "حفظ الكل"}
            </Button>
          </div>
        </div>

        <SettingsStatusAlert message={message} />

        <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTabValue)}>
            <TabsList
              variant="line"
              className="h-auto w-full !grid grid-cols-1 gap-2 rounded-none border-b border-slate-200/70 bg-transparent p-0 pb-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {[
                {
                  value: "invoice",
                  label: "الفاتورة",
                  description: "التوليد والترقيم والقيم الافتراضية",
                  icon: FileSpreadsheet,
                },
                {
                  value: "print",
                  label: "الطباعة",
                  description: "المحتوى الظاهر، القالب، والإرسال",
                  icon: FileOutput,
                },
                {
                  value: "slip",
                  label: "ورقة التجهيز",
                  description: "النسخة الداخلية قبل التسليم للشحن",
                  icon: PackageCheck,
                },
              ].map((entry) => {
                const Icon = entry.icon;
                const isActive = tab === entry.value;

                return (
                  <TabsTrigger
                    key={entry.value}
                    value={entry.value}
                    className={cn(
                      "group min-h-[74px] w-full rounded-2xl border px-4 py-3 text-right text-sm font-semibold transition-colors",
                      isActive
                        ? "!border-slate-900 !bg-slate-900 !text-white shadow-sm"
                        : "!border-transparent !bg-slate-50/65 !text-slate-500 hover:!border-slate-200 hover:!bg-slate-50",
                    )}
                  >
                    <div className="flex w-full items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 rounded-xl p-2 ring-1 transition",
                          isActive
                            ? "bg-white/10 text-white ring-white/15"
                            : "bg-white/90 text-slate-700 ring-slate-200/80",
                        )}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="font-bold">{entry.label}</div>
                        <div
                          className={cn(
                            "mt-1 text-xs font-medium leading-5",
                            isActive ? "text-slate-200" : "text-slate-400",
                          )}
                        >
                          {entry.description}
                        </div>
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="invoice" className="space-y-5 pt-0">
              <div className="grid gap-5 xl:grid-cols-2">
                <SettingsSection
                  icon={Settings2}
                  title="التوليد والترقيم"
                  description="حدّد متى يتم إنشاء الفاتورة تلقائيًا وكيف يظهر رقمها داخل السجل وقوالب الطباعة."
                  accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <ToggleCard
                    title="توليد الفواتير تلقائيًا"
                    description="عند التفعيل، يتم إنشاء الفاتورة بمجرد وصول الطلب للحالة التي تختارها."
                    checked={invoice.autoGenerate}
                    onCheckedChange={(checked) =>
                      setInvoice((currentInvoice) => ({
                        ...currentInvoice,
                        autoGenerate: checked,
                      }))
                    }
                  />

                  {invoice.autoGenerate ? (
                    <div className="space-y-2">
                      <Label htmlFor="auto-generate-status">
                        توليد الفاتورة عند الحالة
                      </Label>
                      <Select
                        value={invoice.autoGenerateOnStatus}
                        onValueChange={(value) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            autoGenerateOnStatus: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="auto-generate-status"
                          aria-label="توليد الفاتورة عند الحالة"
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {invoice.autoGenerateOnStatus
                              ? labelForStatus(invoice.autoGenerateOnStatus)
                              : "اختر الحالة"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {labelForStatus(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-prefix">بادئة رقم الفاتورة</Label>
                      <Input
                        id="invoice-prefix"
                        value={invoice.invoicePrefix}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            invoicePrefix: event.target.value,
                          }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-number-format">
                        تنسيق رقم الفاتورة
                      </Label>
                      <Input
                        id="invoice-number-format"
                        value={invoice.invoiceNumberFormat}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            invoiceNumberFormat: event.target.value,
                          }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-dashed border-sky-200 bg-sky-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      معاينة رقم الفاتورة
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-950" dir="ltr">
                      {invoice.invoicePrefix || "INV"}-20260429-000001
                    </p>
                  </div>
                </SettingsSection>

                <SettingsSection
                  icon={ScanText}
                  title="القيم الافتراضية"
                  description="قِيَم تبدأ بها كل فاتورة جديدة لتقليل الإدخال المتكرر لفريق التشغيل والحسابات."
                  accentClassName="bg-indigo-50 text-indigo-700 ring-indigo-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-tax-rate">الضريبة الافتراضية</Label>
                      <Input
                        id="default-tax-rate"
                        type="number"
                        value={invoice.defaultTaxRate}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            defaultTaxRate: Number(event.target.value) || 0,
                          }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-due-days">أيام الاستحقاق</Label>
                      <Input
                        id="default-due-days"
                        type="number"
                        value={invoice.defaultDueDays}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            defaultDueDays:
                              Number.parseInt(event.target.value, 10) || 0,
                          }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-terms">الشروط الافتراضية</Label>
                    <Textarea
                      id="default-terms"
                      rows={4}
                      value={invoice.defaultTerms}
                      onChange={(event) =>
                        setInvoice((currentInvoice) => ({
                          ...currentInvoice,
                          defaultTerms: event.target.value,
                        }))
                      }
                      className="min-h-[128px] rounded-xl border-slate-200 bg-white/90"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-notes">الملاحظات الافتراضية</Label>
                    <Textarea
                      id="default-notes"
                      rows={4}
                      value={invoice.defaultNotes}
                      onChange={(event) =>
                        setInvoice((currentInvoice) => ({
                          ...currentInvoice,
                          defaultNotes: event.target.value,
                        }))
                      }
                      className="min-h-[128px] rounded-xl border-slate-200 bg-white/90"
                    />
                  </div>
                </SettingsSection>
              </div>
            </TabsContent>

            <TabsContent value="print" className="space-y-5 pt-0">
              <div className="grid gap-5 xl:grid-cols-2">
                <SettingsSection
                  icon={Printer}
                  title="المحتوى الظاهر في الفاتورة"
                  description="الأجزاء التي سيشاهدها العميل أو فريق الإدارة داخل قالب الفاتورة والطباعة المباشرة."
                  accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="space-y-3">
                    {invoiceFlags.map(([key, label]) => (
                      <ToggleCard
                        key={key}
                        title={label}
                        description="يمكنك إيقاف هذا الجزء مؤقتًا دون تغيير باقي القالب."
                        checked={invoice[key]}
                        onCheckedChange={(checked) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            [key]: checked,
                          }))
                        }
                      />
                    ))}
                  </div>

                  <Alert className="border border-emerald-200 bg-emerald-50/90 text-emerald-950">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <AlertTitle className="text-sm font-semibold">
                      العناصر الظاهرة الآن
                    </AlertTitle>
                    <AlertDescription className="text-emerald-900/80">
                      {visibleInvoice || "عرض أساسي"}
                    </AlertDescription>
                  </Alert>
                </SettingsSection>

                <SettingsSection
                  icon={Palette}
                  title="الإخراج والتصميم والإرسال"
                  description="حجم الصفحة، اتجاهها، ألوان الهوية، الخط، ورسائل البريد التلقائي بعد إنشاء الفاتورة."
                  accentClassName="bg-rose-50 text-rose-700 ring-rose-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-page-size">حجم الصفحة</Label>
                      <Select
                        value={invoice.pdfPageSize}
                        onValueChange={(value) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            pdfPageSize: value as InvoiceSettings["pdfPageSize"],
                          }))
                        }
                      >
                        <SelectTrigger
                          id="invoice-page-size"
                          aria-label="حجم الصفحة"
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder="اختر الحجم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                          <SelectItem value="Legal">Legal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-page-orientation">
                        اتجاه الصفحة
                      </Label>
                      <Select
                        value={invoice.pdfOrientation}
                        onValueChange={(value) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            pdfOrientation:
                              value as InvoiceSettings["pdfOrientation"],
                          }))
                        }
                      >
                        <SelectTrigger
                          id="invoice-page-orientation"
                          aria-label="اتجاه الصفحة"
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {orientationLabelMap[invoice.pdfOrientation]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">عمودي</SelectItem>
                          <SelectItem value="landscape">أفقي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-primary-color">اللون الأساسي</Label>
                      <Input
                        id="invoice-primary-color"
                        type="color"
                        value={invoice.primaryColor}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            primaryColor: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl bg-white p-2"
                      />
                      <p className="text-xs text-slate-500">{invoice.primaryColor}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-secondary-color">
                        اللون الثانوي
                      </Label>
                      <Input
                        id="invoice-secondary-color"
                        type="color"
                        value={invoice.secondaryColor}
                        onChange={(event) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            secondaryColor: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl bg-white p-2"
                      />
                      <p className="text-xs text-slate-500">{invoice.secondaryColor}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-font-family">نوع الخط</Label>
                      <Select
                        value={invoice.fontFamily}
                        onValueChange={(value) =>
                          setInvoice((currentInvoice) => ({
                            ...currentInvoice,
                            fontFamily: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="invoice-font-family"
                          aria-label="نوع الخط"
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder="اختر الخط" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">
                            Times New Roman
                          </SelectItem>
                          <SelectItem value="Courier">Courier</SelectItem>
                          <SelectItem value="Tahoma">Tahoma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <ToggleCard
                    title="إرسال الفاتورة تلقائيًا بالبريد"
                    description="لو مفعّل، يتم تجهيز رسالة بريد مبدئية للعميل بحسب القيم التالية."
                    checked={invoice.autoEmailToCustomer}
                    onCheckedChange={(checked) =>
                      setInvoice((currentInvoice) => ({
                        ...currentInvoice,
                        autoEmailToCustomer: checked,
                      }))
                    }
                  />

                  {invoice.autoEmailToCustomer ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoice-email-subject">موضوع البريد</Label>
                        <Input
                          id="invoice-email-subject"
                          value={invoice.emailSubject}
                          onChange={(event) =>
                            setInvoice((currentInvoice) => ({
                              ...currentInvoice,
                              emailSubject: event.target.value,
                            }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoice-email-body">نص البريد</Label>
                        <Textarea
                          id="invoice-email-body"
                          rows={5}
                          value={invoice.emailBody}
                          onChange={(event) =>
                            setInvoice((currentInvoice) => ({
                              ...currentInvoice,
                              emailBody: event.target.value,
                            }))
                          }
                          className="min-h-[140px] rounded-xl border-slate-200 bg-white/90"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-2 text-slate-700 ring-1 ring-slate-200/70">
                        <Mail className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-950">
                          ملحوظة تشغيلية
                        </h3>
                        <p className="text-sm leading-6 text-slate-500">
                          الحفظ هنا لا يغيّر منطق الإرسال نفسه، فقط يحدّث القيم
                          المستخدمة عند تفعيل إرسال الفاتورة بالبريد من الخلفية.
                        </p>
                      </div>
                    </div>
                  </div>
                </SettingsSection>
              </div>
            </TabsContent>

            <TabsContent value="slip" className="space-y-5 pt-0">
              <Alert className="border border-sky-200 bg-sky-50/90 text-sky-950">
                <PackageCheck className="size-4 text-sky-600" />
                <AlertTitle className="text-sm font-semibold">
                  هذا الجزء خاص بورقة التجهيز المطبوعة فقط
                </AlertTitle>
                <AlertDescription className="text-sky-900/80">
                  أما إجراءات المخزن والجودة والتجميع الجماعي فستجدها في تبويب
                  تجهيز الطلبات التشغيلي.
                </AlertDescription>
              </Alert>

              <div className="grid gap-5 xl:grid-cols-2">
                <SettingsSection
                  icon={PackageCheck}
                  title="هوية الورقة والإخراج"
                  description="العنوان، الوصف، المقاس، الاتجاه، واللون الأساسي الذي يميز نسخة فريق التشغيل."
                  accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="space-y-2">
                    <Label htmlFor="slip-document-title">عنوان المستند</Label>
                    <Input
                      id="slip-document-title"
                      value={slip.documentTitle}
                      onChange={(event) =>
                        setSlip((currentSlip) => ({
                          ...currentSlip,
                          documentTitle: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slip-document-subtitle">الوصف المختصر</Label>
                    <Input
                      id="slip-document-subtitle"
                      value={slip.documentSubtitle}
                      onChange={(event) =>
                        setSlip((currentSlip) => ({
                          ...currentSlip,
                          documentSubtitle: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="slip-page-size">مقاس الصفحة</Label>
                      <Select
                        value={slip.pageSize}
                        onValueChange={(value) =>
                          setSlip((currentSlip) => ({
                            ...currentSlip,
                            pageSize: value as SlipSettings["pageSize"],
                          }))
                        }
                      >
                        <SelectTrigger
                          id="slip-page-size"
                          aria-label="مقاس الصفحة"
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder="اختر المقاس" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slip-page-orientation">اتجاه الصفحة</Label>
                      <Select
                        value={slip.pageOrientation}
                        onValueChange={(value) =>
                          setSlip((currentSlip) => ({
                            ...currentSlip,
                            pageOrientation:
                              value as SlipSettings["pageOrientation"],
                          }))
                        }
                      >
                        <SelectTrigger
                          id="slip-page-orientation"
                          aria-label="اتجاه الصفحة"
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {orientationLabelMap[slip.pageOrientation]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">رأسي</SelectItem>
                          <SelectItem value="landscape">أفقي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slip-accent-color">اللون الرئيسي</Label>
                      <Input
                        id="slip-accent-color"
                        type="color"
                        value={slip.accentColor}
                        onChange={(event) =>
                          setSlip((currentSlip) => ({
                            ...currentSlip,
                            accentColor: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl bg-white p-2"
                      />
                      <p className="text-xs text-slate-500">{slip.accentColor}</p>
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection
                  icon={Workflow}
                  title="المحتوى الظاهر داخل الورقة"
                  description="اختر ما يحتاجه فريق المخزن أثناء التجهيز والطباعة الداخلية دون إرباك العناصر غير المهمة."
                  accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {slipFlags.map(([key, label]) => (
                      <ToggleCard
                        key={key}
                        title={label}
                        description="أوقف هذا الحقل لو لم يعد ضروريًا داخل نسخة التجهيز."
                        checked={slip[key]}
                        onCheckedChange={(checked) =>
                          setSlip((currentSlip) => ({
                            ...currentSlip,
                            [key]: checked,
                          }))
                        }
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slip-preparation-instructions">
                      تعليمات التجهيز
                    </Label>
                    <Textarea
                      id="slip-preparation-instructions"
                      rows={4}
                      value={slip.preparationInstructions}
                      onChange={(event) =>
                        setSlip((currentSlip) => ({
                          ...currentSlip,
                          preparationInstructions: event.target.value,
                        }))
                      }
                      className="min-h-[128px] rounded-xl border-slate-200 bg-white/90"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slip-footer-note">نص الفوتر</Label>
                    <Textarea
                      id="slip-footer-note"
                      rows={3}
                      value={slip.footerNote}
                      onChange={(event) =>
                        setSlip((currentSlip) => ({
                          ...currentSlip,
                          footerNote: event.target.value,
                        }))
                      }
                      className="min-h-[110px] rounded-xl border-slate-200 bg-white/90"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      {visibleSlip || "عرض أساسي"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-100 text-slate-600"
                    >
                      {slip.documentTitle}
                    </Badge>
                  </div>
                </SettingsSection>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </SettingsPageShell>
  );
};

export default OrderInvoiceSettings;
