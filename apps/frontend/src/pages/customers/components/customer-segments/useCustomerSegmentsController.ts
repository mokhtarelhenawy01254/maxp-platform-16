import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../../../services/apiClient";
import analyticsService from "../../../../services/analyticsService";
import {
  LeadCategory,
  Flow,
  TagItem,
  QualityAnalytics,
  LoyaltyRecord,
  LoyaltyTier,
  CustomerBasic,
  UnifiedCustomer,
  QualityCustomer,
  CustomerSegmentsStats,
  parseTags,
  toNumber,
} from "./types";

export type CustomerSegmentsTab = "overview" | "quality" | "loyalty" | "categories" | "tags";

export function useCustomerSegmentsController() {
  const [activeTab, setActiveTab] = useState<CustomerSegmentsTab>("overview");

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

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ── Load categories ──────────────────────────
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

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // ── Load tags ────────────────────────────────
  const [tagsLoading, setTagsLoading] = useState(true);

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const res = await apiClient.get("/customers/tags/distinct");
      setTags(res.data?.data || []);
    } catch (_) {
      /* ignore */
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  // ── Unified customer list ───────────────────
  const unifiedCustomers = useMemo((): UnifiedCustomer[] => {
    if (!customers.length) return [];

    const qualityMap = new Map<string, QualityCustomer>();
    (qualityData?.customers || []).forEach((q) => qualityMap.set(q.customerId, q));

    const loyaltyMap = new Map<string, LoyaltyRecord>();
    loyaltyRecords.forEach((r) => loyaltyMap.set(r.customer.id, r));

    const joined: UnifiedCustomer[] = customers.map((c) => {
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

    return joined.filter((c) => c.totalOrders > 0 || c.loyaltyPoints > 0 || c.tags.length > 0);
  }, [customers, qualityData, loyaltyRecords]);

  // ── Filtered list ──────────────────────────
  const filteredCustomers = useMemo(() => {
    let result = unifiedCustomers;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }
    if (filterQuality !== "ALL") result = result.filter((c) => c.qualityTier === filterQuality);
    if (filterLoyalty !== "ALL") {
      result = result.filter((c) => (filterLoyalty === "NONE" ? !c.loyaltyTier : c.loyaltyTier === filterLoyalty));
    }
    if (filterRating !== "ALL") result = result.filter((c) => c.rating === filterRating);
    return result.sort((a, b) => b.qualityScore - a.qualityScore);
  }, [unifiedCustomers, searchQuery, filterQuality, filterLoyalty, filterRating]);

  const selectedCustomer = useMemo(
    () => filteredCustomers.find((c) => c.id === selectedCustomerId) || null,
    [filteredCustomers, selectedCustomerId],
  );

  // ── Aggregate stats ─────────────────────────
  const stats = useMemo((): CustomerSegmentsStats => ({
    total: unifiedCustomers.length,
    vipCount: unifiedCustomers.filter((c) => c.qualityTier === "VIP").length,
    highCount: unifiedCustomers.filter((c) => c.qualityTier === "عالي").length,
    medCount: unifiedCustomers.filter((c) => c.qualityTier === "متوسط").length,
    lowCount: unifiedCustomers.filter((c) => c.qualityTier === "منخفض").length,
    loyaltyMembers: loyaltyRecords.filter((r) => r.status === "ACTIVE").length,
    excellentCount: unifiedCustomers.filter((c) => c.rating === "EXCELLENT").length,
    atRiskCount: unifiedCustomers.filter((c) => c.qualityTier === "منخفض").length,
    totalPoints: loyaltyRecords.reduce((s, r) => s + toNumber(r.currentPoints), 0),
  }), [unifiedCustomers, loyaltyRecords]);

  // ── Category Form State ─────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<LeadCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catAutoFollowUp, setCatAutoFollowUp] = useState(true);
  const [catTriggerFlowId, setCatTriggerFlowId] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    apiClient
      .get("/whatsapp/automation/flows")
      .then((r) => {
        setFlows(r.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const resetCatForm = () => {
    setShowCatForm(false);
    setEditingCat(null);
    setCatName("");
    setCatColor("#6366f1");
    setCatAutoFollowUp(true);
    setCatTriggerFlowId("");
  };

  const openEditCat = (cat: LeadCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatAutoFollowUp(cat.autoFollowUp);
    setCatTriggerFlowId(cat.triggerFlowId || "");
    setShowCatForm(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      if (editingCat) {
        await apiClient.put(`/whatsapp/lead-categories/${editingCat.id}`, {
          name: catName.trim(),
          color: catColor,
          autoFollowUp: catAutoFollowUp,
          triggerFlowId: catTriggerFlowId || null,
        });
      } else {
        await apiClient.post("/whatsapp/lead-categories", {
          name: catName.trim(),
          color: catColor,
          autoFollowUp: catAutoFollowUp,
          triggerFlowId: catTriggerFlowId || null,
        });
      }
      resetCatForm();
      await loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل حفظ التصنيف");
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    try {
      await apiClient.delete(`/whatsapp/lead-categories/${id}`);
      await loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل حذف التصنيف");
    }
  };

  // ── Tag Actions ─────────────────────────────
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagActionLoading, setTagActionLoading] = useState(false);

  const handleRenameTag = async (oldName: string) => {
    if (!newTagName.trim() || newTagName.trim() === oldName) return;
    setTagActionLoading(true);
    try {
      await apiClient.put("/customers/tags/rename", { oldName, newName: newTagName.trim() });
      setRenamingTag(null);
      setNewTagName("");
      await loadTags();
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل إعادة تسمية الوسم");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الوسم "${tagName}" من جميع العملاء؟`)) return;
    setTagActionLoading(true);
    try {
      await apiClient.delete(`/customers/tags/${encodeURIComponent(tagName)}`);
      await loadTags();
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل حذف الوسم");
    } finally {
      setTagActionLoading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    qualityData,
    loyaltyRecords,
    loyaltyTiers,
    categories,
    tags,
    catLoading,
    catError,
    tagsLoading,
    searchQuery,
    setSearchQuery,
    filterQuality,
    setFilterQuality,
    filterLoyalty,
    setFilterLoyalty,
    filterRating,
    setFilterRating,
    selectedCustomerId,
    setSelectedCustomerId,
    filteredCustomers,
    selectedCustomer,
    stats,
    showCatForm,
    setShowCatForm,
    editingCat,
    catName,
    setCatName,
    catColor,
    setCatColor,
    catAutoFollowUp,
    setCatAutoFollowUp,
    catTriggerFlowId,
    setCatTriggerFlowId,
    catSaving,
    flows,
    resetCatForm,
    openEditCat,
    handleSaveCategory,
    handleDeleteCategory,
    renamingTag,
    setRenamingTag,
    newTagName,
    setNewTagName,
    tagActionLoading,
    handleRenameTag,
    handleDeleteTag,
    fetchAll,
  };
}
