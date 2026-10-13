import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon, PencilIcon, TrashIcon, TagIcon, FolderIcon, SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  Users, Star, Shield, TrendingUp, AlertTriangle, Search, Crown, Medal, Gem, Trophy,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import analyticsService from "../../services/analyticsService";
import { useCurrency } from "../../hooks/useCurrency";

// ── Shared Types ────────────────────────────────────
interface LeadCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  autoFollowUp: boolean;
  autoPromoteCategoryId: string | null;
  triggerFlowId: string | null;
  triggerFlow: { id: string; name: string; isEnabled: boolean } | null;
  contactCount: number;
  activeJourneyCount: number;
}

interface Flow {
  id: string;
  name: string;
  isEnabled: boolean;
}

interface TagItem {
  name: string;
  count: number;
}

interface QualityCustomer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  totalSpent: number;
  score: number;
  tier: string;
}

interface QualityAnalytics {
  customers: QualityCustomer[];
  totalCustomers: number;
  tierCounts: Record<string, number>;
  avgCustomerScore: string;
}

interface LoyaltyRecord {
  id: string;
  customer: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  program: { id: string; name: string; nameAr?: string };
  tier: { id: string; name: string; nameAr?: string } | null;
  currentPoints: number | string;
  totalEarned: number | string;
  totalRedeemed: number | string;
  lastActivity: string;
  status: string;
}

interface LoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  minPoints: number;
  maxPoints?: number | null;
  benefits: string[];
  color: string;
  icon: string;
  customersCount: number;
  programId: string;
}

interface CustomerBasic {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags: string[] | string;
  status: string;
  customerRating?: string;
  successScore?: number;
}

const parseTags = (tags: string[] | string | null | undefined): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags); } catch { return []; }
};

interface UnifiedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualityTier: string;
  qualityScore: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  rating: string;
  tags: string[];
  status: string;
  totalSpent: number;
  totalOrders: number;
}

const TIER_COLORS: Record<string, string> = {
  VIP: "#8B5CF6",
  عالي: "#3B82F6",
  متوسط: "#F59E0B",
  منخفض: "#EF4444",
};

const QUALITY_TIER_ORDER = ["VIP", "عالي", "متوسط", "منخفض"];

const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Color presets for categories ───────────────────
const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280",
];

// ── Sub-components ──────────────────────────────────
const QualityTierBadge = ({ tier }: { tier: string }) => {
  const color = TIER_COLORS[tier] || "#6B7280";
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color + "20", color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {tier}
    </span>
  );
};

const RatingBadge = ({ rating }: { rating?: string }) => {
  if (!rating || rating === "UNKNOWN") return <span className="text-xs text-gray-400">-</span>;
  const colors: Record<string, string> = {
    EXCELLENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    GOOD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    AVERAGE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    BAD: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[rating] || ""}`}>
      {rating === "EXCELLENT" ? "★★★★★" : rating === "GOOD" ? "★★★★" : rating === "AVERAGE" ? "★★★" : "★★"}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 ${onClick ? "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all" : ""}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: color + "20" }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</p>
  </div>
);

const UnifiedTableRow = ({ c, isSelected, onSelect }: { c: UnifiedCustomer; isSelected: boolean; onSelect: () => void }) => (
  <tr
    onClick={onSelect}
    className={`cursor-pointer transition-colors ${isSelected ? "bg-slate-100/80 dark:bg-slate-800/80" : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"} border-b border-gray-100 dark:border-gray-800/80 last:border-0`}
  >
    <td className="py-2.5 px-4">
      <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">{c.name}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">{c.phone || c.email || "-"}</p>
    </td>
    <td className="py-2.5 px-4"><QualityTierBadge tier={c.qualityTier} /></td>
    <td className="py-2.5 px-4">
      <span className="text-xs font-semibold" style={{ color: c.loyaltyTier ? "#8B5CF6" : "#9CA3AF" }}>
        {c.loyaltyTier || "-"}
      </span>
    </td>
    <td className="py-2.5 px-4"><RatingBadge rating={c.rating} /></td>
    <td className="py-2.5 px-4 text-xs sm:text-sm font-bold font-mono tabular-nums text-gray-900 dark:text-white" dir="ltr">
      {c.loyaltyPoints > 0 ? c.loyaltyPoints.toLocaleString() : "-"}
    </td>
    <td className="py-2.5 px-4">
      <div className="flex gap-1 flex-wrap">
        {c.tags.slice(0, 3).map(t => (
          <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700">{t}</span>
        ))}
        {c.tags.length > 3 && <span className="text-[10px] text-gray-400 font-mono">+{c.tags.length - 3}</span>}
      </div>
    </td>
    <td className="py-2.5 px-4">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
        c.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300" :
        c.status === "VIP" ? "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-300" :
        c.status === "LEAD" ? "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300" :
        c.status === "BLOCKED" ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300" :
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          c.status === "ACTIVE" ? "bg-emerald-500" :
          c.status === "VIP" ? "bg-purple-500" :
          c.status === "LEAD" ? "bg-blue-500" :
          c.status === "BLOCKED" ? "bg-rose-500" : "bg-gray-400"
        }`} />
        {c.status}
      </span>
    </td>
  </tr>
);

// ── Main Component ─────────────────────────────────
const CustomerSegments: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  // ── Tab state ─────────────────────────────────
  const [activeTab, setActiveTab] = useState<"overview" | "quality" | "loyalty" | "categories" | "tags">("overview");

  const tabs = [
    { key: "overview" as const, label: "الرئيسية", icon: TrendingUp },
    { key: "quality" as const, label: "الجودة", icon: Shield },
    { key: "loyalty" as const, label: "الولاء", icon: Star },
    { key: "categories" as const, label: "تصنيفات الليدات", icon: FolderIcon },
    { key: "tags" as const, label: "الوسوم", icon: TagIcon },
  ];

  // ── Data state ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityAnalytics | null>(null);
  const [loyaltyRecords, setLoyaltyRecords] = useState<LoyaltyRecord[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // ── Filters ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQuality, setFilterQuality] = useState("ALL");
  const [filterLoyalty, setFilterLoyalty] = useState("ALL");
  const [filterRating, setFilterRating] = useState("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // ── Load all data ────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qualityRes, loyaltyRes, tiersRes, customersRes] = await Promise.all([
        analyticsService.getCustomerQualityAnalytics().catch(() => null),
        apiClient.get("/hr/customer-loyalty/customers", { timeout: 5000 }).catch(() => ({ data: { data: [] } })),
        apiClient.get("/hr/customer-loyalty/tiers").catch(() => ({ data: { data: [] } })),
        apiClient.get("/customers?limit=200").catch(() => ({ data: { data: [] } })),
      ]);

      if (qualityRes?.success) {
        setQualityData({
          customers: qualityRes.data.customers || [],
          totalCustomers: qualityRes.data.totalCustomers || 0,
          tierCounts: qualityRes.data.tierCounts || {},
          avgCustomerScore: qualityRes.data.avgCustomerScore || "0",
        });
      }
      setLoyaltyRecords(loyaltyRes.data?.data || []);
      setLoyaltyTiers(tiersRes.data?.data || []);
      setCustomers(customersRes.data?.data || []);
    } catch (err) {
      console.error("Error loading segmentation data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Load categories (existing) ──────────────
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState("");
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError("");
    try {
      const res = await apiClient.get("/whatsapp/lead-categories");
      setCategories(res.data?.data || []);
    } catch (err: any) {
      setCatError(err.response?.data?.message || "فشل تحميل التصنيفات");
    } finally {
      setCatLoading(false);
    }
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ── Load tags (existing) ────────────────────
  const [tagsLoading, setTagsLoading] = useState(true);
  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const res = await apiClient.get("/customers/tags/distinct");
      setTags(res.data?.data || []);
    } catch (_) {} finally { setTagsLoading(false); }
  }, []);
  useEffect(() => { loadTags(); }, [loadTags]);

  // ── Unified customer list ───────────────────
  const unifiedCustomers = useMemo((): UnifiedCustomer[] => {
    if (!customers.length) return [];

    const qualityMap = new Map<string, QualityCustomer>();
    (qualityData?.customers || []).forEach(q => qualityMap.set(q.customerId, q));

    const loyaltyMap = new Map<string, LoyaltyRecord>();
    loyaltyRecords.forEach(r => loyaltyMap.set(r.customer.id, r));

    const joined: UnifiedCustomer[] = customers.map(c => {
      const q = qualityMap.get(c.id);
      const l = loyaltyMap.get(c.id);
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim() || c.phone || c.email || "---",
        email: c.email || "",
        phone: c.phone || "",
        qualityTier: q?.tier || "منخفض",
        qualityScore: q?.score || 0,
        loyaltyTier: l?.tier?.nameAr || l?.tier?.name || "",
        loyaltyPoints: toNumber(l?.currentPoints || 0),
        rating: c.customerRating || "UNKNOWN",
        tags: parseTags(c.tags),
        status: c.status,
        totalSpent: q?.totalSpent || 0,
        totalOrders: q?.totalOrders || 0,
      };
    });

    return joined.filter(c => c.totalOrders > 0 || c.loyaltyPoints > 0 || c.tags.length > 0);
  }, [customers, qualityData, loyaltyRecords]);

  // ── Filtered list ──────────────────────────
  const filteredCustomers = useMemo(() => {
    let result = unifiedCustomers;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (filterQuality !== "ALL") result = result.filter(c => c.qualityTier === filterQuality);
    if (filterLoyalty !== "ALL") result = result.filter(c => (filterLoyalty === "NONE" ? !c.loyaltyTier : c.loyaltyTier === filterLoyalty));
    if (filterRating !== "ALL") result = result.filter(c => c.rating === filterRating);
    return result.sort((a, b) => b.qualityScore - a.qualityScore);
  }, [unifiedCustomers, searchQuery, filterQuality, filterLoyalty, filterRating]);

  const selectedCustomer = useMemo(
    () => filteredCustomers.find(c => c.id === selectedCustomerId) || null,
    [filteredCustomers, selectedCustomerId],
  );

  // ── Aggregate stats ─────────────────────────
  const stats = useMemo(() => ({
    total: unifiedCustomers.length,
    vipCount: unifiedCustomers.filter(c => c.qualityTier === "VIP").length,
    highCount: unifiedCustomers.filter(c => c.qualityTier === "عالي").length,
    medCount: unifiedCustomers.filter(c => c.qualityTier === "متوسط").length,
    lowCount: unifiedCustomers.filter(c => c.qualityTier === "منخفض").length,
    loyaltyMembers: loyaltyRecords.filter(r => r.status === "ACTIVE").length,
    excellentCount: unifiedCustomers.filter(c => c.rating === "EXCELLENT").length,
    atRiskCount: unifiedCustomers.filter(c => c.qualityTier === "منخفض").length,
    totalPoints: loyaltyRecords.reduce((s, r) => s + toNumber(r.currentPoints), 0),
  }), [unifiedCustomers, loyaltyRecords]);

  // ── Existing Category/Tag state ─────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<LeadCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catAutoFollowUp, setCatAutoFollowUp] = useState(true);
  const [catTriggerFlowId, setCatTriggerFlowId] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    apiClient.get("/whatsapp/automation/flows").then(r => {
      setFlows(r.data?.data || []);
    }).catch(() => {});
  }, []);

  const resetCatForm = () => {
    setShowCatForm(false); setEditingCat(null); setCatName(""); setCatColor("#6366f1"); setCatAutoFollowUp(true); setCatTriggerFlowId("");
  };

  const openEditCat = (cat: LeadCategory) => {
    setEditingCat(cat); setCatName(cat.name); setCatColor(cat.color); setCatAutoFollowUp(cat.autoFollowUp); setCatTriggerFlowId(cat.triggerFlowId || ""); setShowCatForm(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      if (editingCat) {
        await apiClient.put(`/whatsapp/lead-categories/${editingCat.id}`, { name: catName.trim(), color: catColor, autoFollowUp: catAutoFollowUp, triggerFlowId: catTriggerFlowId || null });
      } else {
        await apiClient.post("/whatsapp/lead-categories", { name: catName.trim(), color: catColor, autoFollowUp: catAutoFollowUp, triggerFlowId: catTriggerFlowId || null });
      }
      resetCatForm(); await loadCategories();
    } catch (err: any) { alert(err.response?.data?.message || "فشل حفظ التصنيف"); } finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    try { await apiClient.delete(`/whatsapp/lead-categories/${id}`); await loadCategories(); } catch (err: any) { alert(err.response?.data?.message || "فشل حذف التصنيف"); }
  };

  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagActionLoading, setTagActionLoading] = useState(false);

  const handleRenameTag = async (oldName: string) => {
    if (!newTagName.trim() || newTagName.trim() === oldName) return;
    setTagActionLoading(true);
    try { await apiClient.put("/customers/tags/rename", { oldName, newName: newTagName.trim() }); setRenamingTag(null); setNewTagName(""); await loadTags(); } catch (err: any) { alert(err.response?.data?.message || "فشل إعادة تسمية الوسم"); } finally { setTagActionLoading(false); }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الوسم "${tagName}" من جميع العملاء؟`)) return;
    setTagActionLoading(true);
    try { await apiClient.delete(`/customers/tags/${encodeURIComponent(tagName)}`); await loadTags(); } catch (err: any) { alert(err.response?.data?.message || "فشل حذف الوسم"); } finally { setTagActionLoading(false); }
  };

  // ── Loading ──────────────────────────────────
  if (loading && activeTab !== "categories" && activeTab !== "tags") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">مركز تقسيم العملاء</h1>
            <p className="text-gray-600 dark:text-gray-400">إدارة شاملة لتصنيفات العملاء وجودتهم وولائهم</p>
          </div>
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow dark:shadow-md overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────
  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            مركز تقسيم العملاء
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            إدارة شاملة لتصنيفات العملاء وجودتهم وولائهم
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          تحديث
        </button>
      </div>

      {/* Tabs - Modern Segmented Control */}
      <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 overflow-x-auto shadow-2xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════ TAB: Overview ════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Telemetry Strip - Linear Single Chassis */}
          <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
            <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
              <div className="p-3 sm:p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  <span>إجمالي العملاء</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
                  {stats.total.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                  المتوسط: {qualityData?.avgCustomerScore || 0}
                </div>
              </div>
              <div className="p-3 sm:p-4 flex flex-col justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors" onClick={() => { setFilterQuality("VIP"); setActiveTab("quality"); }}>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  <span>VIP / عالي</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-purple-500" />
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
                  {(stats.vipCount + stats.highCount).toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                  VIP: {stats.vipCount} · عالي: {stats.highCount}
                </div>
              </div>
              <div className="p-3 sm:p-4 flex flex-col justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors" onClick={() => setActiveTab("loyalty")}>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  <span>أعضاء الولاء</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
                  {stats.loyaltyMembers.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono tabular-nums">
                  النقاط: {stats.totalPoints.toLocaleString()}
                </div>
              </div>
              <div className="p-3 sm:p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  <span>عملاء ممتازون</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {stats.excellentCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  تقييم مرتفع
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 sm:p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text" value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSelectedCustomerId(null); }}
                  placeholder="ابحث باسم العميل، إيميل، رقم الهاتف..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-1.5 pl-3 pr-9 text-right text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-gray-400 transition-all"
                />
              </div>
              <select value={filterQuality} onChange={e => setFilterQuality(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer">
                <option value="ALL">كل المستويات (Quality)</option>
                {QUALITY_TIER_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterLoyalty} onChange={e => setFilterLoyalty(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer">
                <option value="ALL">كل مستويات الولاء</option>
                <option value="NONE">بدون مستوى</option>
                {loyaltyTiers.map(t => <option key={t.id} value={t.nameAr || t.name}>{t.nameAr || t.name}</option>)}
              </select>
              <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none cursor-pointer">
                <option value="ALL">كل التقييمات</option>
                <option value="EXCELLENT">ممتاز</option>
                <option value="GOOD">جيد</option>
                <option value="AVERAGE">متوسط</option>
                <option value="BAD">سيء</option>
              </select>
            </div>
            {(searchQuery || filterQuality !== "ALL" || filterLoyalty !== "ALL" || filterRating !== "ALL") && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">النتائج: {filteredCustomers.length} عميل</p>
                <button onClick={() => { setSearchQuery(""); setFilterQuality("ALL"); setFilterLoyalty("ALL"); setFilterRating("ALL"); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                  إلغاء الفلاتر
                </button>
              </div>
            )}
          </div>

          {/* Unified Table */}
          <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200/80 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">مستوى الجودة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">مستوى الولاء</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">التقييم</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">النقاط</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الوسوم</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-gray-500">
                        {searchQuery || filterQuality !== "ALL" || filterLoyalty !== "ALL" || filterRating !== "ALL"
                          ? "لا يوجد عملاء مطابقون للبحث والتصفية."
                          : "لا يوجد عملاء بعد."}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <UnifiedTableRow
                        key={c.id} c={c}
                        isSelected={selectedCustomerId === c.id}
                        onSelect={() => setSelectedCustomerId(selectedCustomerId === c.id ? null : c.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Detail Side Panel */}
          {selectedCustomer && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
                <button onClick={() => setSelectedCustomerId(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">مستوى الجودة</p>
                  <QualityTierBadge tier={selectedCustomer.qualityTier} />
                  <p className="text-xs text-gray-400 mt-1">Score: {selectedCustomer.qualityScore}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">مستوى الولاء</p>
                  <p className="text-sm font-bold text-purple-600">{selectedCustomer.loyaltyTier || "-"}</p>
                  <p className="text-xs text-gray-400 mt-1">{selectedCustomer.loyaltyPoints.toLocaleString("ar-EG")} نقطة</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">التقييم</p>
                  <RatingBadge rating={selectedCustomer.rating} />
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(selectedCustomer.totalSpent)}</p>
                  <p className="text-xs text-gray-400 mt-1">{selectedCustomer.totalOrders} طلب</p>
                </div>
              </div>
              {selectedCustomer.tags.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {selectedCustomer.tags.map(t => (
                    <span key={t} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: Quality ════════════════ */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUALITY_TIER_ORDER.map(tier => {
              const count = stats[tier === "VIP" ? "vipCount" : tier === "عالي" ? "highCount" : tier === "متوسط" ? "medCount" : "lowCount" as keyof typeof stats] as number;
              const color = TIER_COLORS[tier];
              return (
                <div key={tier} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <QualityTierBadge tier={tier} />
                    <span className="text-xs text-gray-400">{((count / Math.max(stats.total, 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-sm text-gray-500">عميل</p>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / Math.max(stats.total, 1)) * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">توزيع مستويات الجودة</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستوى</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الدرجة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الطلبات</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجمالي الإنفاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(qualityData?.customers || [])
                    .filter(c => filterQuality === "ALL" || c.tier === filterQuality)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 100)
                    .map(c => (
                      <tr key={c.customerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{c.customerName}</td>
                        <td className="py-3 px-4"><QualityTierBadge tier={c.tier} /></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: TIER_COLORS[c.tier] || "#6B7280" }} />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{c.score}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{c.totalOrders}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{formatPrice(c.totalSpent)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB: Loyalty ═══════════════ */}
      {activeTab === "loyalty" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Users className="h-5 w-5 text-purple-600" /></div>
              </div>
              <p className="text-sm text-gray-500">أعضاء الولاء النشطون</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.loyaltyMembers}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Star className="h-5 w-5 text-amber-600" /></div>
              </div>
              <p className="text-sm text-gray-500">إجمالي النقاط</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPoints.toLocaleString("ar-EG")}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              </div>
              <p className="text-sm text-gray-500">المستويات المحددة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loyaltyTiers.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              </div>
              <p className="text-sm text-gray-500">مهددون بانتهاء الرصيد</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.atRiskCount}</p>
            </div>
          </div>

          {/* Loyalty Tiers cards */}
          {loyaltyTiers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">مستويات الولاء</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyTiers.map(tier => {
                  const tierIcon = tier.icon === "crown" ? Crown : tier.icon === "medal" ? Medal : tier.icon === "gem" ? Gem : tier.icon === "trophy" ? Trophy : Crown;
                  const memberCount = loyaltyRecords.filter(r => r.tier?.id === tier.id).length;
                  return (
                    <div key={tier.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-lg" style={{ backgroundColor: tier.color + "20", color: tier.color }}>
                          <tierIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{tier.nameAr || tier.name}</p>
                          <p className="text-xs text-gray-500">{memberCount} عضو</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>من {tier.minPoints?.toLocaleString() || 0} نقطة</span>
                        {tier.maxPoints && <span>إلى {tier.maxPoints.toLocaleString()} نقطة</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(memberCount / Math.max(loyaltyRecords.filter(r => r.tier?.id).length, 1)) * 100}%`, backgroundColor: tier.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loyalty Members */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">أعضاء الولاء</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">البرنامج</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستوى</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الرصيد</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loyaltyRecords
                    .sort((a, b) => toNumber(b.currentPoints) - toNumber(a.currentPoints))
                    .slice(0, 50)
                    .map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{r.customer.firstName} {r.customer.lastName}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.program.nameAr || r.program.name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.tier ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "text-gray-400"}`}>
                            {r.tier?.nameAr || r.tier?.name || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white" dir="ltr">{toNumber(r.currentPoints).toLocaleString("ar-EG")}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            r.status === "INACTIVE" ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>{r.status}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{new Date(r.lastActivity).toLocaleDateString("ar-EG")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB: Categories (existing) ═════ */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetCatForm(); setShowCatForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              <PlusIcon className="h-4 w-4 ml-2" /> إضافة تصنيف
            </button>
          </div>
          {showCatForm && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-md border border-indigo-200 dark:border-indigo-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                  <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="اسم التصنيف"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللون</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} onClick={() => setCatColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${catColor === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">متابعة تلقائية</label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={catAutoFollowUp} onChange={(e) => setCatAutoFollowUp(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">تفعيل</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رحلة رسائل تلقائية</label>
                  <select value={catTriggerFlowId} onChange={(e) => setCatTriggerFlowId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">بدون رحلة</option>
                    {flows.filter(f => f.isEnabled).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">عند اختيار تصنيف للعميل، بتتسجل تلقائيًا في الرحلة دي</p>
                </div>
                <div className="flex items-end gap-2 justify-end">
                  <button onClick={resetCatForm} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                  <button onClick={handleSaveCategory} disabled={catSaving || !catName.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">{catSaving ? "جاري الحفظ..." : editingCat ? "تحديث" : "إضافة"}</button>
                </div>
              </div>
            </div>
          )}
          {catLoading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
          {catError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">{catError}</div>}
          {!catLoading && !catError && (
            <div className="bg-white dark:bg-gray-800 shadow dark:shadow-md overflow-hidden sm:rounded-md">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-500">لا توجد تصنيفات بعد</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">التصنيف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">جهات الاتصال</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">في الرحلة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">متابعة تلقائية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الترتيب</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" dir="ltr">{cat.contactCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cat.triggerFlow ? (
                            <div className="flex items-center gap-1">
                              <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-xs text-gray-700 dark:text-gray-300">{cat.triggerFlow.name}</span>
                              {cat.activeJourneyCount > 0 && <span className="text-[10px] text-gray-500 dark:text-gray-400">({cat.activeJourneyCount})</span>}
                            </div>
                          ) : <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cat.autoFollowUp ? <span className="text-green-600 dark:text-green-400 text-sm">مفعلة</span> : <span className="text-gray-400 text-sm">غير مفعلة</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" dir="ltr">{cat.sortOrder}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEditCat(cat)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: Tags (existing) ════════════ */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          {tagsLoading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
          {!tagsLoading && (
            <div className="bg-white dark:bg-gray-800 shadow dark:shadow-md overflow-hidden sm:rounded-md">
              {tags.length === 0 ? (
                <div className="text-center py-12 text-gray-500">لا توجد وسوم بعد</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الوسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">عدد العملاء</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tags.map((tag) => (
                      <tr key={tag.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renamingTag === tag.name ? (
                            <div className="flex items-center gap-2">
                              <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleRenameTag(tag.name); if (e.key === "Escape") { setRenamingTag(null); setNewTagName(""); }}} />
                              <button onClick={() => handleRenameTag(tag.name)} disabled={tagActionLoading}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">حفظ</button>
                              <button onClick={() => { setRenamingTag(null); setNewTagName(""); }} className="text-xs text-gray-500 hover:text-gray-700">إلغاء</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" dir="ltr">{tag.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          {renamingTag !== tag.name && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setRenamingTag(tag.name); setNewTagName(tag.name); }} className="text-indigo-600 hover:text-indigo-800" title="إعادة تسمية"><PencilIcon className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteTag(tag.name)} disabled={tagActionLoading} className="text-red-500 hover:text-red-700 disabled:opacity-50" title="حذف"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSegments;
