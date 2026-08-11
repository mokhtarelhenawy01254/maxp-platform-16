import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import AutoDiscountSettings from "./AutoDiscountSettings";
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
  Users,
  Clock,
  Coins,
  CheckCircle,
  Info,
} from "lucide-react";

// بطاقة إحصائية صغيرة لقسم تحليل بيانات النظام
function AnalyticsStat({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "amber" | "indigo" | "emerald" | "purple" | "sky" | "gray";
}) {
  const colorCls: Record<string, string> = {
    amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    sky: "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
    gray: "bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400",
  };
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800/60">
      <div className="flex items-center justify-between mb-2">
        <span className={`h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 ${colorCls[color]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">{label}</p>
      {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

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

interface AutoDiscountAnalytics {
  system: "AUTO_DISCOUNT";
  totalDeliveredOrders: number;
  appliedCustomers: number;
  waitingForDelivery: number;
  activeVouchers: number;
  usedVouchers: number;
  convertedVouchers: number;
  expiredVouchers: number;
  preActivationCustomers: number;
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

type SystemAnalytics = AutoDiscountAnalytics | TiersAnalytics | null;

const METHODS = [
  { value: "POINTS", label: "بالنقاط", hint: "الحدود بالنقاط" },
  { value: "SPENT", label: "بالفلوس المدفوعة", hint: "الحدود بالمبلغ (ج.م)" },
  { value: "ITEMS", label: "بعدد القطع", hint: "الحدود بعدد القطع" },
  { value: "ORDER_COUNT", label: "بعدد الأوردرات", hint: "الحدود بعدد الأوردرات" },
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

// ── Range helpers (تحديد الحدود حسب طريقة الحساب) ──────────────────
const rangeFields = (calcType: string) => {
  const c = calcType || "POINTS";
  if (c === "SPENT") return { minKey: "minSpent", maxKey: "maxSpent", unit: "ج.م" };
  if (c === "ITEMS" || c === "ORDER_COUNT") return { minKey: "minItems", maxKey: "maxItems", unit: c === "ORDER_COUNT" ? "أوردر" : "قطعة" };
  return { minKey: "minPoints", maxKey: "maxPoints", unit: "نقطة" };
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
  if (isRangeEmpty({ min, max })) return "لم يتم تحديد الحدود بعد";
  const minTxt = min === null ? `من 0 ${unit}` : `من ${min.toLocaleString("ar-EG")} ${unit}`;
  const maxTxt = max === null ? "فما فوق" : `إلى ${max.toLocaleString("ar-EG")} ${unit}`;
  return `${minTxt} — ${maxTxt}`;
};

// فحص التكرار/التداخل بين حدود المستويات
const validateRangeConflicts = (tier: TierItem, allTiers: TierItem[]): string => {
  const { min, max } = extractRange(tier);
  if (!isRangeEmpty({ min, max }) && min !== null && max !== null && min > max) {
    return "الحد الأدنى أكبر من الحد الأقصى";
  }
  if (isRangeEmpty({ min, max })) return "";
  for (const other of allTiers) {
    if (other.id === tier.id) continue;
    if ((other.calculationType || "POINTS") !== (tier.calculationType || "POINTS")) continue;
    const oRange = extractRange(other);
    if (isRangeEmpty(oRange)) continue;
    if (oRange.min === min && oRange.max === max) {
      return `يوجد مستوى آخر ("${other.nameAr || other.name}") بنفس الحد الأدنى والأقصى`;
    }
    if (rangesOverlap(oRange, { min, max })) {
      return `حدود هذا المستوى تتداخل مع حدود مستوى آخر ("${other.nameAr || other.name}")`;
    }
  }
  return "";
};

const TierConfigTab: React.FC = () => {
  const [system, setSystem] = useState<string>("TIERS");
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);
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
      setErrorMsg(e.response?.data?.error || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  useEffect(() => { if (programId) loadConfig(programId); }, [programId, loadConfig]);

  // تحميل نظام الولاء الحالي (المستويات أو الخصم التلقائي)
  useEffect(() => {
    let cancelled = false;
    apiClient.get("/hr/customer-loyalty/system-settings")
      .then((res) => {
        if (cancelled) return;
        const s = res.data?.data?.loyaltySystem || "TIERS";
        setSystem(s);
        setActiveSystem(s);
        setActivated(res.data?.data?.activated === true);
      })
      .catch(() => {
        if (cancelled) return;
        setSystem("TIERS");
        setActiveSystem("TIERS");
        setActivated(false);
      })
      .finally(() => {
        if (!cancelled) setSystemLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // تبديل نظام الولاء + حفظه فوراً + تحديث البار من غير ريفريش
  const switchSystem = async (s: string) => {
    if (s === system) return;
    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");
    try {
      // لو اخترنا النظام التاني، شيل تفعيل النظام الحالي (activated: false)
      const res = await apiClient.put("/hr/customer-loyalty/system-settings", { system: s, activated: false });
      setSystem(s);
      setActiveSystem(s);
      setActivated(res.data?.data?.activated === true);
      setSavedMsg(`تم اختيار ${s === "AUTO_DISCOUNT" ? "نظام الخصم التلقائي" : "نظام المستويات"} — اضغط "تفعيل النظام" لبدء العمل ✓`);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل تبديل النظام");
    } finally {
      setSaving(false);
    }
  };

  // تفعيل نظام المستويات: يحفظ طريقة الحساب + كل المستويات + يفعل النظام + يطبقه على كل العملاء فوراً
  const activateTiers = async () => {
    if (!programId) {
      setErrorMsg("اختر برنامج الولاء أولاً");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");
    try {
      // 1) حفظ طريقة الحساب الافتراضية
      await apiClient.put("/hr/customer-loyalty/tier-config", { programId, defaultTierMethod: defaultMethod });

      // 2) حفظ كل المستويات (تعديلات مفتوحة + الموجودين) تلقائياً
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

      // 3) تفعيل نظام المستويات (الضغط على "تفعيل النظام") → باك إند بيطبقه على كل العملاء
      const res = await apiClient.put("/hr/customer-loyalty/system-settings", { system: "TIERS", activated: true });
      setSystem("TIERS");
      setActiveSystem("TIERS");
      setActivated(true);
      const activation = res.data?.activation;
      const appliedTxt = activation ? ` — اتطبق على ${activation.enrolled || 0} عميل جديد + ${activation.updated || 0} عميل` : "";
      setSavedMsg(`تم تفعيل نظام المستويات ✓${appliedTxt}`);
      await loadConfig(programId);
      await loadAnalytics();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "فشل تفعيل نظام المستويات");
    } finally {
      setSaving(false);
    }
  };

  // بعد حفظ إعدادات الخصم التلقائي من جواه، حدّث النظام المفعّل في البار فوراً
  const handleAutoDiscountSaved = (data?: any) => {
    if (data?.loyaltySystem) {
      setActiveSystem(data.loyaltySystem);
      setSystem(data.loyaltySystem);
    }
    setActivated(data?.activated === true);
  };  // ── تحليلات نظام الولاء الحالي (خصم تلقائي أو مستويات) ──
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
        nameAr: "مستوى جديد",
        calculationType: defaultMethod,
        minPoints: null,
        maxPoints: null,
        benefits: emptyBenefits,
        priority: tiers.length + 1,
      };
      const res = await apiClient.post("/hr/customer-loyalty/tiers", newTier);
      const createdId = res.data?.data?.id || res.data?.id;
      setSavedMsg("تم إضافة مستوى جديد ✓");
      await loadConfig(programId);
      if (createdId) setExpandedTierId(createdId);
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
      if (expandedTierId === id) setExpandedTierId(null);
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

  const renderBenefitsChips = (b: any) => {
    const chips: string[] = [];
    if (b?.freeShipping) chips.push("شحن مجاني");
    if (b?.priorityShipping) chips.push("شحن سريع");
    if (Number(b?.discountPercent || 0) > 0) chips.push(`خصم ${b.discountPercent}%`);
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">إعدادات المستويات</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">طريقة حساب مستوى العميل + مزايا كل مستوى + مزايا مخصصة لكل عميل</p>
          </div>
        </div>
        {savedMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{savedMsg}</span>}
        {errorMsg && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{errorMsg}</span>}
      </div>

      {/* تحليلات النظام المفعّل */}
      {activeSystem && (
        <div className={`rounded-lg border p-4 ${activeSystem === "AUTO_DISCOUNT" ? "border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10" : "border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">تحليل بيانات {activeSystem === "AUTO_DISCOUNT" ? "نظام الخصم التلقائي" : "المستويات"}</h4>
            </div>
            {analyticsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {analyticsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: activeSystem === "AUTO_DISCOUNT" ? 6 : 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse" />
              ))}
            </div>
          ) : analytics?.system === "AUTO_DISCOUNT" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <AnalyticsStat
                label="العملاء اللي اتطبق عليهم النظام"
                value={analytics.appliedCustomers ?? 0}
                sub={`${analytics.totalDeliveredOrders ?? 0} أوردر مسلّم`}
                icon={Users}
                color="amber"
              />
              <AnalyticsStat
                label="في انتظار استلام الأوردر"
                value={analytics.waitingForDelivery ?? 0}
                sub="الخصم هيتفعل بعد التسليم"
                icon={Clock}
                color="indigo"
              />
              <AnalyticsStat
                label="في مرحلة الخصم (كوبون فعّال)"
                value={analytics.activeVouchers ?? 0}
                icon={Zap}
                color="emerald"
              />
              <AnalyticsStat
                label="اتحوّل لكاش باك"
                value={analytics.convertedVouchers ?? 0}
                sub="كوبون انتهى من غير استخدام"
                icon={Coins}
                color="purple"
              />
              <AnalyticsStat
                label="كوبونات مستخدمة فعلياً"
                value={analytics.usedVouchers ?? 0}
                icon={CheckCircle}
                color="sky"
              />
              <AnalyticsStat
                label="طلبات قبل التفعيل (متفعّلش النظام عليهم)"
                value={analytics.preActivationCustomers ?? 0}
                sub="عملوا أوردر مسلّم قبل تفعيل النظام"
                icon={Info}
                color="gray"
              />
            </div>
          ) : analytics?.system === "TIERS" ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  <p className="text-xl font-bold">{analytics.totalEnrolled ?? 0}</p>
                  <p className="text-xs">إجمالي العملاء المسجلين في نظام الولاء</p>
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
                      <p className="text-xs text-gray-500">عميل في هذا المستوى</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-3 text-center">لا توجد مستويات بعد — أضف مستوى لعرض تحليل العملاء.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">لا توجد بيانات تحليل بعد.</p>
          )}
        </div>
      )}

      {/* محدد نظام الولاء */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نظام الولاء</label>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => switchSystem("TIERS")}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${system === "TIERS" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"}`}
          >
            نظام المستويات
          </button>
          <button
            onClick={() => switchSystem("AUTO_DISCOUNT")}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${system === "AUTO_DISCOUNT" ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"}`}
          >
            الخصم التلقائي
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">تفعيل أحد النظامين يوقف الآخر تلقائياً</p>
      </div>

      {systemLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : system === "AUTO_DISCOUNT" ? (
        <AutoDiscountSettings onSaved={handleAutoDiscountSaved} />
      ) : (
      <>
      {/* طريقة الحساب الافتراضية + تفعيل النظام */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">طريقة الحساب الافتراضية للشركة</label>
            <select value={defaultMethod} onChange={(e) => setDefaultMethod(e.target.value)} className={inputCls + " mt-1"}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">لو العميل ملوش طريقة مخصصة، بيتم حسابه بالطريقة دي — وبتتحفظ تلقائياً عند التفعيل.</p>
          </div>
          <button
            onClick={activateTiers}
            disabled={saving || activated}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activated
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : activated ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {activated ? "تم التفعيل" : "تفعيل النظام"}
          </button>
        </div>
        {activated && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            نظام المستويات مفعّل — الإعدادات بتتحفظ أوتوماتيكياً مع أي تعديل، والمستويات مطبّقة على العملاء.
          </p>
        )}
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
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{tier.nameAr || tier.name || "مستوى بدون اسم"}</p>
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
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} تعديل
                    </button>
                    <button onClick={() => deleteTier(tier.id)} disabled={saving} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expanded edit form */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <input value={tier.nameAr || ""} onChange={(e) => updateTierField(tier.id, "nameAr", e.target.value)} placeholder="الاسم بالعربي" className={inputCls + " !w-44"} />
                        <input value={tier.name || ""} onChange={(e) => updateTierField(tier.id, "name", e.target.value)} placeholder="الاسم (en)" className={inputCls + " !w-44"} />
                        <select value={tier.calculationType} onChange={(e) => updateTierField(tier.id, "calculationType", e.target.value)} className={inputCls + " !w-52"}>
                          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input type="color" value={tier.color || "#6366f1"} onChange={(e) => updateTierField(tier.id, "color", e.target.value)} className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600" title="اللون" />
                        <div className="flex-1" />
                        <button onClick={() => setExpandedTierId(null)} className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg text-sm whitespace-nowrap">
                          <X className="h-4 w-4" /> إغلاق
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
                        {(tier.calculationType === "ITEMS" || tier.calculationType === "ORDER_COUNT") && (
                          <>
                            <div><label className="text-xs text-gray-500">الحد الأدنى ({tier.calculationType === "ORDER_COUNT" ? "أوردرات" : "قطع"})</label><input type="number" value={tier.minItems ?? ""} onChange={(e) => updateTierField(tier.id, "minItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
                            <div><label className="text-xs text-gray-500">الحد الأقصى ({tier.calculationType === "ORDER_COUNT" ? "أوردرات" : "قطع"})</label><input type="number" value={tier.maxItems ?? ""} onChange={(e) => updateTierField(tier.id, "maxItems", e.target.value === "" ? null : Number(e.target.value))} className={inputCls + " mt-1"} /></div>
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

                      <div className="flex items-center gap-2">
                        {validateRangeConflicts(tier, tiers) && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">{validateRangeConflicts(tier, tiers)}</span>
                        )}
                        {!validateRangeConflicts(tier, tiers) && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">التعديلات دي بتتحفظ تلقائياً عند الضغط على "تفعيل النظام".</span>
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
              {activated && (
                <button onClick={activateTiers} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} إعادة تطبيق المستويات على كل العملاء
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default TierConfigTab;
