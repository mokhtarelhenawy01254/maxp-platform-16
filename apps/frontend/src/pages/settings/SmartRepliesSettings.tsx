import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

export type SmartReplyChannel =
  | "WHATSAPP"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TIKTOK"
  | "TELEGRAM_USER"
  | "TELEGRAM_BOT";

interface AutoReplyTemplate {
  id: string;
  name: string;
  type: "greeting" | "thanks" | "confirmation" | "farewell" | "custom";
  channels?: SmartReplyChannel[];
  keywords: string[];
  responses: string[];
  isDefault?: boolean;
}

interface Settings {
  enabled: boolean;
  channels: SmartReplyChannel[];
  templates: AutoReplyTemplate[];
}

const DEFAULT_CHANNELS: SmartReplyChannel[] = [
  "WHATSAPP",
  "FACEBOOK",
  "INSTAGRAM",
];

const ALL_CHANNELS: {
  id: SmartReplyChannel;
  label: string;
  shortLabel: string;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
}[] = [
  {
    id: "WHATSAPP",
    label: "واتساب (WhatsApp)",
    shortLabel: "واتساب",
    activeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80",
  },
  {
    id: "FACEBOOK",
    label: "فيسبوك ماسنجر (Messenger)",
    shortLabel: "ماسنجر",
    activeClass:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80",
  },
  {
    id: "INSTAGRAM",
    label: "إنستغرام (Instagram)",
    shortLabel: "إنستغرام",
    activeClass:
      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 dark:border-fuchsia-700 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200/80 dark:border-fuchsia-800/80",
  },
  {
    id: "TIKTOK",
    label: "تيك توك (TikTok)",
    shortLabel: "تيك توك",
    activeClass:
      "bg-neutral-900 text-white border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-300 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700",
  },
  {
    id: "TELEGRAM_USER",
    label: "تلجرام - حساب شخصي (User)",
    shortLabel: "تلجرام يوزر",
    activeClass:
      "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80",
  },
  {
    id: "TELEGRAM_BOT",
    label: "تلجرام - بوت (Bot)",
    shortLabel: "تلجرام بوت",
    activeClass:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-700 shadow-xs",
    inactiveClass:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750",
    badgeClass:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/80",
  },
];

function SmartReplyChannelBadges({
  channels,
}: {
  channels?: SmartReplyChannel[];
}) {
  const currentChannels =
    Array.isArray(channels) && channels.length > 0
      ? channels
      : DEFAULT_CHANNELS;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ALL_CHANNELS.filter((c) => currentChannels.includes(c.id)).map((c) => (
        <span
          key={c.id}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.badgeClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
          <span>{c.shortLabel}</span>
        </span>
      ))}
    </div>
  );
}

const defaultTemplates: AutoReplyTemplate[] = [];

const SmartRepliesSettings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    channels: DEFAULT_CHANNELS,
    templates: defaultTemplates,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<AutoReplyTemplate | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/smart-replies/rule-responses");
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setSettings({
          enabled: data.enableRuleResponses === true,
          channels:
            Array.isArray(data.channels) && data.channels.length > 0
              ? data.channels
              : DEFAULT_CHANNELS,
          templates: data.customRuleResponses?.templates || defaultTemplates,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error(t("smartReplies.loadFailed") || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const persistSettings = async (
    newTemplates: AutoReplyTemplate[],
    enabledState: boolean = settings.enabled,
    channelsState: SmartReplyChannel[] = settings.channels,
  ) => {
    try {
      setSaving(true);
      await apiClient.put("/smart-replies/rule-responses", {
        enableRuleResponses: enabledState,
        channels: channelsState,
        customRuleResponses: {
          templates: newTemplates,
        },
      });
      return true;
    } catch (error: unknown) {
      console.error("Error saving smart replies:", error);
      const apiError = error as { response?: { data?: { error?: string } } };
      const msg = apiError?.response?.data?.error || t("smartReplies.saveFailed") || "فشل الحفظ";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const success = await persistSettings(
      settings.templates,
      settings.enabled,
      settings.channels
    );
    if (success) {
      toast.success(t("smartReplies.ruleSaved") || "تم الحفظ بنجاح");
    }
  };

  const handleToggleEnable = async () => {
    const nextEnabled = !settings.enabled;
    setSettings((prev) => ({ ...prev, enabled: nextEnabled }));
    const success = await persistSettings(
      settings.templates,
      nextEnabled,
      settings.channels
    );
    if (success) {
      toast.success(
        nextEnabled
          ? "تم تفعيل الردود التلقائية بنجاح"
          : "تم إيقاف الردود التلقائية"
      );
    }
  };

  const handleToggleGlobalChannel = async (channelId: SmartReplyChannel) => {
    const current = settings.channels || DEFAULT_CHANNELS;
    const exists = current.includes(channelId);
    const nextChannels = exists
      ? current.filter((c) => c !== channelId)
      : [...current, channelId];

    if (nextChannels.length === 0) {
      toast.error("يجب تفعيل قناة واحدة على الأقل أو إيقاف الردود التلقائية بالكامل من المفتاح الرئيسي");
      return;
    }

    setSettings((prev) => ({ ...prev, channels: nextChannels }));
    const success = await persistSettings(
      settings.templates,
      settings.enabled,
      nextChannels
    );
    if (success) {
      const channelLabel =
        ALL_CHANNELS.find((c) => c.id === channelId)?.shortLabel || channelId;
      toast.success(
        exists
          ? `تم إيقاف الردود التلقائية على ${channelLabel}`
          : `تم تشغيل الردود التلقائية على ${channelLabel}`
      );
    }
  };

  const handleToggleTemplateChannel = (channelId: SmartReplyChannel) => {
    if (!editingTemplate) return;
    const current =
      Array.isArray(editingTemplate.channels) &&
      editingTemplate.channels.length > 0
        ? editingTemplate.channels
        : DEFAULT_CHANNELS;
    const exists = current.includes(channelId);
    const next = exists
      ? current.filter((c) => c !== channelId)
      : [...current, channelId];

    if (next.length === 0) {
      toast.error("يجب اختيار قناة واحدة على الأقل لهذا القالب");
      return;
    }

    setEditingTemplate({
      ...editingTemplate,
      channels: next,
    });
  };

  const handleEditStart = (template: AutoReplyTemplate) => {
    setEditingId(template.id);
    setEditingTemplate({
      ...template,
      channels:
        Array.isArray(template.channels) && template.channels.length > 0
          ? [...template.channels]
          : DEFAULT_CHANNELS,
      keywords: Array.isArray(template.keywords) ? [...template.keywords] : [],
      responses:
        Array.isArray(template.responses) && template.responses.length > 0
          ? [...template.responses]
          : [""],
    });
    setNewKeyword("");
  };

  const handleEditSave = async () => {
    if (!editingTemplate) return;

    const trimmedName = editingTemplate.name.trim();
    if (!trimmedName) {
      toast.error(t("smartReplies.nameRequired") || "اسم القاعدة مطلوب");
      return;
    }

    // Auto-commit pending newKeyword if user didn't press plus
    const keywordsPool = [...editingTemplate.keywords];
    if (newKeyword.trim()) {
      const parts = newKeyword
        .split(/[,،\n]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      keywordsPool.push(...parts);
      setNewKeyword("");
    }

    const cleanKeywords = Array.from(
      new Set(keywordsPool.map((k) => k.trim()))
    ).filter(Boolean);

    if (cleanKeywords.length === 0) {
      toast.error("يرجى إضافة كلمة مفتاحية واحدة على الأقل");
      return;
    }

    const cleanResponses = editingTemplate.responses
      .map((r) => r.trim())
      .filter(Boolean);

    if (cleanResponses.length === 0) {
      toast.error(t("smartReplies.templateRequired") || "قالب الرد مطلوب");
      return;
    }

    const targetChannels =
      Array.isArray(editingTemplate.channels) && editingTemplate.channels.length > 0
        ? editingTemplate.channels
        : DEFAULT_CHANNELS;

    const updatedTemplate: AutoReplyTemplate = {
      ...editingTemplate,
      name: trimmedName,
      channels: targetChannels,
      keywords: cleanKeywords,
      responses: cleanResponses,
    };

    const isNew = !settings.templates.some((t) => t.id === editingId);
    const updatedTemplates = isNew
      ? [updatedTemplate, ...settings.templates]
      : settings.templates.map((t) =>
          t.id === editingId ? updatedTemplate : t
        );

    const success = await persistSettings(updatedTemplates);
    if (success) {
      setSettings((prev) => ({
        ...prev,
        templates: updatedTemplates,
      }));
      setEditingId(null);
      setEditingTemplate(null);
      toast.success(t("smartReplies.ruleSaved") || "تم حفظ القالب بنجاح");
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTemplate(null);
    setNewKeyword("");
  };

  const handleDelete = async (id: string) => {
    const confirmMsg =
      t("smartReplies.ruleDeleteConfirm") || "هل أنت متأكد من حذف هذا القالب؟";
    if (!window.confirm(confirmMsg)) return;

    const updatedTemplates = settings.templates.filter((t) => t.id !== id);
    setSettings((prev) => ({
      ...prev,
      templates: updatedTemplates,
    }));

    if (editingId === id) {
      setEditingId(null);
      setEditingTemplate(null);
    }

    const success = await persistSettings(updatedTemplates);
    if (success) {
      toast.success(t("smartReplies.ruleDeleted") || "تم حذف القالب بنجاح");
    }
  };

  const templatesContainerRef = React.useRef<HTMLDivElement>(null);

  const handleAddTemplate = () => {
    const newTemplate: AutoReplyTemplate = {
      id: `custom_${Date.now()}`,
      name: "",
      type: "custom",
      channels: DEFAULT_CHANNELS,
      keywords: [],
      responses: [""],
    };
    handleEditStart(newTemplate);
    setTimeout(() => {
      templatesContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim() || !editingTemplate) return;
    const parts = newKeyword
      .split(/[,،\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const existing = new Set(
      editingTemplate.keywords.map((k) => k.toLowerCase())
    );
    const toAdd = parts.filter((k) => !existing.has(k.toLowerCase()));

    if (toAdd.length > 0) {
      setEditingTemplate({
        ...editingTemplate,
        keywords: [...editingTemplate.keywords, ...toAdd],
      });
    }
    setNewKeyword("");
  };

  const handleRemoveKeyword = (index: number) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      keywords: editingTemplate.keywords.filter((_, i) => i !== index),
    });
  };

  const handleResponseChange = (index: number, value: string) => {
    if (!editingTemplate) return;
    const newResponses = [...editingTemplate.responses];
    newResponses[index] = value;
    setEditingTemplate({ ...editingTemplate, responses: newResponses });
  };

  const handleAddResponse = () => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      responses: [...editingTemplate.responses, ""],
    });
  };

  const handleRemoveResponse = (index: number) => {
    if (!editingTemplate) return;
    if (editingTemplate.responses.length <= 1) {
      toast.error("يجب إبقاء رد واحد على الأقل للقالب");
      return;
    }
    setEditingTemplate({
      ...editingTemplate,
      responses: editingTemplate.responses.filter((_, i) => i !== index),
    });
  };

  const toggleExpand = (templateId: string, idx: number) => {
    const key = `${templateId}_${idx}`;
    setExpandedResponses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t("smartReplies.loading") || "جاري التحميل..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 sm:pb-12" dir="rtl">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 -mr-1 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
              title={t("smartReplies.back") || "رجوع"}
              aria-label={t("smartReplies.back") || "رجوع"}
            >
              <ArrowLeftIcon className="h-5 w-5 rtl:rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <span className="truncate">{t("smartReplies.pageTitle") || "الردود التلقائية الذكية"}</span>
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                {t("smartReplies.pageSubtitle") ||
                  "إدارة وتعديل قوالب الردود التلقائية ورسائل خدمة العملاء الموجهة للعملاء"}
              </p>
            </div>
          </div>

          <button
            onClick={handleAddTemplate}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            <span>{t("smartReplies.addRule") || "إضافة قالب جديد"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Toggle Card */}
        <div
          className={`rounded-2xl shadow-xs border p-4 sm:p-5 transition-all duration-200 ${
            settings.enabled
              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/60 shadow-emerald-500/5"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 sm:p-2.5 rounded-xl shrink-0 transition-colors ${
                  settings.enabled
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                }`}
              >
                <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                  {t("smartReplies.enableTitle") || "الردود التلقائية"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden xs:block truncate">
                  {settings.enabled
                    ? t("smartReplies.enableDesc") ||
                      "القوالب مفعلة وتعمل تلقائياً عند مطابقة الكلمات"
                    : t("smartReplies.disabledDesc") ||
                      "الردود التلقائية متوقفة حالياً"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span
                className={`text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                  settings.enabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    settings.enabled
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-gray-400 dark:bg-gray-500"
                  }`}
                />
                {settings.enabled
                  ? t("smartReplies.active") || "نشط"
                  : t("smartReplies.inactive") || "معطل"}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={handleToggleEnable}
                dir="ltr"
                className={`relative inline-flex h-7 w-12 sm:w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  settings.enabled
                    ? "bg-emerald-600 dark:bg-emerald-500 shadow-xs"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span className="sr-only">
                  {t("smartReplies.enableTitle") || "الردود التلقائية"}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    settings.enabled ? "translate-x-5 sm:translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Global Channel Selector */}
          <div
            className={`mt-4 pt-3 border-t transition-opacity ${
              settings.enabled
                ? "border-emerald-200/70 dark:border-emerald-800/60"
                : "border-gray-200 dark:border-gray-700 opacity-60"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  المنصات المدعومة للرد التلقائي:
                </span>
                <span className="text-[11px] text-gray-400 sm:hidden">
                  (اسحب للتمرير ↔)
                </span>
              </div>

              {/* Horizontal scroll on mobile, flex wrap on desktop */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 sm:flex-wrap -mx-1 px-1">
                {ALL_CHANNELS.map((channel) => {
                  const isChannelActive = settings.channels.includes(channel.id);
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => handleToggleGlobalChannel(channel.id)}
                      disabled={saving}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                        isChannelActive
                          ? channel.activeClass
                          : channel.inactiveClass
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isChannelActive
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-gray-400"
                        }`}
                      />
                      <span>{channel.shortLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-black/5 dark:bg-white/10">
                        {isChannelActive ? "مفعل" : "معطل"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        {(() => {
          const isCreatingNew = Boolean(
            editingId &&
            editingTemplate &&
            !settings.templates.some((t) => t.id === editingId)
          );
          const templatesToRender =
            isCreatingNew && editingTemplate
              ? [editingTemplate, ...settings.templates]
              : settings.templates;

          return (
            <div
              ref={templatesContainerRef}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {t("smartReplies.templates") || "قوالب الردود"}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                    {settings.templates.length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {templatesToRender.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3 opacity-60" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                      {t("smartReplies.noRules") || "لا توجد قوالب ردود بعد"}
                    </p>
                    <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto text-gray-500">
                      {t("smartReplies.noRulesDesc") ||
                        "أضف قوالب الردود التلقائية لتسهيل وسرعة الرد على العملاء فور إرسالهم للرسائل"}
                    </p>
                    <button
                      onClick={handleAddTemplate}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>{t("smartReplies.addRule") || "إضافة قالب جديد"}</span>
                    </button>
                  </div>
                ) : (
                  templatesToRender.map((template) => {
                    const isEditing = editingId === template.id;

                    if (isEditing && editingTemplate) {
                      // Edit Mode ("الابديت")
                      return (
                        <div
                          key={template.id}
                          className="p-3.5 sm:p-6 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-4 border-y-2 border-indigo-500/40 relative"
                        >
                          {/* Edit Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                                {isCreatingNew ? (
                                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                ) : (
                                  <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                )}
                              </span>
                              <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {isCreatingNew
                                  ? "إضافة قالب رد تلقائي جديد"
                                  : t("smartReplies.editTemplate") || "تعديل القالب"}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {isCreatingNew ? "قالب جديد" : "جاري التعديل"}
                              </span>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
                                title="إلغاء التعديل"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Name Input */}
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                              {t("smartReplies.ruleName") || "اسم القالب / التصنيف"}
                            </label>
                            <input
                              type="text"
                              value={editingTemplate.name}
                              onChange={(e) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              placeholder="مثال: رسالة الترحيب، أسعار الشحن، الاستفسار عن المقاسات"
                            />
                          </div>

                          {/* Target Channels for this template */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                                القنوات المستهدفة لهذا القالب
                              </label>
                              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                {(editingTemplate.channels || DEFAULT_CHANNELS).length} قنوات محددة
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                              اختر القنوات التي سيعمل عليها هذا الرد التلقائي (اسحب للتمرير ↔)
                            </p>
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 sm:flex-wrap -mx-1 px-1">
                              {ALL_CHANNELS.map((channel) => {
                                const isSelected = (
                                  editingTemplate.channels || DEFAULT_CHANNELS
                                ).includes(channel.id);
                                return (
                                  <button
                                    key={channel.id}
                                    type="button"
                                    onClick={() =>
                                      handleToggleTemplateChannel(channel.id)
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                                      isSelected
                                        ? channel.activeClass
                                        : channel.inactiveClass
                                    }`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isSelected
                                          ? "bg-emerald-500"
                                          : "bg-gray-400"
                                      }`}
                                    />
                                    <span>{channel.shortLabel}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Keywords */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                                {t("smartReplies.keywords") || "الكلمات المفتاحية الدالة"}
                              </label>
                              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                {editingTemplate.keywords.length} كلمة دالة
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                              {t("smartReplies.keywordHelper") ||
                                "اكتب الكلمة واضغط Enter أو زر إضافة (يمكنك كتابة عدة كلمات مفصولة بفاصلة)"}
                            </p>

                            <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[36px] p-2 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl">
                              {editingTemplate.keywords.length === 0 ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                                  لم يتم إضافة كلمات دالة بعد
                                </span>
                              ) : (
                                editingTemplate.keywords.map((kw, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs font-semibold"
                                  >
                                    <span>{kw}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveKeyword(idx)}
                                      className="hover:text-red-500 p-0.5 rounded-full hover:bg-white/40 dark:hover:bg-black/20 transition-colors"
                                      title="إزالة الكلمة"
                                    >
                                      <XMarkIcon className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Keywords Input Row - Guaranteed zero horizontal overflow */}
                            <div className="flex items-center gap-2 min-w-0 w-full">
                              <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddKeyword();
                                  }
                                }}
                                className="min-w-0 flex-1 px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder={
                                  t("smartReplies.keywordPlaceholder") ||
                                  "مثال: السلام عليكم، متوفر، السعر"
                                }
                              />
                              <button
                                type="button"
                                onClick={handleAddKeyword}
                                className="shrink-0 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span>إضافة</span>
                              </button>
                            </div>
                          </div>

                          {/* Responses (Multi-line textareas) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                                {t("smartReplies.replyContent") || "نصوص الرد التلقائي"}
                              </label>
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                يدعم الأسطر المتعددة
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
                              💡 اضغط <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded font-mono text-[10px]">Enter</kbd> لكتابة أسطر مرتبة تحت بعضها بالتفصيل.
                            </p>

                            <div className="space-y-3">
                              {editingTemplate.responses.map((resp, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 sm:p-3.5 bg-white dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2 shadow-xs"
                                >
                                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                      <span>
                                        {editingTemplate.responses.length > 1
                                          ? `الرد البديل رقم ${idx + 1}`
                                          : "نص الرد التلقائي"}
                                      </span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px]">
                                        {resp.length} حرف • {resp.split("\n").length} سطر
                                      </span>
                                      {editingTemplate.responses.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveResponse(idx)}
                                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1 transition-colors"
                                          title="حذف هذا الرد البديل"
                                        >
                                          <TrashIcon className="h-3.5 w-3.5" />
                                          <span className="text-xs">حذف</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Multi-line Textarea */}
                                  <textarea
                                    rows={Math.min(8, Math.max(3, resp.split("\n").length + 1))}
                                    value={resp}
                                    onChange={(e) =>
                                      handleResponseChange(idx, e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed whitespace-pre-wrap dir-rtl text-right resize-y transition-all"
                                    placeholder={
                                      t("smartReplies.templatePlaceholder") ||
                                      "اكتب نص الرد التلقائي هنا... استخدم Enter لكتابة أسطر مرتبة تحت بعضها"
                                    }
                                    dir="rtl"
                                  />

                                  {/* Live Formatted Preview */}
                                  {resp.trim().length > 0 && (
                                    <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-right">
                                      <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1 mb-1.5">
                                        <EyeIcon className="w-3 h-3" />
                                        <span>معاينة شكل الرد للعميل:</span>
                                      </div>
                                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words leading-relaxed font-sans bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700">
                                        {resp}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={handleAddResponse}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 p-1 active:scale-95"
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span>
                                  {t("smartReplies.addAlternativeResponse") ||
                                    "+ إضافة رد بديل آخر (يتم التبديل عشوائياً بينها)"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Sticky Action Bar for Edit Mode - Never hidden or unreachable */}
                          <div className="sticky bottom-16 sm:static z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-indigo-200 dark:border-indigo-800 shadow-lg sm:shadow-none flex items-center justify-between sm:justify-start gap-2.5 pt-3 sm:border-t sm:border-indigo-100 sm:dark:border-indigo-900/50 mt-4">
                            <button
                              type="button"
                              onClick={handleEditSave}
                              disabled={saving}
                              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-97 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <CheckIcon className="h-4 w-4" />
                              <span>
                                {saving
                                  ? t("smartReplies.saving") || "جاري الحفظ..."
                                  : t("smartReplies.saveChanges") || "حفظ التعديلات"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleEditCancel}
                              disabled={saving}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-97 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                            >
                              <XMarkIcon className="h-4 w-4" />
                              <span>{t("smartReplies.cancel") || "إلغاء"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // View Mode
                    return (
                      <div
                        key={template.id}
                        className="p-3.5 sm:p-5 hover:bg-gray-50/60 dark:hover:bg-gray-750/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                          {/* Main Info */}
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                                  {template.name || "قالب رد تلقائي"}
                                </h3>
                                <SmartReplyChannelBadges channels={template.channels} />
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                                  {template.keywords.length} كلمات
                                </span>
                                {template.responses.length > 1 && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                                    {template.responses.length} بدائل
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons on Mobile - Positioned neatly inline */}
                              <div className="flex sm:hidden items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditStart(template)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 active:scale-95 border border-indigo-200 dark:border-indigo-800/80 rounded-lg transition-colors cursor-pointer"
                                  title="تعديل القالب"
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                  <span>تعديل</span>
                                </button>
                                {!template.isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(template.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 active:scale-95 border border-red-200 dark:border-red-800/70 rounded-lg transition-colors cursor-pointer"
                                    title="حذف القالب"
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Keywords Chips */}
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold ml-1">
                                الكلمات الدالة:
                              </span>
                              {template.keywords.map((kw, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 rounded-md text-[11px] font-medium border border-gray-200/60 dark:border-gray-600/50"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>

                            {/* Multi-line formatted responses */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                نص الرد التلقائي:
                              </div>

                              {template.responses.map((resp, idx) => {
                                const lines = resp.split("\n");
                                const isLong = resp.length > 140 || lines.length > 3;
                                const isExpanded =
                                  !!expandedResponses[`${template.id}_${idx}`];

                                return (
                                  <div
                                    key={idx}
                                    className="relative p-3 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-right transition-all"
                                    dir="rtl"
                                  >
                                    {template.responses.length > 1 && (
                                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                        الرد البديل {idx + 1}:
                                      </div>
                                    )}

                                    <div
                                      className={`text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-wrap break-words dir-rtl text-right ${
                                        isLong && !isExpanded
                                          ? "line-clamp-3 max-h-20 overflow-hidden"
                                          : ""
                                      }`}
                                    >
                                      {resp}
                                    </div>

                                    {isLong && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpand(template.id, idx)}
                                        className="mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUpIcon className="w-3.5 h-3.5" />
                                            <span>عرض أقل</span>
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDownIcon className="w-3.5 h-3.5" />
                                            <span>
                                              عرض النص بالكامل ({lines.length} أسطر)
                                            </span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Desktop Actions */}
                          <div className="hidden sm:flex items-center gap-2 self-start shrink-0 pt-1">
                            <button
                              type="button"
                              onClick={() => handleEditStart(template)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                              title="تعديل القالب والردود والكلمات المفتاحية"
                            >
                              <PencilIcon className="h-4 w-4" />
                              <span>{t("smartReplies.edit") || "تعديل"}</span>
                            </button>

                            {!template.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDelete(template.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/70 rounded-xl transition-colors cursor-pointer active:scale-95"
                                title="حذف القالب"
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span>{t("smartReplies.delete") || "حذف"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* Global Save Button at Bottom - Only shown when not editing to prevent state conflict */}
        {!editingId && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-97 disabled:opacity-50 text-white rounded-xl text-sm sm:text-base font-bold transition-all shadow-xs cursor-pointer"
            >
              <CheckIcon className="h-5 w-5" />
              <span>
                {saving
                  ? t("smartReplies.saving") || "جاري الحفظ..."
                  : t("smartReplies.save") || "حفظ جميع الإعدادات"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartRepliesSettings;
