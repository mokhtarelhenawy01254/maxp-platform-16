import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Crown,
  Medal,
  Gem,
  Trophy,
  Award,
  Zap,
  Plus,
  RefreshCw,
  Info,
  Trash2,
  Edit,
  X,
  Loader2,
} from "lucide-react";

interface CustomerLoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  minPoints: number;
  maxPoints?: number;
  benefits: any;
  color: string;
  icon: string;
  customersCount: number;
  programId: string;
}

const TIER_PRESET_PACKS = [
  { key: "classic5", name: "كلاسيك — 5 مستويات", description: "برونز، فضة، ذهب، بلاتين، دايموند", count: 5, icon: "crown" },
  { key: "stars10", name: "نجوم — 10 مستويات", description: "10 مستويات متدرجة بأسلوب الألعاب", count: 10, icon: "trophy" },
  { key: "vip3", name: "VIP — 3 مستويات", description: "مستويات فاخرة بقيمة عالية", count: 3, icon: "gem" },
];

const LoyaltyTiers: React.FC = () => {
  const [tiers, setTiers] = useState<CustomerLoyaltyTier[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Partial<CustomerLoyaltyTier> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Preset modal state
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetProgramId, setPresetProgramId] = useState("");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  // 🆕 تفعيل نظام المستويات (مستقل عن الخصم التلقائي عبر loyalty-config)
  const [tiersEnabled, setTiersEnabled] = useState<boolean>(false);
  const [tiersToggleSaving, setTiersToggleSaving] = useState(false);
  const [tiersToggleMsg, setTiersToggleMsg] = useState("");

  useEffect(() => {
    apiClient.get("/hr/customer-loyalty/loyalty-config")
      .then((res) => { setTiersEnabled(res.data?.data?.tiers?.enabled === true); })
      .catch(() => {});
  }, []);

  const toggleTiersEnabled = async (next: boolean) => {
    if (!window.confirm(next ? "هل تريد تفعيل نظام المستويات؟" : "هل تريد إيقاف تفعيل نظام المستويات؟")) {
      return;
    }
    setTiersToggleSaving(true);
    setTiersToggleMsg("");
    try {
      const res = await apiClient.put("/hr/customer-loyalty/loyalty-config", { tiersEnabled: next });
      setTiersEnabled(res.data?.data?.tiers?.enabled === true);
      setTiersToggleMsg(next ? "تم تفعيل نظام المستويات ✓" : "تم إيقاف تفعيل نظام المستويات ✓");
    } catch (e: any) {
      setTiersToggleMsg(e?.response?.data?.error || "فشل حفظ التفعيل");
    } finally {
      setTiersToggleSaving(false);
    }
  };

  // تحويل المزايا لأي صيغة (array قديم أو object جديد) لصف array نصي للعرض
  const normalizeBenefits = (b: any): string[] => {
    if (Array.isArray(b)) return b.map(String).filter(x => x.trim() !== "");
    if (b && typeof b === "object") {
      const items: string[] = [];
      if (b.freeShipping) items.push("شحن مجاني");
      if (b.priorityShipping) items.push("شحن سريع / أولوية");
      if (Number(b.discountPercent) > 0) items.push(`خصم ${b.discountPercent}%`);
      if (b.customText) items.push(b.customText);
      return items;
    }
    return [];
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tiersRes, programsRes] = await Promise.all([
        apiClient.get("/hr/customer-loyalty/tiers"),
        apiClient.get("/hr/customer-loyalty/programs"),
      ]);
      setTiers((tiersRes.data.data || []).map((t: any) => ({ ...t, benefits: normalizeBenefits(t.benefits) })));
      setPrograms(programsRes.data.data?.filter((p: any) => p.status === "ACTIVE" || p.type === "TIERS" || p.type === "POINTS") || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/hr/customer-loyalty/tiers");
      setTiers((res.data.data || []).map((t: any) => ({ ...t, benefits: normalizeBenefits(t.benefits) })));
    } catch (error) {
      console.error("Error fetching tiers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetProgramId || !selectedPresetKey) return;
    try {
      setIsApplyingPreset(true);
      const res = await apiClient.post<{ message?: string }>("/hr/customer-loyalty/tiers/preset", {
        programId: presetProgramId,
        presetKey: selectedPresetKey,
      });
      alert(res.data?.message || "تم إنشاء المستويات بنجاح");
      setIsPresetModalOpen(false);
      setPresetProgramId("");
      setSelectedPresetKey(null);
      fetchTiers();
    } catch (error) {
      console.error("Error applying preset:", error);
      const err = error as { response?: { data?: { error?: string } } };
      alert(err?.response?.data?.error || "حدث خطأ أثناء إنشاء المستويات");
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const handleOpenModal = (tier: CustomerLoyaltyTier | null = null) => {
    if (tier) {
      setEditingTier({ ...tier });
    } else {
      setEditingTier({
        name: "",
        nameAr: "",
        minPoints: 0,
        maxPoints: 0,
        benefits: [""],
        color: "#6366f1",
        icon: "crown",
        programId: programs.length > 0 ? programs[0].id : "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    try {
      setIsSaving(true);
      // Clean up benefits: remove empty ones
      const cleanBenefits = (editingTier.benefits || []).filter((b) => b.trim() !== "");
      const payload = {
        ...editingTier,
        benefits: cleanBenefits,
      };

      if (editingTier.maxPoints === 0 || !editingTier.maxPoints) {
        delete payload.maxPoints;
      }

      if (editingTier.id) {
        await apiClient.put(`/hr/customer-loyalty/tiers/${editingTier.id}`, payload);
      } else {
        await apiClient.post("/hr/customer-loyalty/tiers", payload);
      }
      setIsModalOpen(false);
      fetchTiers();
    } catch (error: any) {
      console.error("Error saving tier:", error);
      alert(error.response?.data?.error || "حدث خطأ أثناء حفظ المستوى");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذا المستوى؟")) return;
    try {
      await apiClient.delete(`/hr/customer-loyalty/tiers/${id}`);
      fetchTiers();
    } catch (error: any) {
      console.error("Error deleting tier:", error);
      alert(error.response?.data?.error || "لا يمكن حذف المستوى لوجود عملاء مرتبطين به أو حدث خطأ");
    }
  };

  const updateBenefit = (index: number, value: string) => {
    if (!editingTier) return;
    const newBenefits = [...(editingTier.benefits || [])];
    newBenefits[index] = value;
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };

  const addBenefit = () => {
    if (!editingTier) return;
    setEditingTier({ ...editingTier, benefits: [...(editingTier.benefits || []), ""] });
  };

  const removeBenefit = (index: number) => {
    if (!editingTier) return;
    const newBenefits = (editingTier.benefits || []).filter((_, i) => i !== index);
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName) {
      case "crown":
        return <Crown className="w-6 h-6" />;
      case "medal":
        return <Medal className="w-6 h-6" />;
      case "gem":
        return <Gem className="w-6 h-6" />;
      case "trophy":
        return <Trophy className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مستويات العملاء (Tiers)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تعريف شرائح العملاء ومميزات كل مستوى (VIP, Gold, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTiers}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={() => {
              setPresetProgramId(programs.length > 0 ? programs[0].id : "");
              setSelectedPresetKey(null);
              setIsPresetModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="إنشاء مستويات من قالب جاهز"
          >
            <Trophy className="w-4 h-4" />
            قالب جاهز
          </button>
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            مستوى جديد
          </button>
        </div>
      </div>

      {/* 🆕 تفعيل نظام المستويات — مستقل عن الخصم التلقائي */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3 border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">تفعيل نظام المستويات</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                شغّل المستويات عشان يطبّق خصم/مزايا المستوى على الأوردر (مستقل عن الخصم التلقائي).
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tiersEnabled}
              disabled={tiersToggleSaving}
              onChange={(e) => toggleTiersEnabled(e.target.checked)}
              className="h-5 w-5 accent-purple-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tiersEnabled ? "مفعّل" : "متوقف"}
            </span>
          </label>
        </div>
        {tiersToggleSaving && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
        {tiersToggleMsg && (
          <p className={`text-sm font-medium ${tiersToggleMsg.includes("✓") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {tiersToggleMsg}
          </p>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          تستخدم هذه المستويات أيضاً في <strong>نظام الكاش باك</strong> لتحديد
          نسب مختلفة لكل شريحة عملاء. يمكنك تعديل نسب الكاش باك من صفحة "إعدادات
          الكاش باك".
        </p>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            لا توجد مستويات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            قم بإنشاء مستويات لتمييز عملائك المميزين
          </p>
          <button 
            onClick={() => handleOpenModal()} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            إنشاء مستوى جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button onClick={(e) => handleDelete(tier.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`p-4 rounded-xl shadow-sm`}
                  style={{
                    backgroundColor: tier.color + "20",
                    color: tier.color,
                  }}
                >
                  {getTierIcon(tier.icon)}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                    {tier.nameAr || tier.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <Users className="w-3 h-3" />
                    {tier.customersCount} عميل
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    الحد الأدنى للنقاط:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {tier.minPoints?.toLocaleString() || 0}
                  </span>
                </div>
                {tier.maxPoints ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      الحد الأقصى للنقاط:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {tier.maxPoints.toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  مميزات المستوى:
                </p>
                {tier.benefits && tier.benefits.length > 0 ? (
                  tier.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Zap className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 italic">
                    لا توجد ميزات إضافية
                  </span>
                )}
              </div>

              <button 
                onClick={() => handleOpenModal(tier)}
                className="w-full mt-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                تعديل المستوى
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTier.id ? "تعديل المستوى" : "إنشاء مستوى جديد"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
                {!editingTier.id && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      برنامج الولاء
                    </label>
                    <select
                      value={editingTier.programId || ""}
                      onChange={(e) => setEditingTier({ ...editingTier, programId: e.target.value })}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      <option value="">اختر برنامج الولاء</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الاسم (بالأجنبية)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTier.name || ""}
                    onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    placeholder="e.g. VIP"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الاسم (بالعربية)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTier.nameAr || ""}
                    onChange={(e) => setEditingTier({ ...editingTier, nameAr: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-right"
                    placeholder="مثلاً: كبار الشخصيات"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الحد الأدنى للنقاط
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingTier.minPoints || 0}
                    onChange={(e) => setEditingTier({ ...editingTier, minPoints: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الحد الأقصى للنقاط (اختياري)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingTier.maxPoints || ""}
                    onChange={(e) => setEditingTier({ ...editingTier, maxPoints: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    لون المستوى
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editingTier.color || "#6366f1"}
                      onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                      className="w-12 h-10 p-1 rounded border border-gray-200 cursor-pointer"
                    />
                    <div className="flex-1 text-sm text-gray-500">
                       اختر لوناً يعبر عن المستوى
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الأيقونة
                  </label>
                  <select
                    value={editingTier.icon || "crown"}
                    onChange={(e) => setEditingTier({ ...editingTier, icon: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <option value="crown">تاج (Crown)</option>
                    <option value="medal">ميدالية (Medal)</option>
                    <option value="gem">جوهرة (Gem)</option>
                    <option value="trophy">كأس (Trophy)</option>
                    <option value="award">جائزة (Award)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    مميزات المستوى (Benefits)
                  </label>
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    + إضافة ميزة
                  </button>
                </div>
                {editingTier.benefits?.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                      placeholder={`ميزة ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-200 dark:shadow-none"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                قوالب مستويات جاهزة
              </h2>
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleApplyPreset} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  برنامج الولاء
                </label>
                <select
                  value={presetProgramId}
                  onChange={(e) => setPresetProgramId(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">اختر برنامج الولاء</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  القالب سيُنشئ المستويات بأسمائها وألوانها ومزاياها جاهزة، ويمكنك تعديلها بعد ذلك من هنا.
                </p>
              </div>

              <div className="space-y-3">
                {TIER_PRESET_PACKS.map(pack => (
                  <button
                    key={pack.key}
                    type="button"
                    onClick={() => setSelectedPresetKey(pack.key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-right ${
                      selectedPresetKey === pack.key
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex-shrink-0">
                      {pack.icon === "crown" ? <Crown className="w-6 h-6" /> : pack.icon === "trophy" ? <Trophy className="w-6 h-6" /> : <Gem className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white">{pack.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{pack.description}</div>
                    </div>
                    <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{pack.count} مستويات</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
                <button
                  type="submit"
                  disabled={isApplyingPreset || !presetProgramId || !selectedPresetKey}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-200 dark:shadow-none"
                >
                  {isApplyingPreset ? "جاري الإنشاء..." : "إنشاء المستويات"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component
const Users = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default LoyaltyTiers;
