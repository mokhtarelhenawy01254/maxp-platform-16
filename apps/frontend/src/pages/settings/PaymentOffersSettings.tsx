import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDirection } from "../../i18n";
import {
  ArrowLeftIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { Switch } from "../../components/ui/switch";

const CARD_CLS =
  "bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 shadow-sm";
const LABEL_CLS =
  "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";
const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";
const PRIMARY_BTN_CLS =
  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-600/20";

type PaymentOffersFormState = {
  discountEnabled: boolean;
  discountPercent: number;
  showDiscountBadge: boolean;
  walletEnabled: boolean;
  walletNumber: string;
  recipientName: string;
  instructions: string;
  cardEnabled: boolean;
  hasGatewayConfig: boolean;
};

type WalletPaymentSettingsShape = {
  enabled?: boolean;
  walletNumber?: string;
  recipientName?: string;
  instructions?: string;
  discountEnabled?: boolean;
  discountPercent?: number;
  showDiscountBadge?: boolean;
};

const parseWalletSettings = (raw: unknown): WalletPaymentSettingsShape => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as WalletPaymentSettingsShape;
    } catch {
      return {};
    }
  }
  return raw as WalletPaymentSettingsShape;
};

const parseEnabledMethods = (raw: unknown): string[] => {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map(String) : ["cod"];
  } catch {
    return ["cod"];
  }
};

const PaymentOffersSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentOffersFormState>({
    discountEnabled: false,
    discountPercent: 0,
    showDiscountBadge: true,
    walletEnabled: true,
    walletNumber: "",
    recipientName: "",
    instructions: "",
    cardEnabled: false,
    hasGatewayConfig: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await storefrontSettingsService.getSettings();
        const parsed = parseWalletSettings(
          (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
        );
        const methods = parseEnabledMethods(
          (data as { enabledPaymentMethods?: unknown })?.enabledPaymentMethods,
        );
        const hasGateway = Boolean(
          (data as { paymentGatewayConfig?: unknown })?.paymentGatewayConfig,
        );

        if (!active) return;
        setForm({
          discountEnabled: parsed?.discountEnabled === true,
          discountPercent: Number(parsed?.discountPercent || 0),
          showDiscountBadge: parsed?.showDiscountBadge !== false,
          walletEnabled: parsed?.enabled !== false,
          walletNumber: parsed?.walletNumber || "",
          recipientName: parsed?.recipientName || "",
          instructions: parsed?.instructions || "",
          cardEnabled: methods.includes("card"),
          hasGatewayConfig: hasGateway,
        });
      } catch {
        toast.error("تعذر تحميل إعدادات عروض الدفع");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof PaymentOffersFormState>(
    key: K,
    value: PaymentOffersFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (form.discountEnabled && form.discountPercent <= 0) {
      toast.error("يرجى إدخال نسبة خصم أكبر من 0%");
      return;
    }

    const willWalletBeActive = form.walletEnabled && Boolean(form.walletNumber.trim());

    if (form.discountEnabled && !willWalletBeActive && !form.cardEnabled) {
      toast.error(
        "لتطبيق الخصم في المتجر، يرجى كتابة رقم المحفظة أو تفعيل البطاقة البنكية",
      );
      return;
    }

    setSaving(true);
    try {
      const { data } = await storefrontSettingsService.getSettings();
      const existing = parseWalletSettings(
        (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
      );
      const currentMethods = parseEnabledMethods(
        (data as { enabledPaymentMethods?: unknown })?.enabledPaymentMethods,
      );

      let nextMethods = [...currentMethods];

      if (willWalletBeActive && !nextMethods.includes("wallet")) {
        nextMethods.push("wallet");
      } else if (!willWalletBeActive && nextMethods.includes("wallet")) {
        nextMethods = nextMethods.filter((m) => m !== "wallet");
      }

      if (form.cardEnabled && !nextMethods.includes("card")) {
        nextMethods.push("card");
      } else if (!form.cardEnabled && nextMethods.includes("card")) {
        nextMethods = nextMethods.filter((m) => m !== "card");
      }

      if (!nextMethods.includes("cod")) {
        nextMethods.unshift("cod");
      }

      const result = await storefrontSettingsService.updateSettings({
        walletPaymentSettings: {
          ...existing,
          enabled: willWalletBeActive,
          walletNumber: form.walletNumber.trim(),
          recipientName: form.recipientName.trim(),
          instructions: form.instructions.trim(),
          discountEnabled: form.discountEnabled,
          discountPercent: form.discountPercent,
          showDiscountBadge: form.showDiscountBadge,
        },
        enabledPaymentMethods: JSON.stringify(nextMethods),
      } as Parameters<typeof storefrontSettingsService.updateSettings>[0]);

      if (result?.data) {
        toast.success("تم حفظ إعدادات عروض الدفع وتفعيلها في المتجر بنجاح");
      }
    } catch (error) {
      toast.error(
        "حدث خطأ أثناء الحفظ: " +
          ((error as { message?: string })?.message || "خطأ غير معروف"),
      );
    } finally {
      setSaving(false);
    }
  };

  const sampleOrderSubtotal = 500;
  const sampleDiscountAmount = (sampleOrderSubtotal * (form.discountPercent || 0)) / 100;
  const sampleOrderTotal = sampleOrderSubtotal - sampleDiscountAmount;
  const hasElectronicMethodActive =
    (form.walletEnabled && Boolean(form.walletNumber.trim())) || form.cardEnabled;

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="رجوع"
          >
            <ArrowLeftIcon className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              عروض الدفع
            </h2>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              خصومات تُطبّق تلقائياً على الدفع بالبطاقة أو بالمحفظة الإلكترونية في متجرك بالكامل.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={CARD_CLS}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            جارٍ تحميل إعدادات عروض الدفع...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Discount Card */}
          <div className={CARD_CLS}>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>خصم الدفع الإلكتروني</span>
                    <span>🎁</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    لو العميل دفع بالبطاقة أو بالمحفظة الإلكترونية، يحصل على خصم على قيمة المنتجات. فعّل الخصم وحدد نسبته بالأسفل.
                  </p>
                </div>
                <Switch
                  checked={form.discountEnabled}
                  onCheckedChange={(checked) => update("discountEnabled", checked)}
                />
              </div>

              {form.discountEnabled ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className={LABEL_CLS}>نسبة الخصم (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.discountPercent || ""}
                      onChange={(e) =>
                        update(
                          "discountPercent",
                          Math.min(100, Math.max(0, Number(e.target.value))),
                        )
                      }
                      className={INPUT_CLS}
                      dir="ltr"
                      placeholder="مثال: 10"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      يُحسب الخصم على إجمالي المنتجات (قبل الشحن). مثال: لو كتبت 10، العميل يحصل على خصم 10%.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3.5 py-3 dark:bg-gray-900 border border-slate-100 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        إظهار الخصم للعميل
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        يظهر بجانب طرق الدفع الإلكترونية وفي ملخص الشيك أوت لتحفيز العميل على الدفع مقدماً.
                      </p>
                    </div>
                    <Switch
                      checked={form.showDiscountBadge}
                      onCheckedChange={(checked) => update("showDiscountBadge", checked)}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Methods Configuration */}
            {form.discountEnabled ? (
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      طرق الدفع الإلكترونية لتطبيق الخصم عليها
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      حدد الطرق الإلكترونية التي ستظهر لعملائك ليتمكنوا من الاستفادة من هذا العرض.
                    </p>
                  </div>
                </div>

                {!hasElectronicMethodActive && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="leading-relaxed">
                      <strong>تنبيه:</strong> حتى يظهر الخصم لعملائك في المتجر، يجب إدخال رقم المحفظة بالأسفل أو تفعيل البطاقة البنكية.
                    </div>
                  </div>
                )}

                {/* Wallet Details */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-gray-700 space-y-4 bg-slate-50/50 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <DevicePhoneMobileIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          الدفع بالمحفظة (فودافون كاش / إنستاباي / المحافظ الذكية)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          العميل يحول على رقم المحفظة ويرفع صورة الإيصال لإثبات الدفع.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.walletEnabled}
                      onCheckedChange={(checked) => update("walletEnabled", checked)}
                    />
                  </div>

                  {form.walletEnabled ? (
                    <div className="space-y-3.5 pt-2 border-t border-slate-200/80 dark:border-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL_CLS}>
                            رقم المحفظة أو عنوان إنستاباي <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.walletNumber}
                            onChange={(e) => update("walletNumber", e.target.value)}
                            className={INPUT_CLS}
                            dir="ltr"
                            placeholder="01xxxxxxxxx أو username@instapay"
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLS}>اسم المستلم</label>
                          <input
                            type="text"
                            value={form.recipientName}
                            onChange={(e) => update("recipientName", e.target.value)}
                            className={INPUT_CLS}
                            placeholder="مثال: متجر سوان"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>
                          تعليمات التحويل للعميل (اختياري)
                        </label>
                        <input
                          type="text"
                          value={form.instructions}
                          onChange={(e) => update("instructions", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="مثال: يرجى كتابة اسمك في بيان التحويل ثم رفع صورة الإيصال"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Card Payment Details */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-gray-700 space-y-3 bg-slate-50/50 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          الدفع بالبطاقة البنكية (فيزا / ماستركارد)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {form.hasGatewayConfig
                            ? "بوابة الدفع (Kashier) مهيأة في متجرك."
                            : "يتطلب ربط بوابة الدفع Kashier من إعدادات المتجر."}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.cardEnabled}
                      onCheckedChange={(checked) => update("cardEnabled", checked)}
                    />
                  </div>

                  {!form.hasGatewayConfig && form.cardEnabled ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                      <span>
                        لم تُدخل مفاتيح بوابة Kashier بعد. يمكنك إعدادها من صفحة إعدادات المتجر.
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/settings/store")}
                        className="font-bold underline shrink-0 hover:text-amber-900"
                      >
                        إعداد البوابة
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Live Storefront Preview */}
            {form.discountEnabled && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3.5">
                <div className="flex items-center gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    معاينة تجربة العميل في المتجر
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Payment Options Preview */}
                  <div className="rounded-lg bg-white p-3 shadow-sm border border-slate-200/80 dark:bg-gray-900 dark:border-gray-800 space-y-2">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] mb-1">
                      طرق الدفع في الشيك أوت:
                    </p>
                    <div className="flex items-center justify-between p-2 rounded border border-slate-200 bg-slate-50 dark:bg-gray-800 dark:border-gray-700">
                      <span>💵 الدفع عند الاستلام</span>
                      <span className="text-gray-400 text-[11px]">بدون خصم</span>
                    </div>

                    {form.walletEnabled && form.walletNumber.trim() ? (
                      <div className="flex items-center justify-between p-2 rounded border border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-800">
                        <span className="font-bold text-emerald-900 dark:text-emerald-100">
                          📱 الدفع بالمحفظة
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                          🎁 خصم {form.discountPercent}%
                        </span>
                      </div>
                    ) : null}

                    {form.cardEnabled ? (
                      <div className="flex items-center justify-between p-2 rounded border border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-800">
                        <span className="font-bold text-emerald-900 dark:text-emerald-100">
                          💳 بطاقة ائتمان
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                          🎁 خصم {form.discountPercent}%
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Summary Preview */}
                  <div className="rounded-lg bg-white p-3 shadow-sm border border-slate-200/80 dark:bg-gray-900 dark:border-gray-800 space-y-1.5 font-mono">
                    <p className="font-sans font-semibold text-gray-700 dark:text-gray-300 text-[11px] mb-1">
                      ملخص الطلب (مثال: طلب بقيمة {sampleOrderSubtotal} ج.م):
                    </p>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="font-sans">إجمالي المنتجات:</span>
                      <span>{sampleOrderSubtotal} ج.م</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span className="font-sans">خصم الدفع الإلكتروني ({form.discountPercent}%):</span>
                      <span>-{sampleDiscountAmount.toFixed(0)} ج.م</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                      <span className="font-sans">الإجمالي المطلوب:</span>
                      <span>{sampleOrderTotal.toFixed(0)} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={PRIMARY_BTN_CLS}
              >
                {saving ? "جارٍ الحفظ والتفعيل..." : "حفظ إعدادات عروض الدفع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOffersSettings;
