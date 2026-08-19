import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Check, CheckCircle, Loader2, Save, ShoppingBag } from 'lucide-react';
import { apiClient } from "../../services/api";

interface MinimumOrderSettingsData {
  minimumOrderEnabled: boolean;
  minimumOrderAmount: number;
  minimumOrderMessage: string;
}

interface OrderSettingsResponse {
  success: boolean;
  data: MinimumOrderSettingsData;
  message?: string;
}

const DEFAULT_MINIMUM_ORDER_MESSAGE =
  "الحد الأدنى للطلبات هو {amount} جنيه. أضف منتجات بقيمة {remaining} جنيه لإتمام الطلب.";

const MinimumOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<MinimumOrderSettingsData>({
    minimumOrderEnabled: false,
    minimumOrderAmount: 0,
    minimumOrderMessage: DEFAULT_MINIMUM_ORDER_MESSAGE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const previewMessage = useMemo(() => {
    const amount = Number(settings.minimumOrderAmount || 0);
    const sampleCartTotal = amount > 0 ? amount * 0.6 : 0;
    const remaining = Math.max(0, amount - sampleCartTotal);

    return (settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE)
      .replace(/\{amount\}/g, formatAmount(amount))
      .replace(/\{remaining\}/g, formatAmount(remaining));
  }, [settings.minimumOrderAmount, settings.minimumOrderMessage]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response =
        await apiClient.get<OrderSettingsResponse>("/order-settings");

      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          minimumOrderEnabled: Boolean(data.minimumOrderEnabled),
          minimumOrderAmount: Number(data.minimumOrderAmount || 0),
          minimumOrderMessage:
            data.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
        });
      }
    } catch (error) {
      console.error("Error fetching minimum order settings:", error);
      toast.error("فشل في جلب إعدادات الحد الأدنى للطلبات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const amount = Number(settings.minimumOrderAmount || 0);

    if (settings.minimumOrderEnabled && amount <= 0) {
      toast.error("يجب إدخال قيمة أكبر من صفر عند تفعيل الحد الأدنى");
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<
        OrderSettingsResponse,
        MinimumOrderSettingsData
      >("/order-settings", {
        minimumOrderEnabled: settings.minimumOrderEnabled,
        minimumOrderAmount: amount,
        minimumOrderMessage:
          settings.minimumOrderMessage.trim() || DEFAULT_MINIMUM_ORDER_MESSAGE,
      });

      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          minimumOrderEnabled: Boolean(data.minimumOrderEnabled),
          minimumOrderAmount: Number(data.minimumOrderAmount || 0),
          minimumOrderMessage:
            data.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
        });
        toast.success("تم حفظ إعدادات الحد الأدنى للطلبات");
      }
    } catch (error) {
      console.error("Error saving minimum order settings:", error);
      toast.error("فشل في حفظ إعدادات الحد الأدنى للطلبات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              الحد الأدنى للطلبات
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              تحديد أقل قيمة لمنتجات السلة قبل السماح بإتمام الطلب من المتجر
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
            <div>
              <label
                htmlFor="minimumOrderEnabled"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                تفعيل الحد الأدنى للطلبات
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                عند التفعيل سيتم منع الطلبات الأقل من القيمة المحددة
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="minimumOrderEnabled"
                type="checkbox"
                checked={settings.minimumOrderEnabled}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    minimumOrderEnabled: event.target.checked,
                  })
                }
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:peer-focus:ring-blue-800" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                قيمة الحد الأدنى
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minimumOrderAmount}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      minimumOrderAmount: Number(event.target.value),
                    })
                  }
                  disabled={!settings.minimumOrderEnabled}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-16 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                  جنيه
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                <CheckCircle className="h-4 w-4" />
                الحالة الحالية
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {settings.minimumOrderEnabled
                  ? `مفعل للطلبات الأقل من ${formatAmount(settings.minimumOrderAmount)} جنيه`
                  : "غير مفعل، يمكن إتمام الطلب بأي قيمة"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              رسالة العميل
            </label>
            <textarea
              value={settings.minimumOrderMessage}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minimumOrderMessage: event.target.value,
                })
              }
              disabled={!settings.minimumOrderEnabled}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              المتغيرات المتاحة: {"{amount}"} لقيمة الحد الأدنى، {"{remaining}"} للقيمة المتبقية
            </p>
          </div>

          {settings.minimumOrderEnabled ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  معاينة الرسالة
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                  {previewMessage}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function formatAmount(amount: number) {
  const value = Number(amount || 0);
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

export default MinimumOrderSettings;
