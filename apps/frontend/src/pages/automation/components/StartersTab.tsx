import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  LinkIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  botAutomationService,
  type BotConversationStarter,
  type BotStarterLink,
  type BotChannel,
} from "../../../services/botAutomationService";

const CHANNELS: BotChannel[] = ["WHATSAPP", "FACEBOOK"];

function emptyStarter(): BotConversationStarter {
  return {
    id: "",
    name: "",
    channels: ["WHATSAPP", "FACEBOOK"],
    message: "",
    refCode: "",
    isEnabled: true,
    sortOrder: 0,
  };
}

const StartersTab: React.FC = () => {
  const { t: translate } = useTranslation();
  const t = (key: string) => String(translate(key));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starters, setStarters] = useState<BotConversationStarter[]>([]);
  const [links, setLinks] = useState<BotStarterLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BotConversationStarter | null>(null);
  const [qrLink, setQrLink] = useState<{ url: string; channel: string } | null>(null);
  const qrWrapRef = React.useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, l] = await Promise.all([
        botAutomationService.listStarters(),
        botAutomationService.buildStarterLinks(),
      ]);
      setStarters(s);
      setLinks(l);
    } catch (e) {
      toast.error(String(t("botStudio.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(emptyStarter());
    setDialogOpen(true);
  };

  const openEdit = (s: BotConversationStarter) => {
    setEditing({ ...s });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const toggleChannel = (ch: BotChannel) => {
    if (!editing) return;
    const has = editing.channels.includes(ch);
    setEditing({
      ...editing,
      channels: has ? editing.channels.filter((c) => c !== ch) : [...editing.channels, ch],
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error(String(t("botStudio.nameRequired")));
      return;
    }
    if (editing.channels.length === 0) {
      toast.error(String(t("botStudio.channelRequired")));
      return;
    }
    try {
      setSaving(true);
      const input = {
        name: editing.name,
        channels: editing.channels,
        message: editing.message,
        refCode: editing.refCode,
        isEnabled: editing.isEnabled,
        sortOrder: Number(editing.sortOrder) || 0,
      };
      if (editing.id) {
        await botAutomationService.updateStarter(editing.id, input);
      } else {
        await botAutomationService.createStarter(input);
      }
      toast.success(String(t("botStudio.saved")));
      closeDialog();
      load();
    } catch (e) {
      toast.error(String(t("botStudio.saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: BotConversationStarter) => {
    if (!window.confirm(String(t("botStudio.deleteConfirm")))) return;
    try {
      await botAutomationService.deleteStarter(s.id);
      toast.success(String(t("botStudio.deleted")));
      load();
    } catch (e) {
      toast.error(String(t("botStudio.saveFailed")));
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard?.writeText(url).then(
      () => toast.success(String(t("botStudio.linkCopied"))),
      () => toast.error(String(t("botStudio.saveFailed")))
    );
  };

  const downloadQr = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${qrLink?.channel || "bot"}-qr.png`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("botStudio.startersHint")}</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            {t("botStudio.addStarter")}
          </button>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {starters.length === 0 && (
            <div className="p-10 text-center">
              <LinkIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-white">{t("botStudio.noStarters")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t("botStudio.noStartersDesc")}</p>
            </div>
          )}
          {starters.map((s) => {
            const starterLinks = links.filter((l) => l.starterId === s.id);
            return (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">{s.name}</h3>
                    {s.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{s.message}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.channels.map((c) => (
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
                    {starterLinks.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {starterLinks.flatMap((l) =>
                          l.channels.map((ch) => (
                            <div key={`${l.starterId}-${ch.channel}`} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-16">
                                {ch.channel === "WHATSAPP" ? "WhatsApp" : "Messenger"}
                              </span>
                              <code className="flex-1 truncate text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {ch.url}
                              </code>
                              <button
                                onClick={() => copyLink(ch.url)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs shrink-0"
                              >
                                {t("botStudio.copy")}
                              </button>
                              <button
                                onClick={() => setQrLink({ url: ch.url, channel: ch.channel })}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs shrink-0"
                              >
                                QR
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(s)} className="p-2 text-gray-500 hover:text-red-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dialogOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing.id ? t("botStudio.editStarter") : t("botStudio.addStarter")}
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
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
                        editing.channels.includes(c)
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.starterMessage")}</label>
                <textarea
                  value={editing.message}
                  onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("botStudio.starterMessagePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("botStudio.refCode")}</label>
                <input
                  type="text"
                  value={editing.refCode}
                  onChange={(e) => setEditing({ ...editing, refCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("botStudio.refCodePlaceholder")}
                />
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
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm"
              >
                <CheckIcon className="h-4 w-4" /> {saving ? t("botStudio.saving") : t("botStudio.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                {qrLink.channel === "WHATSAPP" ? "WhatsApp" : "Messenger"}
              </h2>
              <button onClick={() => setQrLink(null)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div ref={qrWrapRef} className="bg-white p-3 rounded-xl">
                <QRCodeCanvas value={qrLink.url} size={180} includeMargin />
              </div>
              <code className="w-full text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-center break-all">
                {qrLink.url}
              </code>
              <button
                onClick={downloadQr}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
              >
                <QrCodeIcon className="h-4 w-4" /> {t("botStudio.qrDownload")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartersTab;
