import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Save, Trash2, X as XMarkIcon, CreditCard, Coins, BellRing, Building2, Workflow, MessageSquareText, FilePlus2, CheckCircle2 } from "lucide-react";
import {
  DentalCustomFieldDef, fetchSettings, saveSettings,
  fetchCustomFields, createCustomField, updateCustomField, deleteCustomField,
  WORK_TYPE_CATEGORIES, tKey, MODAL_INPUT_CLS, BillingPolicy, DentalInvoiceMode, DentalLabSettings,
} from "./shared";

type SettingsSectionId = "general" | "stages" | "whatsapp" | "fields" | "wages" | "dunning" | "billing";

const SETTINGS_SECTIONS: { id: SettingsSectionId; labelKey: string; icon: typeof Building2 }[] = [
  { id: "general", labelKey: "dentalLab.settings.sections.general", icon: Building2 },
  { id: "stages", labelKey: "dentalLab.settings.sections.stages", icon: Workflow },
  { id: "whatsapp", labelKey: "dentalLab.settings.sections.whatsapp", icon: MessageSquareText },
  { id: "fields", labelKey: "dentalLab.settings.sections.fields", icon: FilePlus2 },
  { id: "wages", labelKey: "dentalLab.settings.sections.wages", icon: Coins },
  { id: "dunning", labelKey: "dentalLab.settings.sections.dunning", icon: BellRing },
  { id: "billing", labelKey: "dentalLab.settings.sections.billing", icon: CreditCard },
];

const CATEGORY_LABEL = (t: (key: never) => unknown, cat: string) => {
  const key = `dentalLab.workTypes.categoryOptions.${cat}`;
  const val = tKey(t, key);
  return val && val !== key ? val : cat;
};

const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT"];

const INVOICE_MODES: { id: DentalInvoiceMode; labelKey: string; hintKey: string }[] = [
  { id: "AUTO_ON_RECEIPT", labelKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_RECEIPT", hintKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_RECEIPT_hint" },
  { id: "AUTO_ON_DELIVERY", labelKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_DELIVERY", hintKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_DELIVERY_hint" },
  { id: "MANUAL", labelKey: "dentalLab.settings.billingPolicy.modes.MANUAL", hintKey: "dentalLab.settings.billingPolicy.modes.MANUAL_hint" },
];

function ToggleRow({
  label, hint, checked, onChange, disabled,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function DentalLabSettingsTab() {
  const { t } = useTranslation();
  const { "*": path } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [labName, setLabName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [stageTemplates, setStageTemplates] = useState<Record<string, string[]>>({});
  const [readyTemplate, setReadyTemplate] = useState("");
  const [receivedTemplate, setReceivedTemplate] = useState("");
  const [overdueTemplate, setOverdueTemplate] = useState("");
  const [customFields, setCustomFields] = useState<DentalCustomFieldDef[]>([]);
  const [billingPolicy, setBillingPolicy] = useState<BillingPolicy>({
    invoiceMode: "AUTO_ON_DELIVERY",
    requireInvoiceBeforeDelivery: true,
    requireFullPaymentBeforeDelivery: false,
    enforceCreditLimit: false,
  });
  const [guards, setGuards] = useState<{ requireQualityCheckBeforeReady?: boolean }>({});
  const [wageDefault, setWageDefault] = useState<number>(0);
  const [dunningEnabled, setDunningEnabled] = useState(false);
  const [dunningAgingDays, setDunningAgingDays] = useState<number>(15);
  const [lastSaved, setLastSaved] = useState<Record<string, unknown>>({});

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [fieldBusyId, setFieldBusyId] = useState<string | null>(null);

  const urlSection = (path || "").split("/")[1] || "general";
  const activeSection = SETTINGS_SECTIONS.some(s => s.id === urlSection) ? (urlSection as SettingsSectionId) : "general";
  const setActiveSection = (id: SettingsSectionId) => navigate(`/dental-lab/settings/${id}`);

  const buildPayload = (id: SettingsSectionId): Partial<DentalLabSettings> | null => {
    switch (id) {
      case "general":
        return { workOrderHeader: { labName: labName.trim() || undefined, address: address.trim() || undefined, phone: phone.trim() || undefined } };
      case "stages": {
        const cleaned: Record<string, string[]> = {};
        Object.entries(stageTemplates).forEach(([cat, list]) => {
          const f = list.map(s => s.trim()).filter(Boolean);
          if (f.length > 0) cleaned[cat] = f;
        });
        return { stageTemplates: cleaned };
      }
      case "whatsapp":
        return { whatsappTemplates: { ready: readyTemplate.trim() || undefined, received: receivedTemplate.trim() || undefined, overdue: overdueTemplate.trim() || undefined } };
      case "wages":
        return { wages: { defaultPerStage: Number(wageDefault) || 0 } };
      case "dunning":
        return { notifications: { dunningEnabled, dunningAgingDays: Number(dunningAgingDays) || 15 } };
      case "billing":
        return { billingPolicy, guards };
      default:
        return null;
    }
  };

  const dirtyMap = SETTINGS_SECTIONS.reduce<Record<string, boolean>>((acc, s) => {
    const p = buildPayload(s.id);
    acc[s.id] = p !== null && JSON.stringify(p) !== JSON.stringify(lastSaved[s.id]);
    return acc;
  }, {});
  const anyDirty = !loading && Object.values(dirtyMap).some(Boolean);
  const activeDirty = !loading && (dirtyMap[activeSection] ?? false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, fields] = await Promise.all([
        fetchSettings(),
        fetchCustomFields().catch(() => [] as DentalCustomFieldDef[]),
      ]);
      const labN = settings.workOrderHeader?.labName ?? "";
      const addr = settings.workOrderHeader?.address ?? "";
      const ph = settings.workOrderHeader?.phone ?? "";
      const cleanedTemplates: Record<string, string[]> = {};
      Object.entries(settings.stageTemplates ?? {}).forEach(([cat, list]) => {
        const f = list.map(s => s.trim()).filter(Boolean);
        if (f.length > 0) cleanedTemplates[cat] = f;
      });
      const rdy = (settings.whatsappTemplates?.ready ?? "").trim() || undefined;
      const rcv = (settings.whatsappTemplates?.received ?? "").trim() || undefined;
      const ovd = (settings.whatsappTemplates?.overdue ?? "").trim() || undefined;
      const bp = settings.billingPolicy ?? { invoiceMode: "AUTO_ON_DELIVERY", requireInvoiceBeforeDelivery: true, requireFullPaymentBeforeDelivery: false, enforceCreditLimit: false };
      const wage = settings.wages?.defaultPerStage ?? 0;
      const dunningEnabledVal = settings.notifications?.dunningEnabled ?? false;
      const dunningAgingDaysVal = settings.notifications?.dunningAgingDays ?? 15;
      setLabName(labN);
      setAddress(addr);
      setPhone(ph);
      setStageTemplates(settings.stageTemplates ?? {});
      setReadyTemplate(settings.whatsappTemplates?.ready ?? "");
      setReceivedTemplate(settings.whatsappTemplates?.received ?? "");
      setOverdueTemplate(settings.whatsappTemplates?.overdue ?? "");
      const guardsVal = settings.guards ?? {};
      setCustomFields(fields);
      setBillingPolicy(bp);
      setGuards(guardsVal);
      setWageDefault(wage);
      setDunningEnabled(dunningEnabledVal);
      setDunningAgingDays(dunningAgingDaysVal);
      setLastSaved({
        general: { workOrderHeader: { labName: labN.trim() || undefined, address: addr.trim() || undefined, phone: ph.trim() || undefined } },
        stages: { stageTemplates: cleanedTemplates },
        whatsapp: { whatsappTemplates: { ready: rdy, received: rcv, overdue: ovd } },
        wages: { wages: { defaultPerStage: Number(wage) || 0 } },
        dunning: { notifications: { dunningEnabled: dunningEnabledVal, dunningAgingDays: Number(dunningAgingDaysVal) || 15 } },
        billing: { billingPolicy: bp, guards: guardsVal },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.settings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  const handleRefresh = () => {
    if (anyDirty && !window.confirm(String(t("dentalLab.settings.discardConfirm")))) return;
    load();
  };

  const updateStage = (cat: string, index: number, value: string) => {
    setStageTemplates(prev => {
      const list = prev[cat] ?? [];
      const next = [...list];
      next[index] = value;
      return { ...prev, [cat]: next };
    });
  };

  const addStage = (cat: string) => {
    setStageTemplates(prev => {
      const list = prev[cat] ?? [];
      return { ...prev, [cat]: [...list, ""] };
    });
  };

  const removeStage = (cat: string, index: number) => {
    setStageTemplates(prev => {
      const list = (prev[cat] ?? []).filter((_, i) => i !== index);
      return { ...prev, [cat]: list };
    });
  };

  const saveActive = async () => {
    const payload = buildPayload(activeSection);
    if (!payload || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveSettings(payload);
      setLastSaved(prev => ({ ...prev, [activeSection]: payload }));
      toast.success(t("dentalLab.settings.saved"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("dentalLab.settings.saveError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addField = async () => {
    if (!newFieldName.trim()) return;
    try {
      await createCustomField({ name: newFieldName.trim(), fieldType: newFieldType, isActive: true });
      setNewFieldName("");
      setNewFieldType("TEXT");
      const fields = await fetchCustomFields().catch(() => [] as DentalCustomFieldDef[]);
      setCustomFields(fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const removeField = async (field: DentalCustomFieldDef) => {
    if (fieldBusyId) return;
    if (!window.confirm(`${t("dentalLab.common.confirmDelete")} (${field.name})`)) return;
    setFieldBusyId(field.id);
    try {
      await deleteCustomField(field.id);
      setCustomFields(prev => prev.filter(f => f.id !== field.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setFieldBusyId(null);
    }
  };

  const toggleField = async (field: DentalCustomFieldDef) => {
    if (fieldBusyId) return;
    setFieldBusyId(field.id);
    try {
      const updated = await updateCustomField(field.id, { isActive: !field.isActive });
      setCustomFields(prev => prev.map(f => (f.id === field.id ? updated : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setFieldBusyId(null);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionCls = "bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5";

  const isInstantSection = buildPayload(activeSection) === null;
  const saveDisabled = loading || saving || !activeDirty;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.tabs.settings")}</h2>
          {activeDirty && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {t("dentalLab.settings.unsavedChanges")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          {isInstantSection ? (
            <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              <CheckCircle2 className="w-4 h-4" />{t("dentalLab.settings.savedInstantly")}
            </span>
          ) : (
            <button onClick={saveActive} disabled={saveDisabled} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
        <aside className="min-w-0">
          <nav className="flex flex-wrap lg:flex-col gap-1 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-2">
            {SETTINGS_SECTIONS.map(section => {
              const Icon = section.icon;
              const sectionDirty = !loading && (dirtyMap[section.id] ?? false);
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={activeSection === section.id ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{t(section.labelKey)}</span>
                  {sectionDirty && (
                    <span className={`ms-auto w-1.5 h-1.5 shrink-0 rounded-full ${activeSection === section.id ? "bg-white" : "bg-amber-500"}`} title={t("dentalLab.settings.unsavedChanges")} />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {loading ? (
            <div className={`${sectionCls} space-y-4`}>
              <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
              </div>
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
          {activeSection === "general" && (
            <div className={`${sectionCls} space-y-4`}>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold">{t("dentalLab.settings.workOrderHeader")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.labName")}</label>
                  <input className={inputCls} value={labName} onChange={e => setLabName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.address")}</label>
                  <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.phone")}</label>
                  <input className={inputCls} type="tel" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
                </div>
              </div>
            </div>
          )}

          {activeSection === "stages" && (
            <div className={`${sectionCls} space-y-4`}>
              <div>
                <h3 className="font-semibold">{t("dentalLab.settings.stageTemplates")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.stageTemplatesHint")}</p>
              </div>
              <div className="space-y-4">
                {WORK_TYPE_CATEGORIES.map(cat => {
                  const stages = stageTemplates[cat] ?? [];
                  return (
                    <div key={cat} className="border dark:border-gray-700 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{CATEGORY_LABEL(t, cat)}</p>
                      {stages.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{t("dentalLab.common.noData")}</p>
                      )}
                      <div className="space-y-2">
                        {stages.map((stage, i) => (
                          <div key={`${cat}-${i}`} className="flex items-center gap-2">
                            <input
                              className={inputCls}
                              value={stage}
                              onChange={e => updateStage(cat, i, e.target.value)}
                              placeholder={`${t("dentalLab.settings.stageName")} ${i + 1}`}
                            />
                            <button onClick={() => removeStage(cat, i)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title={t("dentalLab.settings.removeStage")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addStage(cat)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Plus className="w-3.5 h-3.5" />{t("dentalLab.settings.addStage")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "whatsapp" && (
            <div className={`${sectionCls} space-y-4`}>
              <div>
                <h3 className="font-semibold">{t("dentalLab.settings.whatsappTemplates")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.whatsappHint")}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.readyTemplate")}</label>
                  <textarea className={`${inputCls} min-h-[70px] resize-y`} value={readyTemplate} onChange={e => setReadyTemplate(e.target.value)} placeholder={t("dentalLab.settings.readyPlaceholder")} />
                </div>
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.receivedTemplate")}</label>
                  <textarea className={`${inputCls} min-h-[70px] resize-y`} value={receivedTemplate} onChange={e => setReceivedTemplate(e.target.value)} placeholder={t("dentalLab.settings.receivedPlaceholder")} />
                </div>
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.overdueTemplate")}</label>
                  <textarea className={`${inputCls} min-h-[70px] resize-y`} value={overdueTemplate} onChange={e => setOverdueTemplate(e.target.value)} placeholder={t("dentalLab.settings.overduePlaceholder")} />
                </div>
              </div>
            </div>
          )}

          {activeSection === "fields" && (
            <div className={`${sectionCls} space-y-4`}>
              <div>
                <h3 className="font-semibold">{t("dentalLab.settings.customFields")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.customFieldsHint")}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className={labelCls}>{t("dentalLab.settings.fieldName")}</label>
                  <input className={inputCls} value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.fieldType")}</label>
                  <select className={inputCls} value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
                    {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{tKey(t, `dentalLab.settings.fieldTypes.${ft}`)}</option>)}
                  </select>
                </div>
                <button onClick={addField} disabled={!newFieldName.trim()} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" />{t("dentalLab.settings.addField")}
                </button>
              </div>
              {customFields.length > 0 && (
                <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                  {customFields.map(f => (
                    <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="font-medium">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{f.fieldType ? tKey(t, `dentalLab.settings.fieldTypes.${f.fieldType}`) : "—"}</span>
                        <button
                          onClick={() => toggleField(f)}
                          className={`text-xs px-2 py-0.5 rounded-full border ${f.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                        >
                          {f.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                        </button>
                        <button onClick={() => removeField(f)} disabled={fieldBusyId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "wages" && (
            <div className={`${sectionCls} space-y-4`}>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <h3 className="font-semibold">{t("dentalLab.settings.wages.title")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.wages.hint")}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.wages.defaultPerStage")}</label>
                  <input className={inputCls} type="number" min={0} step="0.01" value={wageDefault} onChange={e => setWageDefault(Number(e.target.value))} dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("dentalLab.settings.wages.note")}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "dunning" && (
            <div className={`${sectionCls} space-y-4`}>
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <h3 className="font-semibold">{t("dentalLab.settings.dunning.title")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.dunning.hint")}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("dentalLab.settings.dunning.agingDays")}</label>
                  <input className={inputCls} type="number" min={1} value={dunningAgingDays} onChange={e => setDunningAgingDays(Number(e.target.value))} dir="ltr" />
                </div>
              </div>
              <ToggleRow
                label={t("dentalLab.settings.dunning.enabled")}
                hint={t("dentalLab.settings.dunning.enabled_hint")}
                checked={dunningEnabled}
                onChange={setDunningEnabled}
              />
            </div>
          )}

          {activeSection === "billing" && (
            <div className={`${sectionCls} space-y-4`}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <h3 className="font-semibold">{t("dentalLab.settings.billingPolicy.title")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.settings.billingPolicy.hint")}</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                {t("dentalLab.settings.billingPolicy.whoOwes")}
              </div>

              <div>
                <label className={labelCls}>{t("dentalLab.settings.billingPolicy.invoiceMode")}</label>
                <select
                  className={inputCls}
                  value={billingPolicy.invoiceMode ?? "AUTO_ON_DELIVERY"}
                  onChange={e => setBillingPolicy(prev => ({ ...prev, invoiceMode: e.target.value as DentalInvoiceMode }))}
                >
                  {INVOICE_MODES.map(m => (
                    <option key={m.id} value={m.id}>
                      {t(m.labelKey)} — {tKey(t, m.hintKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y dark:divide-gray-700 border-t dark:border-gray-700">
                <ToggleRow
                  label={t("dentalLab.settings.billingPolicy.requireInvoiceBeforeDelivery")}
                  hint={t("dentalLab.settings.billingPolicy.requireInvoiceBeforeDelivery_hint")}
                  checked={billingPolicy.requireInvoiceBeforeDelivery !== false}
                  onChange={v => setBillingPolicy(prev => ({ ...prev, requireInvoiceBeforeDelivery: v }))}
                />
                <ToggleRow
                  label={t("dentalLab.settings.billingPolicy.requireFullPaymentBeforeDelivery")}
                  hint={t("dentalLab.settings.billingPolicy.requireFullPaymentBeforeDelivery_hint")}
                  checked={billingPolicy.requireFullPaymentBeforeDelivery === true}
                  onChange={v => setBillingPolicy(prev => ({ ...prev, requireFullPaymentBeforeDelivery: v }))}
                />
                <ToggleRow
                  label={t("dentalLab.settings.billingPolicy.enforceCreditLimit")}
                  hint={t("dentalLab.settings.billingPolicy.enforceCreditLimit_hint")}
                  checked={billingPolicy.enforceCreditLimit === true}
                  onChange={v => setBillingPolicy(prev => ({ ...prev, enforceCreditLimit: v }))}
                />
                <ToggleRow
                  label="إلزام فحص الجودة قبل التسليم"
                  hint="يمنع نقل الحالة إلى جاهز للتسليم (READY) إلا بعد إجراء فحص جودة معتمد وناجح"
                  checked={guards.requireQualityCheckBeforeReady === true}
                  onChange={v => setGuards(prev => ({ ...prev, requireQualityCheckBeforeReady: v }))}
                />
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}