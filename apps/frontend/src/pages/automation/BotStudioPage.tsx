import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  EnvelopeIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  botAutomationService,
  type BotAutomationSettings,
  type BotAutomationRule,
  type BotRuleInput,
  type BotChannel,
  type BotMatchMode,
} from "../../services/botAutomationService";
import StartersTab from "./components/StartersTab";
import MenuTab from "./components/MenuTab";
import WidgetTab from "./components/WidgetTab";
import AudienceTab from "./components/AudienceTab";
import ButtonsEditor, { type BotButton } from "./components/ButtonsEditor";

const CHANNELS: BotChannel[] = ["WHATSAPP", "FACEBOOK"];
const MATCH_MODES: { value: BotMatchMode; label: string }[] = [
  { value: "CONTAINS", label: "botStudio.contains" },
  { value: "EXACT", label: "botStudio.exact" },
  { value: "REGEX", label: "botStudio.regex" },
];

const emptySettings: BotAutomationSettings = {
  welcomeEnabled: false,
  welcomeMessage: "",
  defaultReplyEnabled: false,
  defaultReply: "",
  channels: ["WHATSAPP", "FACEBOOK"],
  widgetEnabled: false,
  widgetColor: "#4f46e5",
};

function emptyRule(): BotAutomationRule {
  return {
    id: "",
    name: "",
    channels: ["WHATSAPP"],
    matchMode: "CONTAINS",
    keywords: [],
    replyType: "TEXT",
    replyText: "",
    mediaUrl: "",
    buttons: [],
    priority: 0,
    isEnabled: true,
    stopFurtherProcessing: true,
  };
}

function ChannelBadges({ channels }: { channels: BotChannel[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((c) => (
        <span
          key={c}
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            c === "WHATSAPP"
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
          }`}
        >
          {c === "WHATSAPP" ? t("botStudio.whatsapp") : t("botStudio.facebook")}
        </span>
      ))}
    </div>
  );
}

const BotStudioPage: React.FC = () => {
  const { t: translate } = useTranslation();
  const t = (key: string) => String(translate(key));

  const [activeTab, setActiveTab] = useState<"rules" | "starters" | "menu" | "widget" | "audience" | "settings">("rules");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<BotAutomationRule[]>([]);
  const [settings, setSettings] = useState<BotAutomationSettings>(emptySettings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BotAutomationRule | null>(null);
  const [newKeyword, setNewKeyword] = useState("");

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesData, settingsData] = await Promise.all([
        botAutomationService.listRules(),
        botAutomationService.getSettings(),
      ]);
      setRules(rulesData);
      setSettings(settingsData || emptySettings);
    } catch (error) {
      console.error("Error loading bot studio:", error);
      toast.error(t("botStudio.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      await botAutomationService.saveSettings(settings);
      toast.success(t("botStudio.saved"));
    } catch (error) {
      toast.error(t("botStudio.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingRule(emptyRule());
    setNewKeyword("");
    setDialogOpen(true);
  };

  const openEdit = (rule: BotAutomationRule) => {
    setEditingRule({ ...rule });
    setNewKeyword("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setNewKeyword("");
  };

  const validateRule = (rule: BotAutomationRule): string | null => {
    if (!rule.name.trim()) return t("botStudio.nameRequired");
    if (rule.channels.length === 0) return t("botStudio.channelRequired");
    if (rule.keywords.length === 0) return t("botStudio.keywordRequired");
    if (rule.replyType === "TEXT" && !rule.replyText.trim()) return t("botStudio.replyRequired");
    if (rule.replyType !== "TEXT" && !rule.mediaUrl.trim()) return t("botStudio.mediaUrlPlaceholder");
    return null;
  };

  const saveRule = async () => {
    if (!editingRule) return;
    const error = validateRule(editingRule);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      setSaving(true);
      const input: BotRuleInput = {
        name: editingRule.name,
        channels: editingRule.channels,
        matchMode: editingRule.matchMode,
        keywords: editingRule.keywords,
        replyType: editingRule.replyType,
        replyText: editingRule.replyText,
        mediaUrl: editingRule.mediaUrl,
        buttons: editingRule.buttons,
        priority: Number(editingRule.priority) || 0,
        isEnabled: editingRule.isEnabled,
        stopFurtherProcessing: editingRule.stopFurtherProcessing,
      };
      if (editingRule.id) {
        await botAutomationService.updateRule(editingRule.id, input);
      } else {
        await botAutomationService.createRule(input);
      }
      toast.success(t("botStudio.saved"));
      closeDialog();
      loadAll();
    } catch (error) {
      toast.error(t("botStudio.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: BotAutomationRule) => {
    if (!window.confirm(String(t("botStudio.deleteConfirm")))) return;
    try {
      await botAutomationService.deleteRule(rule.id);
      toast.success(t("botStudio.deleted"));
      loadAll();
    } catch (error) {
      toast.error(t("botStudio.saveFailed"));
    }
  };

  const toggleChannel = (channel: BotChannel) => {
    if (!editingRule) return;
    const has = editingRule.channels.includes(channel);
    setEditingRule({
      ...editingRule,
      channels: has
        ? editingRule.channels.filter((c) => c !== channel)
        : [...editingRule.channels, channel],
    });
  };

  const toggleSettingsChannel = (channel: BotChannel) => {
    const has = settings.channels.includes(channel);
    setSettings({
      ...settings,
      channels: has
        ? settings.channels.filter((c) => c !== channel)
        : [...settings.channels, channel],
    });
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || !editingRule) return;
    setEditingRule({
      ...editingRule,
      keywords: [...editingRule.keywords, newKeyword.trim()],
    });
    setNewKeyword("");
  };

  const removeKeyword = (index: number) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      keywords: editingRule.keywords.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
          {t("botStudio.pageTitle")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("botStudio.pageSubtitle")}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsRules")}
        </button>
        <button
          onClick={() => setActiveTab("starters")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "starters"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsStarters")}
        </button>
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "menu"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsMenu")}
        </button>
        <button
          onClick={() => setActiveTab("widget")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "widget"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsWidget")}
        </button>
        <button
          onClick={() => setActiveTab("audience")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "audience"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsAudience")}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {t("botStudio.tabsSettings")}
        </button>
      </div>

      {activeTab === "rules" ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("botStudio.rulesHint")}</p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                {t("botStudio.addRule")}
              </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {rules.length === 0 && (
                <div className="p-10 text-center">
                  <SparklesIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white">{t("botStudio.noRules")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t("botStudio.noRulesDesc")}</p>
                </div>
              )}
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{rule.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          rule.isEnabled
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {rule.isEnabled ? t("botStudio.active") : t("botStudio.inactive")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.keywords.slice(0, 6).map((kw, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                      {rule.keywords.length > 6 && (
                        <span className="px-2 py-0.5 text-gray-500 dark:text-gray-500 text-xs">
                          +{rule.keywords.length - 6}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                      {rule.replyType !== "TEXT" ? `[${rule.replyType}] ` : ""}
                      {rule.replyType === "TEXT" ? rule.replyText : rule.mediaUrl}
                    </p>
                    <div className="mt-2">
                      <ChannelBadges channels={rule.channels} />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(rule)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteRule(rule)} className="p-2 text-gray-500 hover:text-red-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "starters" ? (
        <StartersTab />
      ) : activeTab === "menu" ? (
        <MenuTab />
      ) : activeTab === "widget" ? (
        <WidgetTab />
      ) : activeTab === "audience" ? (
        <AudienceTab />
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <EnvelopeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t("botStudio.welcome")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("botStudio.welcomeDesc")}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.welcomeEnabled}
                  onChange={(e) => setSettings({ ...settings, welcomeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <textarea
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              rows={3}
              className="mt-4 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder={t("botStudio.welcomePlaceholder")}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                  <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t("botStudio.defaultReply")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("botStudio.defaultReplyDesc")}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.defaultReplyEnabled}
                  onChange={(e) => setSettings({ ...settings, defaultReplyEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <textarea
              value={settings.defaultReply}
              onChange={(e) => setSettings({ ...settings, defaultReply: e.target.value })}
              rows={3}
              className="mt-4 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder={t("botStudio.defaultReplyPlaceholder")}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("botStudio.settingsChannels")}</h3>
            <div className="flex gap-2 mt-3">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleSettingsChannel(c)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    settings.channels.includes(c)
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                      : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {c === "WHATSAPP" ? t("botStudio.whatsapp") : t("botStudio.facebook")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {saving ? t("botStudio.saving") : t("botStudio.settingsSave")}
            </button>
          </div>
        </div>
      )}

      {dialogOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRule.id ? t("botStudio.editRule") : t("botStudio.addRule")}
              </h2>
              <button onClick={closeDialog} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.ruleName")}</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("botStudio.ruleNamePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("botStudio.channels")}</label>
                <div className="flex gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleChannel(c)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        editingRule.channels.includes(c)
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {c === "WHATSAPP" ? t("botStudio.whatsapp") : t("botStudio.facebook")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.matchMode")}</label>
                <select
                  value={editingRule.matchMode}
                  onChange={(e) => setEditingRule({ ...editingRule, matchMode: e.target.value as BotMatchMode })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {MATCH_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {t(m.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("botStudio.keywords")}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingRule.keywords.map((kw, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                      {kw}
                      <button onClick={() => removeKeyword(idx)} className="hover:text-red-500">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder={t("botStudio.keywordPlaceholder")}
                  />
                  <button onClick={addKeyword} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                    <PlusIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.replyType")}</label>
                <select
                  value={editingRule.replyType}
                  onChange={(e) => setEditingRule({ ...editingRule, replyType: e.target.value as BotAutomationRule["replyType"] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TEXT">{t("botStudio.textReply")}</option>
                  <option value="IMAGE">{t("botStudio.mediaReply")}</option>
                  <option value="VIDEO">{t("botStudio.mediaReply")}</option>
                </select>
              </div>

              {editingRule.replyType === "TEXT" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.reply")}</label>
                  <textarea
                    value={editingRule.replyText}
                    onChange={(e) => setEditingRule({ ...editingRule, replyText: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("botStudio.replyPlaceholder")}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.mediaUrlPlaceholder")}</label>
                  <input
                    type="text"
                    value={editingRule.mediaUrl}
                    onChange={(e) => setEditingRule({ ...editingRule, mediaUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("botStudio.mediaUrlPlaceholder")}
                  />
                </div>
              )}

              {editingRule.replyType === "TEXT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("botStudio.buttons")}</label>
                  <ButtonsEditor
                    buttons={editingRule.buttons}
                    onChange={(buttons: BotButton[]) => setEditingRule({ ...editingRule, buttons })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("botStudio.buttonsHint")}</p>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.priority")}</label>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: Number(e.target.value) })}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("botStudio.priorityHelper")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t("botStudio.enabled")}</label>
                  <input
                    type="checkbox"
                    checked={editingRule.isEnabled}
                    onChange={(e) => setEditingRule({ ...editingRule, isEnabled: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={closeDialog}
                className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                <XMarkIcon className="h-4 w-4" /> {t("botStudio.cancel")}
              </button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm"
              >
                <CheckIcon className="h-4 w-4" /> {saving ? t("botStudio.saving") : t("botStudio.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotStudioPage;
