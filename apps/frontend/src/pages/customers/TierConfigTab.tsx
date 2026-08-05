import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Settings,
  Save,
  RefreshCw,
  Search,
  User,
  Crown,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
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

const METHODS = [
  { value: "POINTS", label: "بالنقاط", hint: "الحدود بالنقاط" },
  { value: "SPENT", label: "بالفلوس المدفوعة", hint: "الحدود بالمبلغ (ج.م)" },
  { value: "ITEMS", label: "بعدد القطع", hint: "الحدود بعدد القطع" },
];

const emptyBenefits = { freeShipping: false, discountPercent: 0, priorityShipping: false, customText: "" };

const normalizeBenefits = (b: any) => {
  if (!b) return { ...emptyBenefits };
  if (Array.isArray(b)) return { ...emptyBenefits, customText: b.join("، ") };
  return {
    freeShipping: Boolean(b.freeShipping),
    discountPercent: Number(b.discountPercent || 0),
    priorityShipping: Boolean(b.priorityShipping),
    customText: b.customText || "",
  };
};

const TierConfigTab: React.FC = () => {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [programId, setProgramId] = useState<string>("");
  const [defaultMethod, setDefaultMethod] = useState<string>("POINTS");
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
      setErrorMsg(e.response?.data?.error || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  useEffect(() => { if (programId) loadConfig(programId); }, [programId, loadConfig]);

  const saveDefaultMethod = async () => {
    if (!programId) return;
    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");
    try {
      await apiClient.put("/hr/customer-loyalty/tier-config", { programId, defaultTierMethod: defaultMethod });
      setSavedMsg("تم حفظ طريقة الحساب الافتراضية ✓");
      loadConfig(programId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const updateTierField = (id: string, field: keyof TierItem, value: any) => {
    setTiers(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const updateTierBenefits = (id: string, field: string, value: any) => {
    setTiers(prev => prev.map(t => (t.id === id ? { ...t, benefits: { ...t.benefits, [field]: value } } : t)));
  };

  const saveTier = async (tier: TierItem) => {
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    try {
      await apiClient.put(`/hr/customer-loyalty/tiers/${tier.id}`, {
        name: tier.name,
        nameAr: tier.nameAr,
        calculationType: tier.calculationType,
        minPoints: tier.calculationType === "POINTS" ? tier.minPoints : null,
        maxPoints: tier.calculationType === "POINTS" ? tier.maxPoints : null,
        minSpent: tier.calculationType === "SPENT" ? tier.minSpent : null,
        maxSpent: tier.calculationType === "SPENT" ? tier.maxSpent : null,
        minItems: tier.calculationType === "ITEMS" ? tier.minItems : null,
        maxItems: tier.calculationType === "ITEMS" ? tier.maxItems : null,
        benefits: tier.benefits,
        color: tier.color,
        priority: tier.priority,
      });
      setSavedMsg(`تم حفظ مستوى "${tier.nameAr || tier.name}" ✓`);
      loadConfig(programId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل حفظ المستوى");
    } finally {
      setSaving(false);
    }
  };

  const createTier = async () => {
    if (!programId) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const newTier: any = {
        programId,
        name: "New Tier",
        nameAr: "مستوى جديد",
        calculationType: defaultMethod,
        minPoints: 0,
        maxPoints: null,
        benefits: emptyBenefits,
        priority: tiers.length + 1,
      };
      await apiClient.post("/hr/customer-loyalty/tiers", newTier);
      setSavedMsg("تم إضافة مستوى جديد ✓");
      loadConfig(programId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل إضافة المستوى");
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (id: string) => {
    if (!window.confirm("حذف هذا المستوى؟")) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await apiClient.delete(`/hr/customer-loyalty/tiers/${id}`);
      setSavedMsg("تم حذف المستوى ✓");
      loadConfig(programId);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل حذف المستوى");
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
        setErrorMsg("لا يوجد عميل بهذا الرقم");
        return;
      }
      const override = await apiClient.get(`/hr/customer-loyalty/customers/${match.id}/tier-override`);
      const o = override.data?.data;
      setFoundCustomer(o);
      setOverrideMethod(o?.tierMethod || "");
      setOverrideBenefits(normalizeBenefits(o?.tierBenefits));
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل البحث عن العميل");
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
      setSavedMsg("تم حفظ مزايا العميل ✓");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل حفظ مزايا العميل");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">إعدادات المستويات</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">طريقة حساب مستوى العميل + مزايا كل مستوى + مزايا مخصصة لكل عميل</p>
          </div>
        </div>
        {savedMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{savedMsg}</span>}
        {errorMsg && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{errorMsg}</span>}
      </div>

      {/* Program selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">برنامج الولاء</label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className={inputCls + " mt-2"}>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">طريقة الحساب الافتراضية للشركة</label>
          <div className="flex gap-2 mt-2">
            <select value={defaultMethod} onChange={(e) => setDefaultMethod(e.target.value)} className={inputCls}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button onClick={saveDefaultMethod} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">لو العميل ملوش طريقة مخصصة، بيتم حسابه بالطريقة دي</p>
        </div>
      </div>

      {/* Tiers list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">المستويات</h4>
          <button onClick={createTier} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
            <Plus className="h-4 w-4" /> مستوى جديد
          </button>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tiers.length === 0 && <p className="p-6 text-gray-500 text-center">لا توجد مستويات — أضف مستوى جديد</p>}
            {tiers.map(tier => (
              <div key={tier.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input value={tier.nameAr || ""} onChange={(e) => updateTierField(tier.id, "nameAr", e.target.value)} placeholder="الاسم بالعربي" className={inputCls + " !w-44"} />
                  <input value={tier.name || ""} onChange={(e) => updateTierField(tier.id, "name", e.target.value)} placeholder="الاسم (en)" className={inputCls + " !w-44"} />
                  <select value={tier.calculationType} onChange={(e) => updateTierField(tier.id, "calculationType", e.target.value)} className={inputCls + " !w-52"}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <input type="color" value={tier.color || "#6366f1"} onChange={(e) => updateTierField(tier.id, "color", e.target.value)} className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600" title="اللون" />
                  <div className="flex-1" />
                  <button onClick={() => saveTier(tier)} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                    <Save className="h-4 w-4" /> حفظ
                  </button>
                  <button onClick={() => deleteTier(tier.id)} disabled={saving} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Thresholds */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tier.calculationType === "POINTS" && (
                    <>
                      <div><label className="text-xs text-gray-500">الحد الأدنى (نقاط)</label><input type="number" value={tier.minPoints ?? ""} onChange={(e) => updateTierField(tier.id, "minPoints", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                      <div><label className="text-xs text-gray-500">الحد الأقصى (نقاط)</label><input type="number" value={tier.maxPoints ?? ""} onChange={(e) => updateTierField(tier.id, "maxPoints", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                    </>
                  )}
                  {tier.calculationType === "SPENT" && (
                    <>
                      <div><label className="text-xs text-gray-500">الحد الأدنى (ج.م)</label><input type="number" value={tier.minSpent ?? ""} onChange={(e) => updateTierField(tier.id, "minSpent", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                      <div><label className="text-xs text-gray-500">الحد الأقصى (ج.م)</label><input type="number" value={tier.maxSpent ?? ""} onChange={(e) => updateTierField(tier.id, "maxSpent", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                    </>
                  )}
                  {tier.calculationType === "ITEMS" && (
                    <>
                      <div><label className="text-xs text-gray-500">الحد الأدنى (قطع)</label><input type="number" value={tier.minItems ?? ""} onChange={(e) => updateTierField(tier.id, "minItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                      <div><label className="text-xs text-gray-500">الحد الأقصى (قطع)</label><input type="number" value={tier.maxItems ?? ""} onChange={(e) => updateTierField(tier.id, "maxItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                    </>
                  )}
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input type="checkbox" checked={Boolean(tier.benefits?.freeShipping)} onChange={(e) => updateTierBenefits(tier.id, "freeShipping", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                    شحن مجاني
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input type="checkbox" checked={Boolean(tier.benefits?.priorityShipping)} onChange={(e) => updateTierBenefits(tier.id, "priorityShipping", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                    شحن سريع / أولوية
                  </label>
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className="whitespace-nowrap">خصم %</span>
                    <input type="number" min="0" max="100" value={tier.benefits?.discountPercent ?? 0} onChange={(e) => updateTierBenefits(tier.id, "discountPercent", Number(e.target.value))} className={inputCls} />
                  </div>
                  <input value={tier.benefits?.customText || ""} onChange={(e) => updateTierBenefits(tier.id, "customText", e.target.value)} placeholder="ميزة مخصصة..." className={inputCls} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-customer override */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">مزايا / طريقة حساب لعميل محدد</h4>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input value={phoneQuery} onChange={(e) => setPhoneQuery(e.target.value)} placeholder="اكتب رقم تليفون العميل..." className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && searchCustomer()} />
            <button onClick={searchCustomer} disabled={searching} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} بحث
            </button>
          </div>

          {foundCustomer && (
            <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold">
                  {(foundCustomer.firstName || "؟").charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{foundCustomer.firstName} {foundCustomer.lastName}</p>
                  <p className="text-sm text-gray-500" dir="ltr">{foundCustomer.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">طريقة حساب هذا العميل</label>
                  <select value={overrideMethod} onChange={(e) => setOverrideMethod(e.target.value)} className={inputCls + " mt-1"}>
                    <option value="">افتراضي الشركة</option>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={overrideBenefits.freeShipping} onChange={(e) => setOverrideBenefits(b => ({ ...b, freeShipping: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                  شحن مجاني
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={overrideBenefits.priorityShipping} onChange={(e) => setOverrideBenefits(b => ({ ...b, priorityShipping: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                  شحن سريع / أولوية
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="whitespace-nowrap">خصم %</span>
                  <input type="number" min="0" max="100" value={overrideBenefits.discountPercent} onChange={(e) => setOverrideBenefits(b => ({ ...b, discountPercent: Number(e.target.value) }))} className={inputCls} />
                </div>
                <input value={overrideBenefits.customText} onChange={(e) => setOverrideBenefits(b => ({ ...b, customText: e.target.value }))} placeholder="ميزة مخصصة..." className={inputCls} />
              </div>
              <button onClick={saveOverride} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ مزايا العميل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TierConfigTab;
