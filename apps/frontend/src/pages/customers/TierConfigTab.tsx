import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Settings,
  Save,
  Search,
  User,
  Crown,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronUp,
  Zap,
  BarChart3,
  CheckCircle,
} from "lucide-react";

interface TierItem {
  id: string;
  name: string;
  nameAr?: string;
  calculationType: string;
  minPoints?: number | null;
  maxPoints?: number | null;
  minSpent?: number | null;
  maxSpent?: number | null;
  minItems?: number | null;
  maxItems?: number | null;
  benefits?: any;
  color: string;
  icon: string;
  priority: number;
  customersCount?: number;
  programId?: string;
}

interface ProgramItem {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  status: string;
}

interface CustomerOverride {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tierMethod?: string | null;
  tierBenefits?: any;
}

interface TierAnalytics {
  id: string;
  name: string;
  nameAr?: string;
  color: string;
  priority: number;
  customersCount: number;
}

interface TiersAnalytics {
  system: "TIERS";
  totalEnrolled: number;
  tiers: TierAnalytics[];
}

type SystemAnalytics = TiersAnalytics | null;

const METHODS = [
  { value: "POINTS", label: "╪¿╪º┘ä┘å┘é╪º╪╖", hint: "╪º┘ä╪¡╪»┘ê╪» ╪¿╪º┘ä┘å┘é╪º╪╖" },
  { value: "SPENT", label: "╪¿╪º┘ä┘ü┘ä┘ê╪│ ╪º┘ä┘à╪»┘ü┘ê╪╣╪⌐", hint: "╪º┘ä╪¡╪»┘ê╪» ╪¿╪º┘ä┘à╪¿┘ä╪║ (╪¼.┘à)" },
  { value: "ITEMS", label: "╪¿╪╣╪»╪» ╪º┘ä┘é╪╖╪╣", hint: "╪º┘ä╪¡╪»┘ê╪» ╪¿╪╣╪»╪» ╪º┘ä┘é╪╖╪╣" },
  { value: "ORDER_COUNT", label: "╪¿╪╣╪»╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬", hint: "╪º┘ä╪¡╪»┘ê╪» ╪¿╪╣╪»╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬" },
];

const emptyBenefits = { freeShipping: false, discountPercent: 0, priorityShipping: false, customText: "" };

const normalizeBenefits = (b: any) => {
  if (!b) return { ...emptyBenefits };
  if (Array.isArray(b)) return { ...emptyBenefits, customText: b.join("╪î ") };
  return {
    freeShipping: Boolean(b.freeShipping),
    discountPercent: Number(b.discountPercent || 0),
    priorityShipping: Boolean(b.priorityShipping),
    customText: b.customText || "",
  };
};

// ΓöÇΓöÇ Range helpers (╪¬╪¡╪»┘è╪» ╪º┘ä╪¡╪»┘ê╪» ╪¡╪│╪¿ ╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪│╪º╪¿) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const rangeFields = (calcType: string) => {
  const c = calcType || "POINTS";
  if (c === "SPENT") return { minKey: "minSpent", maxKey: "maxSpent", unit: "╪¼.┘à" };
  if (c === "ITEMS" || c === "ORDER_COUNT") return { minKey: "minItems", maxKey: "maxItems", unit: c === "ORDER_COUNT" ? "╪ú┘ê╪▒╪»╪▒" : "┘é╪╖╪╣╪⌐" };
  return { minKey: "minPoints", maxKey: "maxPoints", unit: "┘å┘é╪╖╪⌐" };
};

const extractRange = (tier: TierItem): { min: number | null; max: number | null } => {
  const { minKey, maxKey } = rangeFields(tier.calculationType);
  const minVal = (tier as any)[minKey];
  const maxVal = (tier as any)[maxKey];
  const min = minVal === undefined || minVal === null || minVal === "" ? null : Number(minVal);
  const max = maxVal === undefined || maxVal === null || maxVal === "" ? null : Number(maxVal);
  return { min, max };
};

const isRangeEmpty = (r: { min: number | null; max: number | null }) => r.min === null && r.max === null;

const rangesOverlap = (a: { min: number | null; max: number | null }, b: { min: number | null; max: number | null }) => {
  const aMin = a.min === null ? 0 : a.min;
  const bMin = b.min === null ? 0 : b.min;
  const aMax = a.max === null ? Infinity : a.max;
  const bMax = b.max === null ? Infinity : b.max;
  return aMin <= bMax && bMin <= aMax;
};

const rangeLabel = (tier: TierItem): string => {
  const { unit } = rangeFields(tier.calculationType);
  const { min, max } = extractRange(tier);
  if (isRangeEmpty({ min, max })) return "┘ä┘à ┘è╪¬┘à ╪¬╪¡╪»┘è╪» ╪º┘ä╪¡╪»┘ê╪» ╪¿╪╣╪»";
  const minTxt = min === null ? `┘à┘å 0 ${unit}` : `┘à┘å ${min.toLocaleString("ar-EG")} ${unit}`;
  const maxTxt = max === null ? "┘ü┘à╪º ┘ü┘ê┘é" : `╪Ñ┘ä┘ë ${max.toLocaleString("ar-EG")} ${unit}`;
  return `${minTxt} ΓÇö ${maxTxt}`;
};

// ┘ü╪¡╪╡ ╪º┘ä╪¬┘â╪▒╪º╪▒/╪º┘ä╪¬╪»╪º╪«┘ä ╪¿┘è┘å ╪¡╪»┘ê╪» ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬
const validateRangeConflicts = (tier: TierItem, allTiers: TierItem[]): string => {
  const { min, max } = extractRange(tier);
  if (!isRangeEmpty({ min, max }) && min !== null && max !== null && min > max) {
    return "╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë ╪ú┘â╪¿╪▒ ┘à┘å ╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë";
  }
  if (isRangeEmpty({ min, max })) return "";
  for (const other of allTiers) {
    if (other.id === tier.id) continue;
    if ((other.calculationType || "POINTS") !== (tier.calculationType || "POINTS")) continue;
    const oRange = extractRange(other);
    if (isRangeEmpty(oRange)) continue;
    if (oRange.min === min && oRange.max === max) {
      return `┘è┘ê╪¼╪» ┘à╪│╪¬┘ê┘ë ╪ó╪«╪▒ ("${other.nameAr || other.name}") ╪¿┘å┘ü╪│ ╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë ┘ê╪º┘ä╪ú┘é╪╡┘ë`;
    }
    if (rangesOverlap(oRange, { min, max })) {
      return `╪¡╪»┘ê╪» ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘ê┘ë ╪¬╪¬╪»╪º╪«┘ä ┘à╪╣ ╪¡╪»┘ê╪» ┘à╪│╪¬┘ê┘ë ╪ó╪«╪▒ ("${other.nameAr || other.name}")`;
    }
  }
  return "";
};

const TierConfigTab: React.FC = () => {
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [activated, setActivated] = useState<boolean>(false);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [programId, setProgramId] = useState<string>("");
  const [defaultMethod, setDefaultMethod] = useState<string>("POINTS");
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null);

  // per-customer override
  const [phoneQuery, setPhoneQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<CustomerOverride | null>(null);
  const [overrideMethod, setOverrideMethod] = useState<string>("");
  const [overrideBenefits, setOverrideBenefits] = useState({ ...emptyBenefits });

  const loadPrograms = useCallback(async () => {
    try {
      const res = await apiClient.get("/hr/customer-loyalty/programs");
      const active = (res.data?.data || []).filter((p: ProgramItem) => p.status === "ACTIVE");
      setPrograms(active);
      if (active.length > 0 && !programId) {
        setProgramId(active[0].id);
      }
    } catch (e) {
      console.error("Error loading programs:", e);
    }
  }, [programId]);

  const loadConfig = useCallback(async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiClient.get(`/hr/customer-loyalty/tier-config?programId=${pid}`);
      const data = res.data?.data;
      setDefaultMethod(data?.defaultTierMethod || "POINTS");
      setTiers((data?.tiers || []).map((t: TierItem) => ({ ...t, benefits: normalizeBenefits(t.benefits) })));
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  useEffect(() => { if (programId) loadConfig(programId); }, [programId, loadConfig]);

  // ╪¬╪¡┘à┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í ╪º┘ä╪¡╪º┘ä┘è (╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬) ΓÇö ≡ƒåò ╪º┘ä╪¬┘ü╪╣┘è┘ä ┘à╪│╪¬┘é┘ä ╪╣╪¿╪▒ loyalty-config
  useEffect(() => {
    let cancelled = false;
    apiClient.get("/hr/customer-loyalty/loyalty-config")
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data || {};
        setActivated(d.tiers?.enabled === true);
        setActiveSystem(d.tiers?.enabled ? "TIERS" : "AUTO_DISCOUNT");
      })
      .catch(() => {
        if (cancelled) return;
        setActiveSystem("TIERS");
        setActivated(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬: ┘è╪¡┘ü╪╕ ╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪│╪º╪¿ + ┘â┘ä ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ + ┘è┘ü╪╣┘ä ╪º┘ä┘å╪╕╪º┘à + ┘è╪╖╪¿┘é┘ç ╪╣┘ä┘ë ┘â┘ä ╪º┘ä╪╣┘à┘ä╪º╪í ┘ü┘ê╪▒╪º┘ï
  // (Toggle: ┘ä┘ê ┘à┘ü╪╣┘æ┘ä ┘ê┘å╪╢╪║╪╖ ╪¬╪º┘å┘è ΓåÆ ╪│╪ñ╪º┘ä ╪Ñ┘è┘é╪º┘ü)
  const activateTiers = async () => {
    if (!programId) {
      setErrorMsg("╪º╪«╪¬╪▒ ╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í ╪ú┘ê┘ä╪º┘ï");
      return;
    }

    // ┘ä┘ê ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘à┘ü╪╣┘æ┘ä╪⌐ ╪¡╪º┘ä┘è╪º┘ï ΓåÆ ╪º┘ä╪╢╪║╪╖ ┘à╪▒╪⌐ ╪¬╪º┘å┘è╪⌐ ┘à╪╣┘å╪º┘ç ╪Ñ┘è┘é╪º┘ü
    if (activated) {
      if (!window.confirm("┘ç┘ä ╪¬╪▒┘è╪» ╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬╪ƒ")) return;
      setSaving(true);
      setErrorMsg("");
      setSavedMsg("");
      try {
        const res = await apiClient.put("/hr/customer-loyalty/loyalty-config", { tiersEnabled: false });
        setActivated(res.data?.data?.tiers?.enabled === true);
        setSavedMsg("╪¬┘à ╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ Γ£ô");
      } catch (e: any) {
        setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪Ñ┘è┘é╪º┘ü ╪º┘ä╪¬┘ü╪╣┘è┘ä");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");
    try {
      // 1) ╪¡┘ü╪╕ ╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪│╪º╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐
      await apiClient.put("/hr/customer-loyalty/tier-config", { programId, defaultTierMethod: defaultMethod });

      // 2) ╪¡┘ü╪╕ ┘â┘ä ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ (╪¬╪╣╪»┘è┘ä╪º╪¬ ┘à┘ü╪¬┘ê╪¡╪⌐ + ╪º┘ä┘à┘ê╪¼┘ê╪»┘è┘å) ╪¬┘ä┘é╪º╪ª┘è╪º┘ï
      for (const tier of tiers) {
        await apiClient.put(`/hr/customer-loyalty/tiers/${tier.id}`, {
          name: tier.name,
          nameAr: tier.nameAr,
          calculationType: tier.calculationType,
          minPoints: tier.calculationType === "POINTS" ? tier.minPoints : null,
          maxPoints: tier.calculationType === "POINTS" ? tier.maxPoints : null,
          minSpent: tier.calculationType === "SPENT" ? tier.minSpent : null,
          maxSpent: tier.calculationType === "SPENT" ? tier.maxSpent : null,
          minItems: tier.calculationType === "ITEMS" || tier.calculationType === "ORDER_COUNT" ? tier.minItems : null,
          maxItems: tier.calculationType === "ITEMS" || tier.calculationType === "ORDER_COUNT" ? tier.maxItems : null,
          benefits: tier.benefits,
          color: tier.color,
          priority: tier.priority,
        });
      }

      // 3) ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ (╪º┘ä╪╢╪║╪╖ ╪╣┘ä┘ë "╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à") ΓåÆ ╪¿╪º┘â ╪Ñ┘å╪» ╪¿┘è╪╖╪¿┘é┘ç ╪╣┘ä┘ë ┘â┘ä ╪º┘ä╪╣┘à┘ä╪º╪í
      const res = await apiClient.put("/hr/customer-loyalty/loyalty-config", { tiersEnabled: true });
      setActiveSystem("TIERS");
      setActivated(res.data?.data?.tiers?.enabled === true);
      const activation = res.data?.activation;
      const appliedTxt = activation ? ` ΓÇö ╪º╪¬╪╖╪¿┘é ╪╣┘ä┘ë ${activation.enrolled || 0} ╪╣┘à┘è┘ä ╪¼╪»┘è╪» + ${activation.updated || 0} ╪╣┘à┘è┘ä` : "";
      setSavedMsg(`╪¬┘à ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ Γ£ô${appliedTxt}`);
      await loadConfig(programId);
      await loadAnalytics();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬");
    } finally {
      setSaving(false);
    }
  };

  // ΓöÇΓöÇ ╪¬╪¡┘ä┘è┘ä╪º╪¬ ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ΓöÇΓöÇ
  const [analytics, setAnalytics] = useState<SystemAnalytics>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await apiClient.get("/hr/customer-loyalty/system-analytics");
      setAnalytics((res.data?.data as SystemAnalytics) || null);
    } catch (e) {
      console.error("Error loading loyalty analytics:", e);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSystem) {
      loadAnalytics();
    }
  }, [activeSystem, loadAnalytics]);


  const updateTierField = (id: string, field: keyof TierItem, value: any) => {
    setTiers(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const updateTierBenefits = (id: string, field: string, value: any) => {
    setTiers(prev => prev.map(t => (t.id === id ? { ...t, benefits: { ...t.benefits, [field]: value } } : t)));
  };

  const createTier = async () => {
    if (!programId) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const newTier: any = {
        programId,
        name: "New Tier",
        nameAr: "┘à╪│╪¬┘ê┘ë ╪¼╪»┘è╪»",
        calculationType: defaultMethod,
        minPoints: null,
        maxPoints: null,
        benefits: emptyBenefits,
        priority: tiers.length + 1,
      };
      const res = await apiClient.post("/hr/customer-loyalty/tiers", newTier);
      const createdId = res.data?.data?.id || res.data?.id;
      setSavedMsg("╪¬┘à ╪Ñ╪╢╪º┘ü╪⌐ ┘à╪│╪¬┘ê┘ë ╪¼╪»┘è╪» Γ£ô");
      await loadConfig(programId);
      if (createdId) setExpandedTierId(createdId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à╪│╪¬┘ê┘ë");
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (id: string) => {
    if (!window.confirm("╪¡╪░┘ü ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘ê┘ë╪ƒ")) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await apiClient.delete(`/hr/customer-loyalty/tiers/${id}`);
      setSavedMsg("╪¬┘à ╪¡╪░┘ü ╪º┘ä┘à╪│╪¬┘ê┘ë Γ£ô");
      if (expandedTierId === id) setExpandedTierId(null);
      loadConfig(programId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪¡╪░┘ü ╪º┘ä┘à╪│╪¬┘ê┘ë");
    } finally {
      setSaving(false);
    }
  };

  const searchCustomer = async () => {
    if (!phoneQuery.trim()) return;
    setSearching(true);
    setErrorMsg("");
    try {
      const res = await apiClient.get(`/customers?search=${encodeURIComponent(phoneQuery.trim())}&limit=5`);
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.customers) ? res.data.customers : []);
      const match = list[0];
      if (!match) {
        setFoundCustomer(null);
        setErrorMsg("┘ä╪º ┘è┘ê╪¼╪» ╪╣┘à┘è┘ä ╪¿┘ç╪░╪º ╪º┘ä╪▒┘é┘à");
        return;
      }
      const override = await apiClient.get(`/hr/customer-loyalty/customers/${match.id}/tier-override`);
      const o = override.data?.data;
      setFoundCustomer(o);
      setOverrideMethod(o?.tierMethod || "");
      setOverrideBenefits(normalizeBenefits(o?.tierBenefits));
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪º┘ä╪╣┘à┘è┘ä");
    } finally {
      setSearching(false);
    }
  };

  const saveOverride = async () => {
    if (!foundCustomer) return;
    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");
    try {
      await apiClient.put(`/hr/customer-loyalty/customers/${foundCustomer.id}/tier-override`, {
        tierMethod: overrideMethod || null,
        tierBenefits: overrideBenefits,
      });
      setSavedMsg("╪¬┘à ╪¡┘ü╪╕ ┘à╪▓╪º┘è╪º ╪º┘ä╪╣┘à┘è┘ä Γ£ô");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "┘ü╪┤┘ä ╪¡┘ü╪╕ ┘à╪▓╪º┘è╪º ╪º┘ä╪╣┘à┘è┘ä");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100";

  const renderBenefitsChips = (b: any) => {
    const chips: string[] = [];
    if (b?.freeShipping) chips.push("╪┤╪¡┘å ┘à╪¼╪º┘å┘è");
    if (b?.priorityShipping) chips.push("╪┤╪¡┘å ╪│╪▒┘è╪╣");
    if (Number(b?.discountPercent || 0) > 0) chips.push(`╪«╪╡┘à ${b.discountPercent}%`);
    if (b?.customText) chips.push(b.customText);
    return chips;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">╪╖╪▒┘è┘é╪⌐ ╪¡╪│╪º╪¿ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä + ┘à╪▓╪º┘è╪º ┘â┘ä ┘à╪│╪¬┘ê┘ë + ┘à╪▓╪º┘è╪º ┘à╪«╪╡╪╡╪⌐ ┘ä┘â┘ä ╪╣┘à┘è┘ä</p>
          </div>
        </div>
        {savedMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{savedMsg}</span>}
        {errorMsg && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{errorMsg}</span>}
      </div>

      {/* ╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪º┘ä┘å╪╕╪º┘à ╪º┘ä┘à┘ü╪╣┘æ┘ä */}
      {activeSystem && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">╪¬╪¡┘ä┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬</h4>
            </div>
            {analyticsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {analyticsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse" />
              ))}
            </div>
          ) : analytics?.system === "TIERS" ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  <p className="text-xl font-bold">{analytics.totalEnrolled ?? 0}</p>
                  <p className="text-xs">╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘à╪│╪¼┘ä┘è┘å ┘ü┘è ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í</p>
                </div>
              </div>
              {(analytics.tiers || []).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {analytics.tiers.map((tier: TierAnalytics) => (
                    <div key={tier.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800/60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-6 w-6 rounded-lg inline-flex items-center justify-center shrink-0" style={{ backgroundColor: (tier.color || "#6366f1") + "20", color: tier.color }}>
                          <Crown className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tier.nameAr || tier.name}</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tier.customersCount ?? 0}</p>
                      <p className="text-xs text-gray-500">╪╣┘à┘è┘ä ┘ü┘è ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘ê┘ë</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-3 text-center">┘ä╪º ╪¬┘ê╪¼╪» ┘à╪│╪¬┘ê┘è╪º╪¬ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ┘à╪│╪¬┘ê┘ë ┘ä╪╣╪▒╪╢ ╪¬╪¡┘ä┘è┘ä ╪º┘ä╪╣┘à┘ä╪º╪í.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ╪¬╪¡┘ä┘è┘ä ╪¿╪╣╪».</p>
          )}
        </div>
      )}

      {/* ╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪│╪º╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ + ╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪│╪º╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä┘ä╪┤╪▒┘â╪⌐</label>
            <select value={defaultMethod} onChange={(e) => setDefaultMethod(e.target.value)} className={inputCls + " mt-1"}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">┘ä┘ê ╪º┘ä╪╣┘à┘è┘ä ┘à┘ä┘ê╪┤ ╪╖╪▒┘è┘é╪⌐ ┘à╪«╪╡╪╡╪⌐╪î ╪¿┘è╪¬┘à ╪¡╪│╪º╪¿┘ç ╪¿╪º┘ä╪╖╪▒┘è┘é╪⌐ ╪»┘è ΓÇö ┘ê╪¿╪¬╪¬╪¡┘ü╪╕ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘å╪» ╪º┘ä╪¬┘ü╪╣┘è┘ä.</p>
          </div>
          <button
            onClick={activateTiers}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activated
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/60"
            } disabled:opacity-50`}
            title={activated ? "╪º╪╢╪║╪╖ ┘ä╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬" : "╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬"}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : activated ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {activated ? "╪¬┘à ╪º┘ä╪¬┘ü╪╣┘è┘ä" : "╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à"}
          </button>
        </div>
        {activated && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘à┘ü╪╣┘æ┘ä ΓÇö ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪¿╪¬╪¬╪¡┘ü╪╕ ╪ú┘ê╪¬┘ê┘à╪º╪¬┘è┘â┘è╪º┘ï ┘à╪╣ ╪ú┘è ╪¬╪╣╪»┘è┘ä╪î ┘ê╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘à╪╖╪¿┘æ┘é╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╣┘à┘ä╪º╪í.
          </p>
        )}
      </div>

      {/* Tiers list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬</h4>
          <button onClick={createTier} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
            <Plus className="h-4 w-4" /> ┘à╪│╪¬┘ê┘ë ╪¼╪»┘è╪»
          </button>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tiers.length === 0 && <p className="p-6 text-gray-500 text-center">┘ä╪º ╪¬┘ê╪¼╪» ┘à╪│╪¬┘ê┘è╪º╪¬ ΓÇö ╪ú╪╢┘ü ┘à╪│╪¬┘ê┘ë ╪¼╪»┘è╪»</p>}
            {tiers.map(tier => {
              const isExpanded = expandedTierId === tier.id;
              const benefitChips = renderBenefitsChips(tier.benefits);
              return (
                <div key={tier.id} className="p-5">
                  {/* Compact summary */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="h-8 w-8 rounded-lg inline-flex items-center justify-center" style={{ backgroundColor: tier.color + "20", color: tier.color }}>
                      <Crown className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{tier.nameAr || tier.name || "┘à╪│╪¬┘ê┘ë ╪¿╪»┘ê┘å ╪º╪│┘à"}</p>
                      <p className="text-xs text-gray-500">{rangeLabel(tier)}</p>
                    </div>
                    {benefitChips.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {benefitChips.map((ch, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{ch}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => setExpandedTierId(isExpanded ? null : tier.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} ╪¬╪╣╪»┘è┘ä
                    </button>
                    <button onClick={() => deleteTier(tier.id)} disabled={saving} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expanded edit form */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <input value={tier.nameAr || ""} onChange={(e) => updateTierField(tier.id, "nameAr", e.target.value)} placeholder="╪º┘ä╪º╪│┘à ╪¿╪º┘ä╪╣╪▒╪¿┘è" className={inputCls + " !w-44"} />
                        <input value={tier.name || ""} onChange={(e) => updateTierField(tier.id, "name", e.target.value)} placeholder="╪º┘ä╪º╪│┘à (en)" className={inputCls + " !w-44"} />
                        <select value={tier.calculationType} onChange={(e) => updateTierField(tier.id, "calculationType", e.target.value)} className={inputCls + " !w-52"}>
                          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input type="color" value={tier.color || "#6366f1"} onChange={(e) => updateTierField(tier.id, "color", e.target.value)} className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600" title="╪º┘ä┘ä┘ê┘å" />
                        <div className="flex-1" />
                        <button onClick={() => setExpandedTierId(null)} className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg text-sm whitespace-nowrap">
                          <X className="h-4 w-4" /> ╪Ñ╪║┘ä╪º┘é
                        </button>
                      </div>

                      {/* Thresholds */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {tier.calculationType === "POINTS" && (
                          <>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë (┘å┘é╪º╪╖)</label><input type="number" value={tier.minPoints ?? ""} onChange={(e) => updateTierField(tier.id, "minPoints", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë (┘å┘é╪º╪╖)</label><input type="number" value={tier.maxPoints ?? ""} onChange={(e) => updateTierField(tier.id, "maxPoints", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                          </>
                        )}
                        {tier.calculationType === "SPENT" && (
                          <>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë (╪¼.┘à)</label><input type="number" value={tier.minSpent ?? ""} onChange={(e) => updateTierField(tier.id, "minSpent", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë (╪¼.┘à)</label><input type="number" value={tier.maxSpent ?? ""} onChange={(e) => updateTierField(tier.id, "maxSpent", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                          </>
                        )}
                        {(tier.calculationType === "ITEMS" || tier.calculationType === "ORDER_COUNT") && (
                          <>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë ({tier.calculationType === "ORDER_COUNT" ? "╪ú┘ê╪▒╪»╪▒╪º╪¬" : "┘é╪╖╪╣"})</label><input type="number" value={tier.minItems ?? ""} onChange={(e) => updateTierField(tier.id, "minItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                            <div><label className="text-xs text-gray-500">╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ({tier.calculationType === "ORDER_COUNT" ? "╪ú┘ê╪▒╪»╪▒╪º╪¬" : "┘é╪╖╪╣"})</label><input type="number" value={tier.maxItems ?? ""} onChange={(e) => updateTierField(tier.id, "maxItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                          </>
                        )}
                      </div>

                      {/* Benefits */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                          <input type="checkbox" checked={Boolean(tier.benefits?.freeShipping)} onChange={(e) => updateTierBenefits(tier.id, "freeShipping", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                          ╪┤╪¡┘å ┘à╪¼╪º┘å┘è
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                          <input type="checkbox" checked={Boolean(tier.benefits?.priorityShipping)} onChange={(e) => updateTierBenefits(tier.id, "priorityShipping", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                          ╪┤╪¡┘å ╪│╪▒┘è╪╣ / ╪ú┘ê┘ä┘ê┘è╪⌐
                        </label>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                          <span className="whitespace-nowrap">╪«╪╡┘à %</span>
                          <input type="number" min="0" max="100" value={tier.benefits?.discountPercent ?? 0} onChange={(e) => updateTierBenefits(tier.id, "discountPercent", Number(e.target.value))} className={inputCls} />
                        </div>
                        <input value={tier.benefits?.customText || ""} onChange={(e) => updateTierBenefits(tier.id, "customText", e.target.value)} placeholder="┘à┘è╪▓╪⌐ ┘à╪«╪╡╪╡╪⌐..." className={inputCls} />
                      </div>

                      <div className="flex items-center gap-2">
                        {validateRangeConflicts(tier, tiers) && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">{validateRangeConflicts(tier, tiers)}</span>
                        )}
                        {!validateRangeConflicts(tier, tiers) && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">╪º┘ä╪¬╪╣╪»┘è┘ä╪º╪¬ ╪»┘è ╪¿╪¬╪¬╪¡┘ü╪╕ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘å╪» ╪º┘ä╪╢╪║╪╖ ╪╣┘ä┘ë "╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à".</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-customer override */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">┘à╪▓╪º┘è╪º / ╪╖╪▒┘è┘é╪⌐ ╪¡╪│╪º╪¿ ┘ä╪╣┘à┘è┘ä ┘à╪¡╪»╪»</h4>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input value={phoneQuery} onChange={(e) => setPhoneQuery(e.target.value)} placeholder="╪º┘â╪¬╪¿ ╪▒┘é┘à ╪¬┘ä┘è┘ü┘ê┘å ╪º┘ä╪╣┘à┘è┘ä..." className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && searchCustomer()} />
            <button onClick={searchCustomer} disabled={searching} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} ╪¿╪¡╪½
            </button>
          </div>

          {foundCustomer && (
            <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold">
                  {(foundCustomer.firstName || "╪ƒ").charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{foundCustomer.firstName} {foundCustomer.lastName}</p>
                  <p className="text-sm text-gray-500" dir="ltr">{foundCustomer.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">╪╖╪▒┘è┘é╪⌐ ╪¡╪│╪º╪¿ ┘ç╪░╪º ╪º┘ä╪╣┘à┘è┘ä</label>
                  <select value={overrideMethod} onChange={(e) => setOverrideMethod(e.target.value)} className={inputCls + " mt-1"}>
                    <option value="">╪º┘ü╪¬╪▒╪º╪╢┘è ╪º┘ä╪┤╪▒┘â╪⌐</option>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={overrideBenefits.freeShipping} onChange={(e) => setOverrideBenefits(b => ({ ...b, freeShipping: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                  ╪┤╪¡┘å ┘à╪¼╪º┘å┘è
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={overrideBenefits.priorityShipping} onChange={(e) => setOverrideBenefits(b => ({ ...b, priorityShipping: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                  ╪┤╪¡┘å ╪│╪▒┘è╪╣ / ╪ú┘ê┘ä┘ê┘è╪⌐
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="whitespace-nowrap">╪«╪╡┘à %</span>
                  <input type="number" min="0" max="100" value={overrideBenefits.discountPercent} onChange={(e) => setOverrideBenefits(b => ({ ...b, discountPercent: Number(e.target.value) }))} className={inputCls} />
                </div>
                <input value={overrideBenefits.customText} onChange={(e) => setOverrideBenefits(b => ({ ...b, customText: e.target.value }))} placeholder="┘à┘è╪▓╪⌐ ┘à╪«╪╡╪╡╪⌐..." className={inputCls} />
              </div>
              <button onClick={saveOverride} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ╪¡┘ü╪╕ ┘à╪▓╪º┘è╪º ╪º┘ä╪╣┘à┘è┘ä
              </button>
              {activated && (
                <button onClick={activateTiers} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} ╪Ñ╪╣╪º╪»╪⌐ ╪¬╪╖╪¿┘è┘é ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ╪╣┘ä┘ë ┘â┘ä ╪º┘ä╪╣┘à┘ä╪º╪í
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TierConfigTab;
