import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Plus, X, Play, Trash2, Power, Check, Loader2 } from "lucide-react";
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

      await createTiktokConfig(payload);
      toast.success("تم إنشاء إعداد بيكسل TikTok بنجاح");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadConfigs();
    } catch {
      toast.error("فشل إنشاء بيكسل TikTok");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (config: TikTokPixelConfig) => {
    try {
      await updateTiktokConfig(config.id, { isActive: !config.isActive });
      toast.success(config.isActive ? "تم إيقاف البيكسل" : "تم تفعيل البيكسل");
      await loadConfigs();
    } catch {
      toast.error("فشل تعديل حالة البيكسل");
    }
  };

  const handleTest = async (config: TikTokPixelConfig) => {
    try {
      const result = await testTiktokConfig(config.id);
      if (result.success) {
        toast.success("تم إرسال حدث الاختبار بنجاح");
      } else {
        toast.error(testFailureMessage(result));
      }
      await loadConfigs();
    } catch {
      toast.error("حدث خطأ أثناء فحص البيكسل");
    }
  };

  const handleDelete = async (config: TikTokPixelConfig) => {
    if (!confirm(`هل أنت متأكد من حذف البيكسل ${config.pixelName || config.pixelId}؟`)) {
      return;
    }
    try {
      await deleteTiktokConfig(config.id);
      toast.success("تم حذف البيكسل بنجاح");
      await loadConfigs();
    } catch {
      toast.error("فشل حذف البيكسل");
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 text-foreground shadow-none space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Activity className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              TikTok Events API & Pixel
            </h3>
            <p className="text-xs text-muted-foreground">
              ربط وتتبع أحداث الشراء والتحويلات عبر واجهة TikTok Events API
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          <span>{showForm ? "إلغاء النموذج" : "إضافة بيكسل"}</span>
        </button>
      </div>

      {/* Form Drawer */}
      {showForm && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3.5 animate-in fade-in-0 duration-150">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Pixel ID <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.pixelId}
                onChange={updateField("pixelId")}
                placeholder="7xxxxxxxxxxxxxxxx"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                اسم البيكسل
              </label>
              <input
                type="text"
                value={form.pixelName}
                onChange={updateField("pixelName")}
                placeholder="مثال: متجر MaxP الرئيسي"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Access Token
              </label>
              <input
                type="password"
                value={form.accessToken}
                onChange={updateField("accessToken")}
                placeholder="اختياري للـ Events API"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                API Endpoint
              </label>
              <input
                type="text"
                value={form.apiEndpoint}
                onChange={updateField("apiEndpoint")}
                placeholder="https://business-api.tiktok.com/open_api/v1.3/event/track/"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Test Event Code
              </label>
              <input
                type="text"
                value={form.testEventCode}
                onChange={updateField("testEventCode")}
                placeholder="رمز فحص الأحداث (اختياري)"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={updateField("isActive")}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>تفعيل البيكسل فور الإنشاء</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="h-8.5 rounded-xl border border-border/70 bg-card px-3.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>{submitting ? "جارٍ الإنشاء..." : "حفظ البيكسل"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Configs List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary me-2" />
          <span>جارٍ تحميل إعدادات البيكسل...</span>
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 py-8 text-center text-xs text-muted-foreground">
          لا توجد بيكسلات مضافة بعد — انقر على زر "إضافة بيكسل" للبدء
        </div>
      ) : (
        <div className="space-y-2.5">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:border-border"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {config.pixelName || "بيكسل بدون اسم"}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      config.isActive
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border border-border/70 bg-muted text-muted-foreground"
                    }`}
                  >
                    {config.isActive ? "نشط" : "معطل"}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  Pixel ID: {config.pixelId}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground/80 tabular-nums">
                  آخر فحص: {formatDate(config.lastTestAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleToggle(config)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.97]"
                >
                  <Power className="size-3 text-muted-foreground" />
                  <span>{config.isActive ? "إيقاف" : "تفعيل"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleTest(config)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.97]"
                >
                  <Play className="size-3 text-primary" />
                  <span>فحص</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-[0.97]"
                  aria-label="حذف"
                >
                  <Trash2 className="size-3" />
                  <span>حذف</span>
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
