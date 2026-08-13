import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createTiktokConfig,
  deleteTiktokConfig,
  listTiktokConfigs,
  testTiktokConfig,
  updateTiktokConfig,
  type CreateTiktokConfigPayload,
  type TikTokPixelConfig,
} from "../../services/tiktokEventsApi";

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-EG");
  } catch {
    return "—";
  }
};

const testFailureMessage = (result: {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}): string => {
  if (result.success) return "تم إرسال حدث الاختبار بنجاح";
  if (result.skipped) {
    if (result.reason === "missing_endpoint") return "لم يتم الإرسال: الـ endpoint غير مضبوط";
    if (result.reason === "missing_token") return "لم يتم الإرسال: الـ Access Token غير مضبوط";
    if (result.reason === "no_config") return "لم يتم الإرسال: لا يوجد إعداد بيكسل نشط";
    return "تم تخطي إرسال الحدث";
  }
  return result.error || "فشل في إرسال حدث الاختبار";
};

interface NewConfigForm {
  pixelId: string;
  pixelName: string;
  accessToken: string;
  apiEndpoint: string;
  testEventCode: string;
  isActive: boolean;
}

const EMPTY_FORM: NewConfigForm = {
  pixelId: "",
  pixelName: "",
  accessToken: "",
  apiEndpoint: "",
  testEventCode: "",
  isActive: true,
};

const TikTokEventsSettingsCard: React.FC = () => {
  const [configs, setConfigs] = useState<TikTokPixelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewConfigForm>(EMPTY_FORM);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTiktokConfigs();
      setConfigs(data);
    } catch {
      toast.error("فشل في جلب إعدادات بيكسل TikTok");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const updateField =
    (field: keyof NewConfigForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "isActive" ? event.target.checked : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCreate = async () => {
    if (!form.pixelId.trim()) {
      toast.error("pixelId مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateTiktokConfigPayload = {
        pixelId: form.pixelId.trim(),
        isActive: form.isActive,
      };
      if (form.pixelName.trim()) payload.pixelName = form.pixelName.trim();
      if (form.accessToken.trim()) payload.accessToken = form.accessToken.trim();
      if (form.apiEndpoint.trim()) payload.apiEndpoint = form.apiEndpoint.trim();
      if (form.testEventCode.trim()) payload.testEventCode = form.testEventCode.trim();

      const created = await createTiktokConfig(payload);
      setConfigs((prev) => [created, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("تم إنشاء بيكسل TikTok بنجاح");
    } catch {
      toast.error("فشل في إنشاء البيكسل");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (config: TikTokPixelConfig) => {
    try {
      const updated = await updateTiktokConfig(config.id, {
        isActive: !config.isActive,
      });
      setConfigs((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(updated.isActive ? "تم تفعيل البيكسل" : "تم إيقاف البيكسل");
    } catch {
      toast.error("فشل في تحديث حالة البيكسل");
    }
  };

  const handleTest = async (config: TikTokPixelConfig) => {
    try {
      const { result, config: updatedConfig } = await testTiktokConfig(config.id);
      if (updatedConfig?.id) {
        setConfigs((prev) =>
          prev.map((item) =>
            item.id === updatedConfig.id ? updatedConfig : item,
          ),
        );
      }
      if (result.success) {
        toast.success(testFailureMessage(result));
      } else {
        toast.error(testFailureMessage(result));
      }
    } catch {
      toast.error("فشل في اختبار البيكسل");
    }
  };

  const handleDelete = (config: TikTokPixelConfig) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البيكسل؟")) return;
    void (async () => {
      try {
        const updated = await deleteTiktokConfig(config.id);
        setConfigs((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        toast.success("تم حذف البيكسل بنجاح");
      } catch {
        toast.error("فشل في حذف البيكسل");
      }
    })();
  };

  return (
    <div
      dir="rtl"
      className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            أحداث TikTok (Pixel)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تتبع أحداث الإعلانات وتحويلات المتجر عبر TikTok Events API
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {showForm ? "إغلاق" : "إضافة بيكسل"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pixel ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.pixelId}
                onChange={updateField("pixelId")}
                placeholder="7xxxxxxxxxxxxxxxx"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                اسم البيكسل
              </label>
              <input
                type="text"
                value={form.pixelName}
                onChange={updateField("pixelName")}
                placeholder="مثال: متجر MaxP الرئيسي"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Access Token
              </label>
              <input
                type="password"
                value={form.accessToken}
                onChange={updateField("accessToken")}
                placeholder="اختياري"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Endpoint
              </label>
              <input
                type="text"
                value={form.apiEndpoint}
                onChange={updateField("apiEndpoint")}
                placeholder="https://business-api.tiktok.com/open_api/v1.3/event/track/"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Event Code
              </label>
              <input
                type="text"
                value={form.testEventCode}
                onChange={updateField("testEventCode")}
                placeholder="اختياري"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 self-end pb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={updateField("isActive")}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              مفعل عند الإنشاء
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "جارٍ الإنشاء..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
          جارٍ التحميل...
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          لا توجد بيكسلات مضافة بعد — أضف أول بيكسل من زر "إضافة بيكسل"
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {config.pixelName || "بيكسل بدون اسم"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      config.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {config.isActive ? "مفعل" : "معطل"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pixel ID: {config.pixelId}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  آخر اختبار: {formatDate(config.lastTestAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleToggle(config)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    config.isActive
                      ? "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                      : "border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30"
                  }`}
                >
                  {config.isActive ? "إيقاف" : "تفعيل"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleTest(config)}
                  className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                >
                  اختبار
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TikTokEventsSettingsCard;
