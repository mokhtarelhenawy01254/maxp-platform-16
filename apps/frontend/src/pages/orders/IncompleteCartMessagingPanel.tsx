import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/apiClient";
import { WhatsAppBubblePreview } from "./OrderStatusTemplatesPage";

const EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";
const TEMPLATE_CATEGORY = "ABANDONED_CART";

type SendChannel = "AUTO" | "BAILEYS" | "META_CLOUD";

interface NotificationSettings {
  isEnabled?: boolean;
  incompleteCartImmediateMessage?: boolean;
  defaultSessionId?: string | null;
}

interface Session {
  id: string;
  name?: string;
  phoneNumber?: string;
  status?: string;
  provider?: string;
}

interface NotificationTemplate {
  id: string | null;
  name?: string;
  content?: string;
  eventType?: string;
  isDefault?: boolean;
  isActive?: boolean;
  channel?: SendChannel;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
}

interface MetaAvailableTemplate {
  name: string;
  status?: string;
  language?: string;
  category?: string;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
}

interface TemplatesResponse {
  success?: boolean;
  templates?: NotificationTemplate[];
}

interface SettingsResponse {
  success?: boolean;
  settings?: NotificationSettings;
  sessions?: Session[];
}

interface TemplateWriteResponse {
  success?: boolean;
}

interface MetaActionResponse {
  success?: boolean;
  metaTemplateName?: string;
  message?: string;
  template?: NotificationTemplate;
}

const CHANNEL_OPTIONS: Array<{ value: SendChannel; label: string; hint: string }> = [
  {
    value: "AUTO",
    label: "تلقائي",
    hint: "يرسل عبر قالب ميتا المعتمد إن كان مربوطاً، وإلا نص حر من رقم الواتساب المتصل.",
  },
  {
    value: "BAILEYS",
    label: "واتساب عادي (نص حر)",
    hint: "دائماً نص حر من رقم الواتساب المتصل بالكود QR — بدون قالب معتمد من ميتا.",
  },
  {
    value: "META_CLOUD",
    label: "ميتا الرسمي (قالب معتمد)",
    hint: "فقط عبر قالب ميتا معتمد ومرتبط. لو القالب مش معتمد بعد، الرسالة لن تُرسل.",
  },
];

const IncompleteCartMessagingPanel: React.FC = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<SendChannel>("AUTO");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [metaAvailable, setMetaAvailable] = useState<MetaAvailableTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [binding, setBinding] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const metaSession = useMemo(() => {
    const metaSessions = sessions.filter((s) => s.provider === "META_CLOUD" && s.status === "CONNECTED");
    if (settings?.defaultSessionId) {
      const byDefault = metaSessions.find((s) => s.id === settings.defaultSessionId);
      if (byDefault) return byDefault;
    }
    return metaSessions[0] || null;
  }, [sessions, settings?.defaultSessionId]);

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
        setSessions(Array.isArray(settingsRes.data.sessions) ? settingsRes.data.sessions : []);
      }

      const templates = Array.isArray(templatesRes.data?.templates) ? templatesRes.data.templates : [];
      const found = templates.find((tpl) => tpl.eventType === EVENT_TYPE) || templates[0] || null;
      setTemplate(found);
      setContent(found?.content || "");
      setName(found?.name || "");
      setChannel((found?.channel as SendChannel) || "AUTO");
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

  const loadMetaAvailable = useCallback(async () => {
    if (!metaSession) return;
    setLoadingMeta(true);
    try {
      const res = await apiClient.get<{ success?: boolean; templates?: MetaAvailableTemplate[] }>(
        "/whatsapp-notifications/templates/meta-available",
        { params: { sessionId: metaSession.id } },
      );
      setMetaAvailable(Array.isArray(res.data?.templates) ? res.data.templates : []);
    } catch (err) {
      console.error("Failed to load available Meta templates", err);
      toast.error("فشل تحميل قوالب ميتا المتاحة");
    } finally {
      setLoadingMeta(false);
    }
  }, [metaSession]);

  useEffect(() => {
    if (metaSession) {
      loadMetaAvailable();
    }
  }, [metaSession, loadMetaAvailable]);

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

  const handleSaveTemplate = async (nextChannel: SendChannel = channel) => {
    if (!content.trim()) {
      toast.error("محتوى الرسالة مطلوب");
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        name: name.trim() || "رسالة أول ظهور - طلب غير مكتمل",
        content,
        channel: nextChannel,
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

  const handleChannelChange = async (next: SendChannel) => {
    setChannel(next);
    await handleSaveTemplate(next);
  };

  const handlePublishMeta = async () => {
    if (!template?.id || !metaSession) return;
    setPublishing(true);
    try {
      const res = await apiClient.post<MetaActionResponse>(
        `/whatsapp-notifications/templates/${template.id}/publish`,
        { sessionId: metaSession.id },
      );
      if (res.data?.success) {
        toast.success(res.data.message || "تم إرسال القالب لميتا للمراجعة");
        fetchData();
      } else {
        toast.error("فشل نشر القالب لميتا");
      }
    } catch (err) {
      console.error("Failed to publish template to Meta", err);
      const apiError = err as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "فشل نشر القالب لميتا");
    } finally {
      setPublishing(false);
    }
  };

  const handleBindMeta = async (metaTemplateName: string) => {
    if (!template?.id || !metaSession) return;
    setBinding(true);
    try {
      const res = await apiClient.post<MetaActionResponse>(
        `/whatsapp-notifications/templates/${template.id}/bind-meta`,
        { sessionId: metaSession.id, metaTemplateName },
      );
      if (res.data?.success) {
        toast.success(`تم الربط بقالب ميتا "${metaTemplateName}"`);
        fetchData();
      } else {
        toast.error("فشل ربط قالب ميتا");
      }
    } catch (err) {
      console.error("Failed to bind Meta template", err);
      const apiError = err as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "فشل ربط قالب ميتا");
    } finally {
      setBinding(false);
    }
  };

  const handleResubmitMeta = async () => {
    if (!template?.id || !metaSession) return;
    setResubmitting(true);
    try {
      const res = await apiClient.post<MetaActionResponse>(
        `/whatsapp-notifications/templates/${template.id}/resubmit-meta`,
        { sessionId: metaSession.id },
      );
      if (res.data?.success) {
        toast.success("تم إرسال القالب للمراجعة من جديد");
        fetchData();
      } else {
        toast.error("فشل إرسال القالب للمراجعة");
      }
    } catch (err) {
      console.error("Failed to resubmit template to Meta", err);
      const apiError = err as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "فشل إرسال القالب للمراجعة");
    } finally {
      setResubmitting(false);
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

  const connectedSessions = sessions.filter((s) => s.status === "CONNECTED");
  const defaultConnected = settings?.defaultSessionId
    ? connectedSessions.find((s) => s.id === settings.defaultSessionId)
    : undefined;
  const effectiveSession = defaultConnected || connectedSessions[0] || null;
  const provider = effectiveSession?.provider || null;
  const metaApproved =
    template?.metaTemplateName &&
    String(template.metaTemplateStatus).toUpperCase() === "APPROVED";

  const bindableTemplates = metaAvailable.filter(
    (m) => !m.boundToLocalTemplateId || m.boundToLocalTemplateId === template?.id,
  );

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl border p-4 text-sm ${
          provider === "BAILEYS"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
            : provider === "META_CLOUD"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
        }`}
      >
        {!effectiveSession ? (
          <p>مفيش جلسة واتساب متصلة حالياً — الرسالة مش هتتبعت. اربط رقم واتساب من صفحة إعدادات الواتساب.</p>
        ) : (
          <p>
            جلسة الإرسال الحالية: <strong>{effectiveSession.name || "جلسة واتساب"}</strong>{" "}
            {effectiveSession.phoneNumber ? `(${effectiveSession.phoneNumber})` : ""} —{" "}
            {provider === "BAILEYS"
              ? "واتساب عادي (نص حر)."
              : "ميتا الرسمي (Cloud API)."}
          </p>
        )}
      </div>

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
        <h2 className="text-base font-bold text-slate-900 dark:text-white">طريقة الإرسال</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          اختر القناة التي سيُرسل منها العميل رسالته — نفس خيارات قوالب حالات الطلبات.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {CHANNEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void handleChannelChange(option.value)}
              disabled={savingTemplate}
              className={`rounded-xl border p-4 text-start transition ${
                channel === option.value
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-900/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</span>
                <span
                  className={`h-3.5 w-3.5 rounded-full border-2 ${
                    channel === option.value ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                  }`}
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{option.hint}</p>
            </button>
          ))}
        </div>
        {savingTemplate && (
          <p className="mt-2 text-xs text-slate-400">جاري حفظ طريقة الإرسال...</p>
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
          {metaApproved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              قالب ميتا معتمد: {template.metaTemplateName}
            </span>
          ) : template?.metaTemplateName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              قيد المراجعة في ميتا ({template.metaTemplateStatus || "PENDING"})
            </span>
          ) : template?.id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
              محفوظ (قالب محلي)
            </span>
          ) : null}
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
            onClick={() => void handleSaveTemplate()}
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

      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">الربط بميتا (Cloud API)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              للإرسال عبر ميتا الرسمي، اربط القالب المحلي بقالب ميتا معتمد — أو انشره لميتا ثم انتظر الموافقة.
            </p>
          </div>
          {template?.id && metaSession && !metaApproved && (
            <button
              type="button"
              onClick={() => void handlePublishMeta()}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            >
              {publishing ? "جاري النشر..." : "نشر القالب لميتا"}
            </button>
          )}
        </div>

        {!metaSession ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            مفيش جلسة ميتا متصلة في الشركة — لربط قالب ميتا، اربط جلسة Meta Cloud API من إعدادات الواتساب أولاً.
          </p>
        ) : !template?.id ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">احفظ القالب أولاً من قسم "نص الرسالة".</p>
        ) : metaApproved ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              مربوط بقالب ميتا معتمد: {template.metaTemplateName}
            </span>
            <button
              type="button"
              onClick={() => void handleResubmitMeta()}
              disabled={resubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            >
              {resubmitting ? "جاري الإرسال..." : "إرسال للمراجعة من جديد"}
            </button>
          </div>
        ) : (
          <div>
            {loadingMeta ? (
              <p className="text-sm text-slate-400">جاري تحميل قوالب ميتا المتاحة...</p>
            ) : bindableTemplates.length > 0 ? (
              <div className="space-y-2">
                {bindableTemplates.map((meta) => (
                  <div
                    key={meta.name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{meta.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {meta.language || "ar"} · {meta.category || "UTILITY"}
                        {meta.boundToEventType && meta.boundToEventType !== EVENT_TYPE
                          ? ` · مربوط حالياً بـ ${meta.boundToEventType}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBindMeta(meta.name)}
                      disabled={binding}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {binding ? "جاري الربط..." : "ربط"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  مفيش قالب ميتا معتمد متاح للربط — انشر القالب المحلي لميتا وانتظر الموافقة.
                </p>
                <button
                  type="button"
                  onClick={() => void handlePublishMeta()}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                >
                  {publishing ? "جاري النشر..." : "نشر القالب لميتا"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncompleteCartMessagingPanel;
