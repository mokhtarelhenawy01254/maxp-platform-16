import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type DentalCustomFieldDef,
  fetchSettings,
  saveSettings,
  fetchCustomFields,
  type BillingPolicy,
  type DentalLabSettings,
} from "../../shared";
import {
  type SettingsSectionId,
  SETTINGS_SECTIONS,
} from "../types/settingsTypes";

export function useDentalLabSettings() {
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

  const rawParts = (path || "").split("/").filter(Boolean);
  const urlSection =
    rawParts.length > 1
      ? rawParts[1]
      : rawParts[0] === "settings"
        ? "general"
        : rawParts[0] || "general";
  const activeSection = SETTINGS_SECTIONS.some((s) => s.id === urlSection)
    ? (urlSection as SettingsSectionId)
    : "general";
  const setActiveSection = (id: SettingsSectionId) =>
    navigate(`/dental-lab/settings/${id}`);

  const buildPayload = (id: SettingsSectionId): Partial<DentalLabSettings> | null => {
    switch (id) {
      case "general":
        return {
          workOrderHeader: {
            labName: labName.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        };
      case "stages": {
        const cleaned: Record<string, string[]> = {};
        Object.entries(stageTemplates).forEach(([cat, list]) => {
          const f = list.map((s) => s.trim()).filter(Boolean);
          if (f.length > 0) cleaned[cat] = f;
        });
        return { stageTemplates: cleaned };
      }
      case "whatsapp":
        return {
          whatsappTemplates: {
            ready: readyTemplate.trim() || undefined,
            received: receivedTemplate.trim() || undefined,
            overdue: overdueTemplate.trim() || undefined,
          },
        };
      case "wages":
        return { wages: { defaultPerStage: Number(wageDefault) || 0 } };
      case "dunning":
        return {
          notifications: {
            dunningEnabled,
            dunningAgingDays: Number(dunningAgingDays) || 15,
          },
        };
      case "billing":
        return { billingPolicy, guards };
      default:
        return null;
    }
  };

  const dirtyMap = SETTINGS_SECTIONS.reduce<Record<string, boolean>>((acc, s) => {
    const p = buildPayload(s.id);
    acc[s.id] =
      p !== null && JSON.stringify(p) !== JSON.stringify(lastSaved[s.id]);
    return acc;
  }, {});

  const anyDirty = !loading && Object.values(dirtyMap).some(Boolean);
  const activeDirty = !loading && (dirtyMap[activeSection] ?? false);
  const isInstantSection = buildPayload(activeSection) === null;

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
        const f = list.map((s) => s.trim()).filter(Boolean);
        if (f.length > 0) cleanedTemplates[cat] = f;
      });
      const rdy = (settings.whatsappTemplates?.ready ?? "").trim() || undefined;
      const rcv = (settings.whatsappTemplates?.received ?? "").trim() || undefined;
      const ovd = (settings.whatsappTemplates?.overdue ?? "").trim() || undefined;
      const bp = settings.billingPolicy ?? {
        invoiceMode: "AUTO_ON_DELIVERY",
        requireInvoiceBeforeDelivery: true,
        requireFullPaymentBeforeDelivery: false,
        enforceCreditLimit: false,
      };
      const wage = settings.wages?.defaultPerStage ?? 0;
      const dunningEnabledVal = settings.notifications?.dunningEnabled ?? false;
      const dunningAgingDaysVal = settings.notifications?.dunningAgingDays ?? 15;
      const guardsVal = settings.guards ?? {};

      setLabName(labN);
      setAddress(addr);
      setPhone(ph);
      setStageTemplates(settings.stageTemplates ?? {});
      setReadyTemplate(settings.whatsappTemplates?.ready ?? "");
      setReceivedTemplate(settings.whatsappTemplates?.received ?? "");
      setOverdueTemplate(settings.whatsappTemplates?.overdue ?? "");
      setCustomFields(fields);
      setBillingPolicy(bp);
      setGuards(guardsVal);
      setWageDefault(wage);
      setDunningEnabled(dunningEnabledVal);
      setDunningAgingDays(dunningAgingDaysVal);
      setLastSaved({
        general: {
          workOrderHeader: {
            labName: labN.trim() || undefined,
            address: addr.trim() || undefined,
            phone: ph.trim() || undefined,
          },
        },
        stages: { stageTemplates: cleanedTemplates },
        whatsapp: { whatsappTemplates: { ready: rdy, received: rcv, overdue: ovd } },
        wages: { wages: { defaultPerStage: Number(wage) || 0 } },
        dunning: {
          notifications: {
            dunningEnabled: dunningEnabledVal,
            dunningAgingDays: Number(dunningAgingDaysVal) || 15,
          },
        },
        billing: { billingPolicy: bp, guards: guardsVal },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading settings");
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (anyDirty && !window.confirm(String(t("dentalLab.settings.discardConfirm")))) {
      return;
    }
    load();
  };

  const updateStage = (cat: string, index: number, value: string) => {
    setStageTemplates((prev) => {
      const list = prev[cat] ?? [];
      const next = [...list];
      next[index] = value;
      return { ...prev, [cat]: next };
    });
  };

  const addStage = (cat: string) => {
    setStageTemplates((prev) => {
      const list = prev[cat] ?? [];
      return { ...prev, [cat]: [...list, ""] };
    });
  };

  const removeStage = (cat: string, index: number) => {
    setStageTemplates((prev) => {
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
      setLastSaved((prev) => ({ ...prev, [activeSection]: payload }));
      toast.success(t("dentalLab.settings.saved"));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(t("dentalLab.settings.saveError"));
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    setError,
    activeSection,
    setActiveSection,
    dirtyMap,
    anyDirty,
    activeDirty,
    isInstantSection,
    handleRefresh,
    saveActive,
    labName,
    setLabName,
    address,
    setAddress,
    phone,
    setPhone,
    stageTemplates,
    updateStage,
    addStage,
    removeStage,
    readyTemplate,
    setReadyTemplate,
    receivedTemplate,
    setReceivedTemplate,
    overdueTemplate,
    setOverdueTemplate,
    customFields,
    setCustomFields,
    billingPolicy,
    setBillingPolicy,
    guards,
    setGuards,
    wageDefault,
    setWageDefault,
    dunningEnabled,
    setDunningEnabled,
    dunningAgingDays,
    setDunningAgingDays,
  };
}
