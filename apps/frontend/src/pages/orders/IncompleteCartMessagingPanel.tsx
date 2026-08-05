import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/apiClient";
import { WhatsAppBubblePreview } from "./OrderStatusTemplatesPage";

const EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";
const TEMPLATE_CATEGORY = "ABANDONED_CART";

interface NotificationSettings {
  isEnabled?: boolean;
  incompleteCartImmediateMessage?: boolean;
}

interface NotificationTemplate {
  id: string | null;
  name?: string;
  content?: string;
  eventType?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

interface TemplatesResponse {
  success?: boolean;
  templates?: NotificationTemplate[];
}

interface SettingsResponse {
  success?: boolean;
  settings?: NotificationSettings;
}

interface TemplateWriteResponse {
  success?: boolean;
}

const IncompleteCartMessagingPanel: React.FC = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, templatesRes] = await Promise.all([
        apiClient.get<SettingsResponse>("/whatsapp-notifications/settings"),
        apiClient.get<TemplatesResponse>("/whatsapp-notifications/templates", {
          params: { eventType: EVENT_TYPE },
        }),
      ]);

      if (settingsRes.data?.success) {
        setSettings(settingsRes.data.settings || null);
      }

      const templates = Array.isArray(templatesRes.data?.templates) ? templatesRes.data.templates : [];
      const found = templates.find((tpl) => tpl.eventType === EVENT_TYPE) || templates[0] || null;
      setTemplate(found);
      setContent(found?.content || "");
      setName(found?.name || "");
    } catch (err) {
      console.error("Failed to load incomplete cart messaging panel", err);
      toast.error(t("orders.loadError", "حدث خطأ في تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleImmediate = useCallback(
    async (checked: boolean) => {
      setSavingToggle(true);
      try {
        const res = await apiClient.put<SettingsResponse>("/whatsapp-notifications/settings", {
          incompleteCartImmediateMessage: checked,
        });
        if (res.data?.success) {
          setSettings(res.data.settings || null);
          toast.success(checked ? "تم تفعيل رسالة أول ظهور" : "تم إيقاف رسالة أول ظهور");
        }
      } catch (err) {
        console.error("Failed to update incomplete cart messaging setting", err);
        toast.error("فشل حفظ الإعداد");
      } finally {
        setSavingToggle(false);
      }
    },
    [],
  );

  const handleSaveTemplate = async () => {
    if (!content.trim()) {
      toast.error("محتوى الرسالة مطلوب");
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        name: name.trim() || "رسالة أول ظهور - طلب غير مكتمل",
        content,
      };
      const res = template?.id
        ? await apiClient.put<TemplateWriteResponse>(
            `/whatsapp-notifications/templates/${template.id}`,
            payload,
          )
        : await apiClient.post<TemplateWriteResponse>("/whatsapp-notifications/templates", {
            ...payload,
            category: TEMPLATE_CATEGORY,
            eventType: EVENT_TYPE,
            hasButtons: false,
          });
      if (res.data?.success) {
        toast.success("تم حفظ القالب");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save incomplete cart template", err);
      toast.error("فشل حفظ القالب");
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const immediateEnabled = Boolean(settings?.incompleteCartImmediateMessage);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">رسالة أول ظهور للطلب غير المكتمل</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              عندما يبدأ العميل في إنهاء الطلب ويظهر في قائمة الطلبات غير المكتملة لأول مرة، تُرسل له هذه الرسالة
              فوراً عبر واتساب.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={immediateEnabled}
              onCheckedChange={(checked) => void handleToggleImmediate(checked)}
              disabled={savingToggle || !settings?.isEnabled}
              aria-label="تفعيل رسالة أول ظهور"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {immediateEnabled ? "مفعل" : "متوقف"}
            </span>
          </div>
        </div>
        {!settings?.isEnabled && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            إشعارات الواتساب العامة متوقفة حالياً — فعّلها من تبويب الإعدادات أولاً.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">نص الرسالة</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              استخدم المتغيرات: {"{customerName}"} {"{itemCount}"} {"{total}"} {"{currency}"}
            </p>
          </div>
          {template?.id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
              محفوظ
            </span>
          )}
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">اسم القالب</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          placeholder="اسم القالب"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">محتوى الرسالة</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          placeholder="اكتب نص الرسالة هنا..."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingTemplate ? "جاري الحفظ..." : "حفظ القالب"}
          </button>
          <div className="w-full sm:w-auto">
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">معاينة</p>
            <WhatsAppBubblePreview content={content} buttons={[]} hasButtons={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncompleteCartMessagingPanel;
