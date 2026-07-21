import { useTranslation } from "react-i18next";
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
  showBarcodeOrderCode: boolean;
  showBarcodeShippingCode: boolean;
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
  showBarcodeOrderCode: true,
  showBarcodeShippingCode: true,
};

const statuses = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "PENDING_PREPARATION",
  "PREPARING",
  "QUALITY_CHECK",
  "PACKAGED",
  "READY_TO_SHIP",
] as const;

const createDefaultSlip = (t: (key: string) => string): SlipSettings => ({
  documentTitle: t('orderInvoiceSettings.k_49'),
  documentSubtitle: t('orderInvoiceSettings.k_50'),
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
  preparationInstructions: t('orderInvoiceSettings.k_51'),
  footerNote: t('orderInvoiceSettings.k_52'),
});

const createInvoiceFlags = (t: (key: string) => string) =>
  [
    ["showCompanyLogo", t('orderInvoiceSettings.k_53')],
    ["showTaxBreakdown", t('orderInvoiceSettings.k_54')],
    ["showPaymentMethod", t('orderInvoiceSettings.k_55')],
    ["showOrderItems", t('orderInvoiceSettings.k_56')],
  ] as const;

const createBarcodeFlags = (t: (key: string) => string) =>
  [
    ["showBarcodeOrderCode", t('orderInvoiceSettings.k_57')],
    ["showBarcodeShippingCode", t('orderInvoiceSettings.k_58')],
  ] as const;

const createSlipFlags = (t: (key: string) => string) =>
  [
    ["showCompanyName", t('orderInvoiceSettings.k_59')],
    ["showCustomerEmail", t('orderInvoiceSettings.k_60')],
    ["showOrderNotes", t('orderInvoiceSettings.k_61')],
    ["showPaymentSummary", t('orderInvoiceSettings.k_62')],
    ["showFinancialSummary", t('orderInvoiceSettings.k_63')],
    ["showItemSku", t('orderInvoiceSettings.k_64')],
    ["showItemDetails", t('orderInvoiceSettings.k_65')],
    ["showItemColor", t('orderInvoiceSettings.k_66')],
    ["showItemSize", t('orderInvoiceSettings.k_67')],
    ["showItemPrice", t('orderInvoiceSettings.k_68')],
    ["showItemTotal", t('orderInvoiceSettings.k_69')],
  ] as const;

const createLabelForStatus = (t: (key: string) => string) =>
  (status: string) =>
    (
      {
        "": t('orderInvoiceSettings.k_70'),
        CONFIRMED: t('orderInvoiceSettings.k_71'),
        PROCESSING: t('orderInvoiceSettings.k_72'),
        SHIPPED: t('orderInvoiceSettings.k_73'),
        DELIVERED: t('orderInvoiceSettings.k_74'),
        COMPLETED: t('orderInvoiceSettings.k_75'),
        PENDING_PREPARATION: t('orderInvoiceSettings.k_76'),
        PREPARING: t('orderInvoiceSettings.k_77'),
        QUALITY_CHECK: t('orderInvoiceSettings.k_78'),
        PACKAGED: t('orderInvoiceSettings.k_79'),
        READY_TO_SHIP: t('orderInvoiceSettings.k_80'),
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
  t: (key: string) => string,
): SlipSettings => {
  const def = createDefaultSlip(t);
  return {
    ...def,
    ...(value || {}),
    documentTitle: value?.documentTitle || def.documentTitle,
    documentSubtitle: value?.documentSubtitle || def.documentSubtitle,
    accentColor: value?.accentColor || def.accentColor,
    pageSize: value?.pageSize === "A5" ? "A5" : "A4",
    pageOrientation:
      value?.pageOrientation === "landscape" ? "landscape" : "portrait",
    preparationInstructions:
      value?.preparationInstructions || def.preparationInstructions,
    footerNote: value?.footerNote || def.footerNote,
    showCompanyName:
      typeof value?.showCompanyName === "boolean"
        ? value.showCompanyName
        : def.showCompanyName,
    showCustomerEmail:
      typeof value?.showCustomerEmail === "boolean"
        ? value.showCustomerEmail
        : def.showCustomerEmail,
    showOrderNotes:
      typeof value?.showOrderNotes === "boolean"
        ? value.showOrderNotes
        : def.showOrderNotes,
    showPaymentSummary:
      typeof value?.showPaymentSummary === "boolean"
        ? value.showPaymentSummary
        : def.showPaymentSummary,
    showFinancialSummary:
      typeof value?.showFinancialSummary === "boolean"
        ? value.showFinancialSummary
        : def.showFinancialSummary,
    showItemSku:
      typeof value?.showItemSku === "boolean"
        ? value.showItemSku
        : def.showItemSku,
    showItemDetails:
      typeof value?.showItemDetails === "boolean"
        ? value.showItemDetails
        : def.showItemDetails,
    showItemColor:
      typeof value?.showItemColor === "boolean"
        ? value.showItemColor
        : def.showItemColor,
    showItemSize:
      typeof value?.showItemSize === "boolean"
        ? value.showItemSize
        : def.showItemSize,
    showItemPrice:
      typeof value?.showItemPrice === "boolean"
        ? value.showItemPrice
        : def.showItemPrice,
    showItemTotal:
      typeof value?.showItemTotal === "boolean"
        ? value.showItemTotal
        : def.showItemTotal,
  };
};

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

const createOrientationLabelMap = (t: (key: string) => string) =>
  ({
    portrait: t('orderInvoiceSettings.k_39'),
    landscape: t('orderInvoiceSettings.k_40'),
  }) as Record<
    InvoiceSettings["pdfOrientation"] | SlipSettings["pageOrientation"],
    string
  >;

const OrderInvoiceSettings: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
  const { t } = useTranslation();
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
  const [slip, setSlip] = useState<SlipSettings>(createDefaultSlip(t));
  const invoiceFlags = useMemo(() => createInvoiceFlags(t), [t]);
  const barcodeFlags = useMemo(() => createBarcodeFlags(t), [t]);
  const slipFlags = useMemo(() => createSlipFlags(t), [t]);
  const labelForStatus = useMemo(() => createLabelForStatus(t), [t]);
  const orientationLabelMap = useMemo(() => createOrientationLabelMap(t), [t]);

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
      setSlip(normalizeSlip(orderPreparation?.slipDocument, t));
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: t('orderInvoiceSettings.k_81'),
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
        text: t('orderInvoiceSettings.k_82'),
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
        text: t('orderInvoiceSettings.k_83'),
      });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: t('orderInvoiceSettings.k_84'),
      });
    } finally {
      setSaving(false);
    }
  }, [companyId, invoice, rawPreparation, slip]);

  const resetInvoice = useCallback(async () => {
    if (!window.confirm(t('orderInvoiceSettings.k_85'))) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/order-invoice-settings/reset", {});
      setInvoice(normalizeInvoice(response.data?.data));
      setMessage({
        type: "success",
        text: t('orderInvoiceSettings.k_86'),
      });
      window.setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: t('orderInvoiceSettings.k_87'),
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
        .map(([, label]) => label.replace(t('orderInvoiceSettings.k_88'), ""))
        .join(" • "),
    [slip],
  );

  const invoiceSummary = `${invoice.pdfPageSize} / ${
    invoice.pdfOrientation === "portrait" ? t('orderInvoiceSettings.k_46') : t('orderInvoiceSettings.k_40')
  }`;
  const slipSummary = `${slip.pageSize} / ${
    slip.pageOrientation === "portrait" ? t('orderInvoiceSettings.k_46') : t('orderInvoiceSettings.k_40')
  }`;

  if (loading) {
    if (isEmbedded) {
      return <div className="p-4 text-center text-slate-500">{t('orderInvoiceSettings.k_33')}</div>;
    }
    return (
      <SettingsLoadingState
        title={t('orderInvoiceSettings.k_1')}
        description={t('orderInvoiceSettings.k_2')}
      />
    );
  }

  const content = (
    <>
      {!isEmbedded && (
        <SettingsPageHero
          badgeIcon={Sparkles}
          badgeLabel={t('orderInvoiceSettings.k_3')}
          title={t('orderInvoiceSettings.k_4')}
          description={t('orderInvoiceSettings.k_5')}
          summaryItems={[
            { label: t('orderInvoiceSettings.k_89'), value: invoiceSummary },
            { label: t('orderInvoiceSettings.k_49'), value: slipSummary },
            {
              label: t('orderInvoiceSettings.k_90'),
              value: invoice.autoEmailToCustomer ? t('orderInvoiceSettings.k_91') : t('orderInvoiceSettings.k_92'),
            },
            {
              label: t('orderInvoiceSettings.k_93'),
              value: invoice.autoGenerate ? t('orderInvoiceSettings.k_94') : t('orderInvoiceSettings.k_92'),
            },
          ]}
          gradientClassName="bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(239,246,255,0.9))]"
        />
      )}

      <div className={isEmbedded ? "" : "space-y-6 px-6 py-6"}>
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
              {saving ? t('orderInvoiceSettings.k_95') : t('orderInvoiceSettings.k_96')}
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
                  label: t('orderInvoiceSettings.k_89'),
                  description: t('orderInvoiceSettings.k_97'),
                  icon: FileSpreadsheet,
                },
                {
                  value: "print",
                  label: t('orderInvoiceSettings.k_98'),
                  description: t('orderInvoiceSettings.k_99'),
                  icon: FileOutput,
                },
                {
                  value: "slip",
                  label: t('orderInvoiceSettings.k_49'),
                  description: t('orderInvoiceSettings.k_100'),
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
                  title={t('orderInvoiceSettings.k_6')}
                  description={t('orderInvoiceSettings.k_7')}
                  accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <ToggleCard
                    title={t('orderInvoiceSettings.k_8')}
                    description={t('orderInvoiceSettings.k_9')}
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
                          aria-label={t('orderInvoiceSettings.k_10')}
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {invoice.autoGenerateOnStatus
                              ? labelForStatus(invoice.autoGenerateOnStatus)
                              : t('orderInvoiceSettings.k_70')}
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
                      <Label htmlFor="invoice-prefix">{t('orderInvoiceSettings.k_34')}</Label>
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
                  title={t('orderInvoiceSettings.k_11')}
                  description={t('orderInvoiceSettings.k_12')}
                  accentClassName="bg-indigo-50 text-indigo-700 ring-indigo-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-tax-rate">{t('orderInvoiceSettings.k_35')}</Label>
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
                      <Label htmlFor="default-due-days">{t('orderInvoiceSettings.k_36')}</Label>
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
                    <Label htmlFor="default-terms">{t('orderInvoiceSettings.k_37')}</Label>
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
                    <Label htmlFor="default-notes">{t('orderInvoiceSettings.k_38')}</Label>
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
                  title={t('orderInvoiceSettings.k_13')}
                  description={t('orderInvoiceSettings.k_14')}
                  accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="space-y-3">
                    {invoiceFlags.map(([key, label]) => (
                      <ToggleCard
                        key={key}
                        title={label}
                        description={t('orderInvoiceSettings.k_15')}
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

                  <Separator className="my-2" />

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      إعدادات الباركود
                    </p>
                    <p className="text-xs leading-5 text-slate-400">
                      تحكم في إظهار الباركود داخل الفاتورة المطبوعة.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {barcodeFlags.map(([key, label]) => (
                      <ToggleCard
                        key={key}
                        title={label}
                        description={t('orderInvoiceSettings.k_16')}
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
                      {visibleInvoice || t('orderInvoiceSettings.k_101')}
                    </AlertDescription>
                  </Alert>
                </SettingsSection>

                <SettingsSection
                  icon={Palette}
                  title={t('orderInvoiceSettings.k_17')}
                  description={t('orderInvoiceSettings.k_18')}
                  accentClassName="bg-rose-50 text-rose-700 ring-rose-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-page-size">{t('orderInvoiceSettings.k_19')}</Label>
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
                          aria-label={t('orderInvoiceSettings.k_19')}
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder={t('orderInvoiceSettings.k_20')} />
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
                          aria-label={t('orderInvoiceSettings.k_21')}
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {orientationLabelMap[invoice.pdfOrientation]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">{t('orderInvoiceSettings.k_39')}</SelectItem>
                          <SelectItem value="landscape">{t('orderInvoiceSettings.k_40')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-primary-color">{t('orderInvoiceSettings.k_41')}</Label>
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
                      <Label htmlFor="invoice-font-family">{t('orderInvoiceSettings.k_22')}</Label>
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
                          aria-label={t('orderInvoiceSettings.k_22')}
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder={t('orderInvoiceSettings.k_23')} />
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
                    title={t('orderInvoiceSettings.k_24')}
                    description={t('orderInvoiceSettings.k_25')}
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
                        <Label htmlFor="invoice-email-subject">{t('orderInvoiceSettings.k_42')}</Label>
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
                        <Label htmlFor="invoice-email-body">{t('orderInvoiceSettings.k_43')}</Label>
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
                  title={t('orderInvoiceSettings.k_26')}
                  description={t('orderInvoiceSettings.k_27')}
                  accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="space-y-2">
                    <Label htmlFor="slip-document-title">{t('orderInvoiceSettings.k_44')}</Label>
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
                    <Label htmlFor="slip-document-subtitle">{t('orderInvoiceSettings.k_45')}</Label>
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
                      <Label htmlFor="slip-page-size">{t('orderInvoiceSettings.k_28')}</Label>
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
                          aria-label={t('orderInvoiceSettings.k_28')}
                          className="h-11 rounded-xl"
                        >
                          <SelectValue placeholder={t('orderInvoiceSettings.k_29')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slip-page-orientation">{t('orderInvoiceSettings.k_21')}</Label>
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
                          aria-label={t('orderInvoiceSettings.k_21')}
                          className="h-11 rounded-xl"
                        >
                          <span className="flex flex-1 text-start font-medium">
                            {orientationLabelMap[slip.pageOrientation]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">{t('orderInvoiceSettings.k_46')}</SelectItem>
                          <SelectItem value="landscape">{t('orderInvoiceSettings.k_40')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slip-accent-color">{t('orderInvoiceSettings.k_47')}</Label>
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
                  title={t('orderInvoiceSettings.k_30')}
                  description={t('orderInvoiceSettings.k_31')}
                  accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
                  surfaceClassName="bg-white/90"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {slipFlags.map(([key, label]) => (
                      <ToggleCard
                        key={key}
                        title={label}
                        description={t('orderInvoiceSettings.k_32')}
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
                    <Label htmlFor="slip-footer-note">{t('orderInvoiceSettings.k_48')}</Label>
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
                      {visibleSlip || t('orderInvoiceSettings.k_101')}
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
    </>
  );

  return isEmbedded ? content : <SettingsPageShell>{content}</SettingsPageShell>;
};

export default OrderInvoiceSettings;
