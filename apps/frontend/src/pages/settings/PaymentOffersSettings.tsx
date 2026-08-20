import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDirection } from "../../i18n";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { Switch } from "../../components/ui/switch";

const CARD_CLS =
  "bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 shadow-sm";
const LABEL_CLS =
  "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5";
const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";
const PRIMARY_BTN_CLS =
  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-600/20";

type WalletDiscountState = {
  discountEnabled: boolean;
  discountPercent: number;
  showDiscountBadge: boolean;
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

const PaymentOffersSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WalletDiscountState>({
    discountEnabled: false,
    discountPercent: 0,
    showDiscountBadge: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await storefrontSettingsService.getSettings();
        const parsed = parseWalletSettings(
          (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
        );
        if (!active) return;
        setForm({
          discountEnabled: parsed?.discountEnabled === true,
          discountPercent: Number(parsed?.discountPercent || 0),
          showDiscountBadge: parsed?.showDiscountBadge !== false,
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

  const update = (key: keyof WalletDiscountState, value: boolean | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await storefrontSettingsService.getSettings();
      const existing = parseWalletSettings(
        (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
      );
      const result = await storefrontSettingsService.updateSettings({
        walletPaymentSettings: {
          ...existing,
          discountEnabled: form.discountEnabled,
          discountPercent: form.discountPercent,
          showDiscountBadge: form.showDiscountBadge,
        },
      } as Parameters<typeof storefrontSettingsService.updateSettings>[0]);
      if (result?.data) {
        toast.success("تم حفظ إعدادات عروض الدفع بنجاح");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ: " + ((error as { message?: string })?.message || "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-sm text-gray-500 dark:text-gray-400">جارٍ تحميل إعدادات عروض الدفع...</p>
        </div>
      ) : (
        <div className={CARD_CLS}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  خصم الدفع الإلكتروني 🎁
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
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>
                    نسبة الخصم (%)
                  </label>
                  <input
                    type="number"
                    min={0}
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

                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3.5 py-3 dark:bg-gray-900">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      إظهار الخصم للعميل
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      يظهر بجانب طرق الدفع الإلكترونية وفي ملخص الشيك أوت.
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

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={PRIMARY_BTN_CLS}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ إعدادات عروض الدفع"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOffersSettings;
