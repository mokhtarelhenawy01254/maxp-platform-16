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

interface AutoReplyTemplate {
  id: string;
  name: string;
  type: "greeting" | "thanks" | "confirmation" | "farewell" | "custom";
  keywords: string[];
  responses: string[];
  isDefault?: boolean;
}

interface Settings {
  enabled: boolean;
  templates: AutoReplyTemplate[];
}

const defaultTemplates: AutoReplyTemplate[] = [];

const SmartRepliesSettings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
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
    enabledState: boolean = settings.enabled
  ) => {
    try {
      setSaving(true);
      await apiClient.put("/smart-replies/rule-responses", {
        enableRuleResponses: enabledState,
        customRuleResponses: {
          templates: newTemplates,
        },
      });
      return true;
    } catch (error: any) {
      console.error("Error saving smart replies:", error);
      const msg = error?.response?.data?.error || t("smartReplies.saveFailed") || "فشل الحفظ";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const success = await persistSettings(settings.templates, settings.enabled);
    if (success) {
      toast.success(t("smartReplies.ruleSaved") || "تم الحفظ بنجاح");
    }
  };

  const handleToggleEnable = async () => {
    const nextEnabled = !settings.enabled;
    setSettings((prev) => ({ ...prev, enabled: nextEnabled }));
    const success = await persistSettings(settings.templates, nextEnabled);
    if (success) {
      toast.success(
        nextEnabled
          ? "تم تفعيل الردود التلقائية بنجاح"
          : "تم إيقاف الردود التلقائية"
      );
    }
  };

  const handleEditStart = (template: AutoReplyTemplate) => {
    setEditingId(template.id);
    setEditingTemplate({
      ...template,
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
    let keywordsPool = [...editingTemplate.keywords];
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

    const updatedTemplate: AutoReplyTemplate = {
      ...editingTemplate,
      name: trimmedName,
      keywords: cleanKeywords,
      responses: cleanResponses,
    };

    const isNew = !settings.templates.some((t) => t.id === editingId);
    const updatedTemplates = isNew
      ? [...settings.templates, updatedTemplate]
      : settings.templates.map((t) =>
          t.id === editingId ? updatedTemplate : t
        );

    setSettings((prev) => ({
      ...prev,
      templates: updatedTemplates,
    }));
    setEditingId(null);
    setEditingTemplate(null);

    const success = await persistSettings(updatedTemplates);
    if (success) {
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

  const handleAddTemplate = () => {
    const newTemplate: AutoReplyTemplate = {
      id: `custom_${Date.now()}`,
      name: "",
      type: "custom",
      keywords: [],
      responses: [""],
    };
    handleEditStart(newTemplate);
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/settings")}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 ml-2 rtl:rotate-180" />
          <span>{t("smartReplies.back") || "رجوع"}</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ChatBubbleLeftRightIcon className="h-7 w-7" />
              </span>
              <span>{t("smartReplies.pageTitle") || "الردود التلقائية الذكية"}</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t("smartReplies.pageSubtitle") ||
                "إدارة وتعديل قوالب الردود التلقائية ورسائل خدمة العملاء الموجهة للعملاء"}
            </p>
          </div>

          <button
            onClick={handleAddTemplate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusIcon className="h-5 w-5" />
            <span>{t("smartReplies.addRule") || "إضافة قالب جديد"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Toggle Card */}
        <div
          className={`rounded-2xl shadow-sm border-2 p-5 sm:p-6 transition-all duration-200 ${
            settings.enabled
              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/60 shadow-emerald-500/5"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl transition-colors ${
                  settings.enabled
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                }`}
              >
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {t("smartReplies.enableTitle") || "الردود التلقائية"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {settings.enabled
                    ? t("smartReplies.enableDesc") ||
                      "القوالب مفعلة وتعمل تلقائياً عند مطابقة الكلمات المفتاحية"
                    : t("smartReplies.disabledDesc") ||
                      "الردود التلقائية متوقفة حالياً"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                  settings.enabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    settings.enabled
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-gray-400 dark:bg-gray-500"
                  }`}
                />
                {settings.enabled
                  ? t("smartReplies.active") || "نشط"
                  : t("smartReplies.inactive") || "غير نشط"}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={handleToggleEnable}
                dir="ltr"
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  settings.enabled
                    ? "bg-emerald-600 dark:bg-emerald-500 shadow-sm"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span className="sr-only">
                  {t("smartReplies.enableTitle") || "الردود التلقائية"}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    settings.enabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("smartReplies.templates") || "قوالب الردود"}
              </h2>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                {settings.templates.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {settings.templates.length === 0 && !editingId ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-400 mb-3 opacity-60" />
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-base">
                  {t("smartReplies.noRules") || "لا توجد قوالب ردود بعد"}
                </p>
                <p className="text-sm mt-1 max-w-md mx-auto">
                  {t("smartReplies.noRulesDesc") ||
                    "أضف قوالب الردود التلقائية لتسهيل وسرعة الرد على العملاء فور إرسالهم للرسائل"}
                </p>
                <button
                  onClick={handleAddTemplate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>{t("smartReplies.addRule") || "إضافة قالب جديد"}</span>
                </button>
              </div>
            ) : (
              settings.templates.map((template) => {
                const isEditing = editingId === template.id;

                if (isEditing && editingTemplate) {
                  // Edit Mode
                  return (
                    <div
                      key={template.id}
                      className="p-5 sm:p-6 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-5 border-y-2 border-indigo-500/40"
                    >
                      {/* Edit Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <PencilIcon className="h-5 w-5" />
                          </span>
                          <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            {t("smartReplies.editTemplate") || "تعديل القالب"}
                          </h3>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          جاري التعديل الآن
                        </span>
                      </div>

                      {/* Name Input */}
                      <div>
                        <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
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
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          placeholder="مثال: رسالة الترحيب، أسعار الشحن، الاستفسار عن المقاسات"
                        />
                      </div>

                      {/* Keywords */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                            {t("smartReplies.keywords") || "الكلمات المفتاحية الدالة"}
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {editingTemplate.keywords.length} كلمة دالة
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {t("smartReplies.keywordHelper") ||
                            "اكتب الكلمة المفتاحية واضغط Enter (يمكنك كتابة عدة كلمات مفصولة بفاصلة)"}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-2.5 min-h-[36px] p-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                          {editingTemplate.keywords.length === 0 ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                              لم يتم إضافة كلمات دالة بعد
                            </span>
                          ) : (
                            editingTemplate.keywords.map((kw, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs font-semibold"
                              >
                                {kw}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKeyword(idx)}
                                  className="hover:text-red-500 p-0.5 rounded-full hover:bg-white/40 dark:hover:bg-black/20 transition-colors"
                                  title="إزالة الكلمة"
                                >
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
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
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder={
                              t("smartReplies.keywordPlaceholder") ||
                              "مثال: السلام عليكم، مساء الخير، الشحن، السعر"
                            }
                          />
                          <button
                            type="button"
                            onClick={handleAddKeyword}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>إضافة</span>
                          </button>
                        </div>
                      </div>

                      {/* Responses (Multi-line textareas) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                            {t("smartReplies.replyContent") || "نصوص الرد التلقائي"}
                          </label>
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            {t("smartReplies.templateHelper") ||
                              "يدعم الأسطر المتعددة والرسائل الطويلة المنسقة"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          💡 يمكنك الضغط على <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded font-mono text-[11px]">Enter</kbd> للنزول لسطر جديد وكتابة التفاصيل والنقاط تحت بعضها بشكل منسق ومرتب.
                        </p>

                        <div className="space-y-4">
                          {editingTemplate.responses.map((resp, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-white dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                  <span>
                                    {editingTemplate.responses.length > 1
                                      ? `الرد التلقائي رقم ${idx + 1}`
                                      : "نص الرد التلقائي"}
                                  </span>
                                </span>
                                <div className="flex items-center gap-3">
                                  <span>
                                    {resp.length} حرف • {resp.split("\n").length} سطر
                                  </span>
                                  {editingTemplate.responses.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveResponse(idx)}
                                      className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1 transition-colors"
                                      title="حذف هذا الرد البديل"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                      <span className="text-xs">حذف</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Multi-line Textarea */}
                              <textarea
                                rows={Math.min(10, Math.max(3, resp.split("\n").length + 1))}
                                value={resp}
                                onChange={(e) =>
                                  handleResponseChange(idx, e.target.value)
                                }
                                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed whitespace-pre-wrap dir-rtl text-right resize-y transition-all"
                                placeholder={
                                  t("smartReplies.templatePlaceholder") ||
                                  "اكتب نص الرد التلقائي هنا... استخدم Enter لكتابة أسطر مرتبة تحت بعضها"
                                }
                                dir="rtl"
                              />

                              {/* Live Formatted Preview */}
                              {resp.trim().length > 0 && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-right">
                                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 mb-2">
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    <span>
                                      {t("smartReplies.preview") ||
                                        "معاينة شكل الرد للعميل:"}
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words leading-relaxed font-sans bg-white dark:bg-gray-800 p-3 rounded-lg border border-slate-200/70 dark:border-slate-700 shadow-xs">
                                    {resp}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAddResponse}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1.5 p-1"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>
                              {t("smartReplies.addAlternativeResponse") ||
                                "+ إضافة رد بديل آخر (يتم التبديل عشوائياً بينها)"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/50">
                        <button
                          type="button"
                          onClick={handleEditSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
                    className="p-5 sm:p-6 hover:bg-gray-50/60 dark:hover:bg-gray-750/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left / Main Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            {template.name || "قالب رد تلقائي"}
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                            {template.keywords.length} كلمات دالة
                          </span>
                          {template.responses.length > 1 && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                              {template.responses.length} ردود بديلة
                            </span>
                          )}
                        </div>

                        {/* Keywords Chips */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold ml-1">
                            الكلمات الدالة:
                          </span>
                          {template.keywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-medium border border-gray-200/60 dark:border-gray-600/50"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>

                        {/* Multi-line formatted responses ("مظبوط وتحت بعضه") */}
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            نص الرد التلقائي:
                          </div>

                          {template.responses.map((resp, idx) => {
                            const lines = resp.split("\n");
                            const isLong = resp.length > 160 || lines.length > 3;
                            const isExpanded =
                              !!expandedResponses[`${template.id}_${idx}`];

                            return (
                              <div
                                key={idx}
                                className="relative p-4 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-right transition-all"
                                dir="rtl"
                              >
                                {template.responses.length > 1 && (
                                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                    الرد البديل {idx + 1}:
                                  </div>
                                )}

                                <div
                                  className={`text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-wrap break-words dir-rtl text-right ${
                                    isLong && !isExpanded
                                      ? "line-clamp-3 max-h-24 overflow-hidden"
                                      : ""
                                  }`}
                                >
                                  {resp}
                                </div>

                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(template.id, idx)}
                                    className="mt-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUpIcon className="w-3.5 h-3.5" />
                                        <span>
                                          {t("smartReplies.showLess") || "عرض أقل"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDownIcon className="w-3.5 h-3.5" />
                                        <span>
                                          {t("smartReplies.showMore") ||
                                            "عرض النص بالكامل"}{" "}
                                          ({lines.length} أسطر)
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

                      {/* Right / Actions: Clear, distinct Edit & Delete buttons */}
                      <div className="flex items-center gap-2 self-start flex-shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => handleEditStart(template)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition-colors shadow-xs cursor-pointer"
                          title="تعديل القالب والردود والكلمات المفتاحية"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>{t("smartReplies.edit") || "تعديل"}</span>
                        </button>

                        {!template.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDelete(template.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/70 rounded-xl transition-colors cursor-pointer"
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

        {/* Global Save Button at Bottom */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
          >
            <CheckIcon className="h-5 w-5" />
            <span>
              {saving
                ? t("smartReplies.saving") || "جاري الحفظ..."
                : t("smartReplies.save") || "حفظ جميع الإعدادات"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartRepliesSettings;
