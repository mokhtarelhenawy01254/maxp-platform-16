import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Boxes, FileText, Hash, Loader2, MessageSquare, Pencil, Plus, RefreshCw, Shield, Tag, Trash2, X as XMarkIcon } from "lucide-react";
import { api, fetchJson, RadiologyReportTemplate, RadiologyPatientFlag, setRadiologyRiskFlags, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface TemplateForm {
  id?: string;
  name: string;
  body: string;
}

interface TagForm {
  id?: string;
  name: string;
}

interface ExamTag {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Modality {
  category: string;
  count: number;
}

interface IdSettings {
  bookingPrefix: string;
  patientPrefix: string;
  digits: number;
  enabled: boolean;
}

const emptyForm = (): TemplateForm => ({ name: "", body: "" });
const emptyTagForm = (): TagForm => ({ name: "" });

const DEFAULT_ID_SETTINGS: IdSettings = { bookingPrefix: "B", patientPrefix: "P", digits: 4, enabled: true };

interface GuardSettings {
  requirePaymentBeforeDelivery: boolean;
  blockCancelAfterDelivery: boolean;
}

const DEFAULT_GUARDS: GuardSettings = { requirePaymentBeforeDelivery: false, blockCancelAfterDelivery: true };

interface FlagForm {
  index?: number;
  value: string;
  label: string;
  color: string;
}

const FLAG_COLOR_OPTIONS: { name: string; value: string }[] = [
  { name: "radiology.settings.colorRed", value: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { name: "radiology.settings.colorOrange", value: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  { name: "radiology.settings.colorAmber", value: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { name: "radiology.settings.colorPink", value: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  { name: "radiology.settings.colorPurple", value: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { name: "radiology.settings.colorBlue", value: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { name: "radiology.settings.colorGreen", value: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { name: "radiology.settings.colorGray", value: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
];

export default function SettingsTab() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<RadiologyReportTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<TemplateForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [tags, setTags] = useState<ExamTag[] | null>(null);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagModal, setTagModal] = useState<TagForm | null>(null);
  const [savingTag, setSavingTag] = useState(false);

  const [modalities, setModalities] = useState<Modality[] | null>(null);
  const [modalitiesLoading, setModalitiesLoading] = useState(true);

  const [idSettings, setIdSettings] = useState<IdSettings>(DEFAULT_ID_SETTINGS);
  const [idSettingsLoaded, setIdSettingsLoaded] = useState(false);
  const [savingIdSettings, setSavingIdSettings] = useState(false);

  const [guards, setGuards] = useState<GuardSettings>(DEFAULT_GUARDS);
  const [guardsLoaded, setGuardsLoaded] = useState(false);
  const [savingGuards, setSavingGuards] = useState(false);

  const [riskFlags, setRiskFlags] = useState<RadiologyPatientFlag[]>([]);
  const [riskFlagsLoaded, setRiskFlagsLoaded] = useState(false);
  const [savingRiskFlags, setSavingRiskFlags] = useState(false);
  const [flagModal, setFlagModal] = useState<FlagForm | null>(null);

  const refreshRiskFlags = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<RadiologyPatientFlag[]>(api("risk-flags"));
      setRiskFlags(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length) setRadiologyRiskFlags(data);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.settings.loadRiskFlagsFailed"));
    } finally {
      setRiskFlagsLoaded(true);
    }
  }, [t]);

  const saveRiskFlags = async () => {
    if (savingRiskFlags) return;
    setSavingRiskFlags(true);
    try {
      const data = await fetchJson<RadiologyPatientFlag[]>(api("risk-flags"), {
        method: "PUT",
        body: JSON.stringify({ flags: riskFlags }),
      });
      const saved = Array.isArray(data) ? data : riskFlags;
      setRiskFlags(saved);
      setRadiologyRiskFlags(saved);
      toast.success(t("radiology.settings.riskFlagsSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSavingRiskFlags(false);
    }
  };

  const saveFlag = () => {
    if (!flagModal) return;
    const value = flagModal.value.trim();
    const label = flagModal.label.trim();
    if (!value) { toast.error(t("radiology.settings.riskFlagsValueRequired")); return; }
    if (!label) { toast.error(t("radiology.settings.riskFlagsLabelRequired")); return; }
    if (riskFlags.some((f, i) => f.value === value && i !== flagModal.index)) { toast.error(t("radiology.settings.riskFlagsValueTaken")); return; }
    const entry: RadiologyPatientFlag = { value, label, color: flagModal.color };
    setRiskFlags(fs => (flagModal.index !== undefined ? fs.map((f, i) => (i === flagModal.index ? entry : f)) : [...fs, entry]));
    setFlagModal(null);
  };

  const removeFlag = (f: RadiologyPatientFlag) => {
    if (!window.confirm(t("radiology.settings.riskFlagsDeleteConfirm", { name: f.label }))) return;
    setRiskFlags(fs => fs.filter(x => x !== f));
  };

  const refreshGuards = useCallback(async () => {
    try {
      const data = await fetchJson<Partial<GuardSettings>>(api("guards"));
      setGuards({ ...DEFAULT_GUARDS, ...data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.loadIdSettingsFailed"));
    } finally {
      setGuardsLoaded(true);
    }
  }, [t]);

  const saveGuards = async () => {
    if (savingGuards) return;
    setSavingGuards(true);
    try {
      await fetchJson(api("guards"), {
        method: "PUT",
        body: JSON.stringify({
          requirePaymentBeforeDelivery: guards.requirePaymentBeforeDelivery,
          blockCancelAfterDelivery: guards.blockCancelAfterDelivery,
        }),
      });
      toast.success(t("radiology.settings.guardsSaved"));
      await refreshGuards();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSavingGuards(false);
    }
  };

  const [delivery, setDelivery] = useState({ deliverSmsPatient: true, notifyReferringDoctor: true });
  const [deliveryLoaded, setDeliveryLoaded] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const refreshDelivery = useCallback(async () => {
    try {
      const data = await fetchJson<{ deliverSmsPatient?: boolean; notifyReferringDoctor?: boolean }>(api("delivery-settings"));
      setDelivery({ deliverSmsPatient: data.deliverSmsPatient !== false, notifyReferringDoctor: data.notifyReferringDoctor !== false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.loadIdSettingsFailed"));
    } finally {
      setDeliveryLoaded(true);
    }
  }, [t]);

  const saveDelivery = async () => {
    if (savingDelivery) return;
    setSavingDelivery(true);
    try {
      await fetchJson(api("delivery-settings"), {
        method: "PUT",
        body: JSON.stringify({
          deliverSmsPatient: delivery.deliverSmsPatient,
          notifyReferringDoctor: delivery.notifyReferringDoctor,
        }),
      });
      toast.success(t("radiology.settings.deliverySaved"));
      await refreshDelivery();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSavingDelivery(false);
    }
  };

  const refreshIdSettings = useCallback(async () => {
    try {
      const data = await fetchJson<Partial<IdSettings>>(api("id-settings"));
      setIdSettings({ ...DEFAULT_ID_SETTINGS, ...data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.loadIdSettingsFailed"));
    } finally {
      setIdSettingsLoaded(true);
    }
  }, [t]);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<RadiologyReportTemplate[]>(api("report-templates"));
      setTemplates(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.settings.loadTemplatesFailed"));
    }
  }, []);

  const refreshTags = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<ExamTag[]>(api("exam-tags"));
      setTags(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.settings.loadTagsFailed"));
    }
  }, []);

  const refreshModalities = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<Modality[]>(api("modalities"));
      setModalities(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.settings.loadModalitiesFailed"));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    setTagsLoading(true);
    refreshTags().finally(() => setTagsLoading(false));
    setModalitiesLoading(true);
    refreshModalities().finally(() => setModalitiesLoading(false));
    refreshIdSettings();
    refreshGuards();
    refreshRiskFlags({ silent: true });
    refreshDelivery();
  }, [refresh, refreshTags, refreshModalities, refreshIdSettings, refreshGuards, refreshRiskFlags, refreshDelivery]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error(t("radiology.settings.templateNameRequired")); return; }
    if (!modal.body.trim()) { toast.error(t("radiology.settings.templateBodyRequired")); return; }
    setSaving(true);
    try {
      const payload = { name: modal.name.trim(), body: modal.body.trim() };
      if (modal.id) {
        await fetchJson(api(`report-templates/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("report-templates"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(modal.id ? t("radiology.settings.templateUpdated") : t("radiology.settings.templateCreated"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tmpl: RadiologyReportTemplate) => {
    if (!window.confirm(t("radiology.settings.deleteTemplateConfirm", { name: tmpl.name }))) return;
    try {
      await fetchJson(api(`report-templates/${tmpl.id}`), { method: "DELETE" });
      toast.success(t("radiology.settings.templateDeleted"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.deleteFailed"));
    }
  };

  const saveTag = async () => {
    if (!tagModal || savingTag) return;
    if (!tagModal.name.trim()) { toast.error(t("radiology.settings.tagNameRequired")); return; }
    setSavingTag(true);
    try {
      const payload = { name: tagModal.name.trim() };
      if (tagModal.id) {
        await fetchJson(api(`exam-tags/${tagModal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("exam-tags"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(tagModal.id ? t("radiology.settings.tagUpdated") : t("radiology.settings.tagCreated"));
      setTagModal(null);
      await refreshTags({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSavingTag(false);
    }
  };

  const removeTag = async (tag: ExamTag) => {
    if (!window.confirm(t("radiology.settings.deleteTagConfirm", { name: tag.name }))) return;
    try {
      await fetchJson(api(`exam-tags/${tag.id}`), { method: "DELETE" });
      toast.success(t("radiology.settings.tagDeleted"));
      await refreshTags({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.deleteFailed"));
    }
  };

  const saveIdSettings = async () => {
    if (savingIdSettings) return;
    setSavingIdSettings(true);
    try {
      await fetchJson(api("id-settings"), {
        method: "PUT",
        body: JSON.stringify({
          bookingPrefix: idSettings.bookingPrefix,
          patientPrefix: idSettings.patientPrefix,
          digits: Number(idSettings.digits) || 4,
          enabled: idSettings.enabled,
        }),
      });
      toast.success(t("radiology.settings.idSettingsSaved"));
      await refreshIdSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.settings.saveFailed"));
    } finally {
      setSavingIdSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.settings.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={() => setModal(emptyForm())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.settings.newTemplate")}
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Hash className="w-5 h-5" />{t("radiology.settings.idSettingsTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.idSettingsSubtitle")}</p>
          </div>
          <button onClick={() => refreshIdSettings()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          {!idSettingsLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.bookingPrefix")}</label>
                  <input className={MODAL_INPUT_CLS} value={idSettings.bookingPrefix} onChange={e => setIdSettings(s => ({ ...s, bookingPrefix: e.target.value }))} placeholder="B" maxLength={10} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.patientPrefix")}</label>
                  <input className={MODAL_INPUT_CLS} value={idSettings.patientPrefix} onChange={e => setIdSettings(s => ({ ...s, patientPrefix: e.target.value }))} placeholder="P" maxLength={10} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.idDigits")}</label>
                  <input className={MODAL_INPUT_CLS} type="number" min={1} max={10} value={idSettings.digits} onChange={e => setIdSettings(s => ({ ...s, digits: Number(e.target.value) || 4 }))} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={idSettings.enabled} onChange={e => setIdSettings(s => ({ ...s, enabled: e.target.checked }))} className="w-4 h-4" />
                  {t("radiology.settings.idEnabled")}
                </label>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("radiology.settings.preview")}:{" "}
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-200" dir="ltr">
                    {idSettings.enabled ? `${idSettings.bookingPrefix}-${String(1).padStart(idSettings.digits, "0")}` : "1"} /{" "}
                    {idSettings.enabled ? `${idSettings.patientPrefix}-${String(1).padStart(idSettings.digits, "0")}` : "1"}
                  </span>
                </div>
                <button onClick={saveIdSettings} disabled={savingIdSettings} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {savingIdSettings && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5" />{t("radiology.settings.guardsTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.guardsSubtitle")}</p>
          </div>
          <button onClick={() => refreshGuards()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          {!guardsLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={guards.requirePaymentBeforeDelivery} onChange={e => setGuards(g => ({ ...g, requirePaymentBeforeDelivery: e.target.checked }))} className="w-4 h-4" />
                {t("radiology.settings.requirePaymentBeforeDelivery")}
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={guards.blockCancelAfterDelivery} onChange={e => setGuards(g => ({ ...g, blockCancelAfterDelivery: e.target.checked }))} className="w-4 h-4" />
                {t("radiology.settings.blockCancelAfterDelivery")}
              </label>
              <button onClick={saveGuards} disabled={savingGuards} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {savingGuards && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" />{t("radiology.settings.riskFlagsTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.riskFlagsSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshRiskFlags()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
            </button>
            <button onClick={() => setFlagModal({ value: `flag_${riskFlags.length + 1}`, label: "", color: FLAG_COLOR_OPTIONS[0].value })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" />{t("radiology.settings.newRiskFlag")}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          {!riskFlagsLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : riskFlags.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">{t("radiology.settings.noRiskFlags")}</div>
          ) : (
            <div className="space-y-3">
              {riskFlags.map((f, i) => (
                <div key={`${f.value}-${i}`} className="flex items-center justify-between gap-3 border dark:border-gray-700 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${f.color}`}>{f.label}</span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate" dir="ltr">{f.value}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setFlagModal({ index: i, value: f.value, label: f.label, color: f.color })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => removeFlag(f)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button onClick={saveRiskFlags} disabled={savingRiskFlags} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {savingRiskFlags && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5" />{t("radiology.settings.deliveryTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.deliverySubtitle")}</p>
          </div>
          <button onClick={() => refreshDelivery()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          {!deliveryLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={delivery.deliverSmsPatient} onChange={e => setDelivery(d => ({ ...d, deliverSmsPatient: e.target.checked }))} className="w-4 h-4" />
                {t("radiology.settings.deliverSmsPatient")}
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={delivery.notifyReferringDoctor} onChange={e => setDelivery(d => ({ ...d, notifyReferringDoctor: e.target.checked }))} className="w-4 h-4" />
                {t("radiology.settings.notifyReferringDoctor")}
              </label>
              <button onClick={saveDelivery} disabled={savingDelivery} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {savingDelivery && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && !templates ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : templates === null || templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          {t("radiology.settings.noTemplates")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{tmpl.name}</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setModal({ id: tmpl.id, name: tmpl.name, body: tmpl.body })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(tmpl)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-4">{tmpl.body}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Tag className="w-5 h-5" />{t("radiology.settings.examTags")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.tagsSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshTags()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
            </button>
            <button onClick={() => setTagModal(emptyTagForm())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" />{t("radiology.settings.newTag")}
            </button>
          </div>
        </div>

        {tagsLoading && !tags ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : tags === null || tags.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
            <Tag className="w-10 h-10 mx-auto mb-3" />
            {t("radiology.settings.noTags")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tags.map(tag => (
              <div key={tag.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold">{tag.name}</h3>
                    {!tag.isActive && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full">{t("radiology.settings.inactive")}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setTagModal({ id: tag.id, name: tag.name })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => removeTag(tag)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Boxes className="w-5 h-5" />{t("radiology.settings.modalities")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.modalitiesSubtitle")}</p>
          </div>
          <button onClick={() => refreshModalities()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>

        {modalitiesLoading && !modalities ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : modalities === null || modalities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
            <Boxes className="w-10 h-10 mx-auto mb-3" />
            {t("radiology.settings.noModalities")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {modalities.map(m => (
              <div key={m.category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <h3 className="font-bold mb-1">{m.category}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.settings.examTypeCount", { count: m.count })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-w-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.settings.editTemplate") : t("radiology.settings.newReportTemplate")}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.templateName")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder={t("radiology.settings.namePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.templateBody")}</label>
                <textarea className={`${MODAL_INPUT_CLS} min-h-[200px] resize-y`} value={modal.body} onChange={e => setModal({ ...modal, body: e.target.value })} placeholder={t("radiology.settings.bodyPlaceholder")} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {tagModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setTagModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{tagModal.id ? t("radiology.settings.editTag") : t("radiology.settings.newTagModal")}</h3>
              <button onClick={() => setTagModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.tagName")}</label>
              <input className={MODAL_INPUT_CLS} value={tagModal.name} onChange={e => setTagModal({ ...tagModal, name: e.target.value })} placeholder={t("radiology.settings.tagPlaceholder")} onKeyDown={e => { if (e.key === "Enter") saveTag(); }} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setTagModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button onClick={saveTag} disabled={savingTag} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {savingTag && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {flagModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setFlagModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{flagModal.index !== undefined ? t("radiology.settings.editRiskFlag") : t("radiology.settings.newRiskFlag")}</h3>
              <button onClick={() => setFlagModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.riskFlagsValue")}</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={flagModal.value} onChange={e => setFlagModal({ ...flagModal, value: e.target.value })} placeholder="pregnancy" onKeyDown={e => { if (e.key === "Enter") saveFlag(); }} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("radiology.settings.riskFlagsValueHint")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.riskFlagsLabel")}</label>
                <input className={MODAL_INPUT_CLS} value={flagModal.label} onChange={e => setFlagModal({ ...flagModal, label: e.target.value })} placeholder={t("radiology.settings.riskFlagsLabelPlaceholder")} onKeyDown={e => { if (e.key === "Enter") saveFlag(); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.settings.riskFlagsColor")}</label>
                <div className="flex flex-wrap gap-2">
                  {FLAG_COLOR_OPTIONS.map(c => (
                    <button key={c.name} type="button" onClick={() => setFlagModal({ ...flagModal, color: c.value })} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${flagModal.color === c.value ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600"} ${c.value}`}>
                      {t(c.name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setFlagModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button onClick={saveFlag} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("radiology.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
