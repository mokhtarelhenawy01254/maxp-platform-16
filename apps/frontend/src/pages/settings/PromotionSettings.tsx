import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgePercent,
  Gift,
  PackageCheck,
  RefreshCcw,
  Save,
  Sparkles,
  Truck,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  getApiErrorMessage,
  getNumericValue,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";

const DEFAULT_FREE_SHIPPING_MESSAGE =
  "احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر";

type PromotionMessageState = {
  type: "success" | "error";
  text: string;
};

type PromotionTabValue =
  | "promotion"
  | "volume-discounts"
  | "delivery-options"
  | "recommendations";

type FreeShippingSettings = {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
};

type FlatShippingSettings = {
  flatShippingEnabled: boolean;
  flatShippingFee: number;
};

const PROMOTION_ROUTE_MAP: Record<PromotionTabValue, string | null> = {
  promotion: null,
  "volume-discounts": "/settings/volume-discounts",
  "delivery-options": "/settings/delivery-options",
  recommendations: "/settings/recommendations",
};

const PROMOTION_TABS: Array<{
  value: PromotionTabValue;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    value: "promotion",
    label: "الشحن المجاني",
    description: "الحد الأدنى وسعر موحد",
    icon: Truck,
  },
  {
    value: "volume-discounts",
    label: "خصومات الكميات",
    description: "صفحة مخصصة للخصومات",
    icon: BadgePercent,
  },
  {
    value: "delivery-options",
    label: "خيارات التوصيل",
    description: "أنواع وسرعات التوصيل",
    icon: PackageCheck,
  },
  {
    value: "recommendations",
    label: "المنتجات المقترحة",
    description: "بيع إضافي واقتراحات",
    icon: Wand2,
  },
];

const PromotionSettings: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<PromotionTabValue>("promotion");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PromotionMessageState | null>(null);

  const [freeShippingSettings, setFreeShippingSettings] =
    useState<FreeShippingSettings>({
      freeShippingEnabled: false,
      freeShippingThreshold: 0,
      freeShippingMessage: DEFAULT_FREE_SHIPPING_MESSAGE,
    });

  const [flatShippingSettings, setFlatShippingSettings] =
    useState<FlatShippingSettings>({
      flatShippingEnabled: false,
      flatShippingFee: 0,
    });

  const [hideUtilityBar, setHideUtilityBar] = useState(false);
  const [utilityBarSaving, setUtilityBarSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/promotion-settings");

      if (response.data.success) {
        const data = response.data.data || {};
        setFreeShippingSettings({
          freeShippingEnabled: Boolean(data.freeShippingEnabled),
          freeShippingThreshold: getNumericValue(data.freeShippingThreshold),
          freeShippingMessage:
            typeof data.freeShippingMessage === "string" &&
            data.freeShippingMessage.trim()
              ? data.freeShippingMessage
              : DEFAULT_FREE_SHIPPING_MESSAGE,
        });
        setFlatShippingSettings({
          flatShippingEnabled: Boolean(data.flatShippingEnabled),
          flatShippingFee: getNumericValue(data.flatShippingFee),
        });
      }

      try {
        const sfRes = await storefrontSettingsService.getSettings(undefined, { allowFallback: false });
        setHideUtilityBar(sfRes.data.hideUtilityBar === true);
      } catch {
        // non-blocking
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في جلب الإعدادات"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const previewMessage = useMemo(
    () =>
      freeShippingSettings.freeShippingMessage.replace(
        "{amount}",
        String(freeShippingSettings.freeShippingThreshold || 0),
      ),
    [
      freeShippingSettings.freeShippingMessage,
      freeShippingSettings.freeShippingThreshold,
    ],
  );

  const handleTabChange = useCallback(
    (nextTab: string) => {
      const normalizedTab = nextTab as PromotionTabValue;
      const destination = PROMOTION_ROUTE_MAP[normalizedTab];

      setCurrentTab(normalizedTab);

      if (destination) {
        navigate(destination);
      }
    },
    [navigate],
  );

  const handleSavePromotionSettings = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/promotion-settings", {
        ...freeShippingSettings,
        ...flatShippingSettings,
      });

      if (response.data.success) {
        setMessage({
          type: "success",
          text: "تم حفظ الإعدادات بنجاح",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في حفظ الإعدادات"),
      });
    } finally {
      setSaving(false);
    }
  }, [flatShippingSettings, freeShippingSettings]);

  const handleResetSettings = useCallback(async () => {
    if (
      !window.confirm("هل أنت متأكد من إعادة تعيين الإعدادات للقيم الافتراضية؟")
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/promotion-settings/reset", {});

      if (response.data.success) {
        await loadSettings();
        setMessage({
          type: "success",
          text: "تمت إعادة تعيين الإعدادات بنجاح",
        });
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في إعادة تعيين الإعدادات"),
      });
    } finally {
      setSaving(false);
    }
  }, [loadSettings]);

  const handleToggleUtilityBar = useCallback(async (value: boolean) => {
    setHideUtilityBar(value);
    setUtilityBarSaving(true);
    try {
      await apiClient.put('/settings/company', { settings: { hideUtilityBar: value } });
    } catch {
      setHideUtilityBar(!value);
    } finally {
      setUtilityBarSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <SettingsLoadingState
        title="جاري تحميل إعدادات الترويج..."
        description="بنجهز لك سطح التحكم الحديث بنفس البيانات الحالية."
      />
    );
  }

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel="إدارة عروض التوصيل"
        title="إعدادات الترويج وزيادة المبيعات"
        description="صفحة تشغيل موحدة لضبط الشحن المجاني وسعر الشحن الموحد، مع روابط سريعة لباقي أدوات العروض في الأسطح المخصصة لها."
        summaryItems={[
          {
            label: "الشحن المجاني",
            value: freeShippingSettings.freeShippingEnabled ? "مفعل" : "متوقف",
          },
          {
            label: "السعر الموحد",
            value: flatShippingSettings.flatShippingEnabled
              ? `${flatShippingSettings.flatShippingFee} ج.م`
              : "غير مفعل",
          },
        ]}
      />

      <div className="space-y-6 px-6 py-6">
        <SettingsStatusAlert
          message={message}
          onDismiss={() => setMessage(null)}
        />

        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="gap-5"
        >
          <TabsList
            variant="line"
            className="h-auto w-full !grid grid-cols-1 gap-2 rounded-none border-b border-slate-200/70 bg-transparent p-0 pb-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {PROMOTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.value;

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
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
                      <div className="font-bold">{tab.label}</div>
                      <div
                        className={cn(
                          "mt-1 text-xs font-medium leading-5",
                          isActive ? "text-slate-200" : "text-slate-400",
                        )}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="promotion" className="space-y-5 pt-0">
            <SettingsSection
              icon={Gift}
              title="الشحن المجاني"
              description="حفّز العميل على رفع قيمة السلة برسالة واضحة وحد أدنى معروف داخل المتجر."
              accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
            >
                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition-colors",
                    freeShippingSettings.freeShippingEnabled
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/70",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">
                          تفعيل الشحن المجاني
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-bold",
                            freeShippingSettings.freeShippingEnabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {freeShippingSettings.freeShippingEnabled
                            ? "يعمل الآن"
                            : "متوقف"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        عند التفعيل، سيحصل العميل على شحن مجاني بمجرد الوصول إلى
                        الحد الأدنى الذي تحدده هنا.
                      </p>
                    </div>
                    <Switch
                      aria-label="تفعيل الشحن المجاني"
                      checked={freeShippingSettings.freeShippingEnabled}
                      onCheckedChange={(checked) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="freeShippingThreshold">
                      الحد الأدنى للطلب (جنيه)
                    </Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      min={0}
                      max={100000}
                      step={10}
                      value={freeShippingSettings.freeShippingThreshold}
                      onChange={(event) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingThreshold:
                            getNumericValue(event.target.value),
                        }))
                      }
                      readOnly={!freeShippingSettings.freeShippingEnabled}
                      className={cn(
                        "h-11 rounded-xl bg-white/90",
                        !freeShippingSettings.freeShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      المبلغ الذي يجب أن يصل له الطلب حتى تظهر ميزة الشحن المجاني.
                      <span className="text-emerald-600 ml-1">
                        (الحد الأقصى 100,000 جنيه)
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeShippingMessage">
                      رسالة الشحن المجاني
                    </Label>
                    <Textarea
                      id="freeShippingMessage"
                      rows={4}
                      value={freeShippingSettings.freeShippingMessage}
                      onChange={(event) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingMessage: event.target.value,
                        }))
                      }
                      readOnly={!freeShippingSettings.freeShippingEnabled}
                      className={cn(
                        "min-h-[132px] rounded-xl border-slate-200 bg-white/90 text-sm text-slate-950",
                        !freeShippingSettings.freeShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      استخدم <span className="font-semibold">{`{amount}`}</span>{" "}
                      لإظهار الحد الأدنى تلقائيًا داخل الرسالة.
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-[22px] border border-dashed p-4",
                    freeShippingSettings.freeShippingEnabled
                      ? "border-emerald-300 bg-emerald-50/80"
                      : "border-slate-200 bg-slate-50/80",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    معاينة الرسالة
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-900">
                    {previewMessage}
                  </p>
                  {!freeShippingSettings.freeShippingEnabled && (
                    <p className="mt-2 text-xs text-slate-500">
                      ستظهر هذه الرسالة للعملاء عند تفعيل الشحن المجاني.
                    </p>
                  )}
                </div>
            </SettingsSection>

            <SettingsSection
              icon={Sparkles}
              title="الشريط العلوي"
              description="التحكم في الشريط الذي يظهر أعلى المتجر (ابدئي الطلب، الشحن المجاني، تبديل مقاس، تأكيد الطلب)."
              accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
            >
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-950">
                      إخفاء الشريط العلوي
                    </h3>
                    <p className="text-sm leading-6 text-slate-500">
                      إخفاء الشريط الذي يحتوي على روابط سريعة (ابدئي الطلب، تبديل مقاس خلال 14 يوم، تأكيد الطلب قبل التجهيز) من أعلى المتجر.
                    </p>
                  </div>
                  <Switch
                    aria-label="إخفاء الشريط العلوي"
                    checked={hideUtilityBar}
                    disabled={utilityBarSaving}
                    onCheckedChange={(checked) => { void handleToggleUtilityBar(checked); }}
                  />
                </div>
              </div>
            </SettingsSection>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50/65 text-slate-400 font-medium">
                  إعدادات التسعير الموحد
                </span>
              </div>
            </div>

            <SettingsSection
              icon={Truck}
              title="استراتيجية أسعار الشحن"
              description="اختَر هل الشحن سيتبع سعرًا موحّدًا لكل الطلبات أم يظل متغيّرًا بحسب المناطق."
              accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
            >
                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition-colors",
                    flatShippingSettings.flatShippingEnabled
                      ? "border-sky-200 bg-sky-50/70"
                      : "border-slate-200 bg-slate-50/70",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">
                          تفعيل سعر شحن موحد
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-bold",
                            flatShippingSettings.flatShippingEnabled
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {flatShippingSettings.flatShippingEnabled
                            ? "تسعير ثابت"
                            : "تسعير حسب المناطق"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        عند التفعيل، سيتم تجاهل أسعار المحافظات والمناطق ويظهر
                        نفس السعر لكل الطلبات.
                      </p>
                    </div>
                    <Switch
                      aria-label="تفعيل سعر شحن موحد"
                      checked={flatShippingSettings.flatShippingEnabled}
                      onCheckedChange={(checked) =>
                        setFlatShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          flatShippingEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="flatShippingFee">
                      سعر الشحن الموحد (جنيه)
                    </Label>
                    <Input
                      id="flatShippingFee"
                      type="number"
                      min={0}
                      max={10000}
                      step={5}
                      value={flatShippingSettings.flatShippingFee}
                      onChange={(event) =>
                        setFlatShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          flatShippingFee: getNumericValue(event.target.value),
                        }))
                      }
                      readOnly={!flatShippingSettings.flatShippingEnabled}
                      className={cn(
                        "h-11 rounded-xl bg-white/90",
                        !flatShippingSettings.flatShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      السعر الذي سيظهر بنفس القيمة لكل العملاء داخل صفحة الدفع.
                      <span className="text-sky-600 ml-1">
                        (الحد الأقصى 10,000 جنيه)
                      </span>
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-2 text-slate-700 ring-1 ring-slate-200/70">
                        <PackageCheck className="size-5" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-950">
                          متى تستخدم السعر الموحّد؟
                        </h4>
                        <ul className="space-y-1 text-sm leading-6 text-slate-500">
                          <li>
                            مناسب للمتاجر التي تعتمد تكلفة ثابتة مهما اختلفت
                            المحافظة.
                          </li>
                          <li>
                            لو كنت تحتاج تسعيرًا حسب المنطقة، اتركه مغلقًا واستخدم
                            إعدادات الشحن التفصيلية.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
            </SettingsSection>

            <Separator />

            <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50/65 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-950">
                  حفظ وتطبيق التغييرات
                </h3>
                <p className="text-sm leading-6 text-slate-500">
                  الحفظ هنا يرسل الإعدادات مباشرة إلى نفس الـ API القديم بدون
                  تغيير في الباك إند.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    void handleResetSettings();
                  }}
                  disabled={saving}
                  className="rounded-2xl"
                >
                  <RefreshCcw className="size-4" />
                  إعادة تعيين
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    void handleSavePromotionSettings();
                  }}
                  disabled={saving}
                  className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  <Save className={cn("size-4", saving && "animate-pulse")} />
                  {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsPageShell>
  );
};

export default PromotionSettings;
