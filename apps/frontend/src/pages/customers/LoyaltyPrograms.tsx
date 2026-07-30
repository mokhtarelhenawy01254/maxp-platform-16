import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { Gift, Star, Crown, DollarSign, Users, Plus, RefreshCw, Edit, Trash2, Truck, Tag, Percent, AlertTriangle } from 'lucide-react';

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  type: "POINTS" | "TIER" | "CASHBACK" | "REFERRAL";
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  pointsPerPurchase: number;
  pointsPerReferral: number;
  redemptionRate: number;
  minimumPoints: number;
  maxPointsPerTransaction: number;
  pointsPerAmount?: number;
  expiryMonths: number;
  rules?: string | any;
  createdAt: string;
  updatedAt: string;
  customersCount: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
}

const DEFAULT_RULES = {
  rewards: {
    points: true,
    freeShipping: false,
    discount: false,
  },
  freeShippingThreshold: 0,
  discountPercent: 0,
};

const LoyaltyPrograms: React.FC = () => {
  const [programs, setPrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] =
    useState<Partial<CustomerLoyaltyProgram> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/hr/customer-loyalty/programs");
      setPrograms(res.data.data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (program: CustomerLoyaltyProgram | null = null) => {
    if (program) {
      let parsedRules = DEFAULT_RULES;
      try {
        if (typeof program.rules === "string") {
          parsedRules = JSON.parse(program.rules);
        } else if (program.rules) {
          parsedRules = program.rules;
        }
      } catch (e) {
        console.error("Error parsing rules:", e);
      }
      setEditingProgram({ ...program, rules: parsedRules });
    } else {
      setEditingProgram({
        name: "",
        nameAr: "",
        description: "",
        type: "POINTS",
        status: "DRAFT",
        pointsPerPurchase: 1,
        pointsPerAmount: 1,
        pointsPerReferral: 10,
        redemptionRate: 100,
        minimumPoints: 100,
        maxPointsPerTransaction: 0,
        expiryMonths: 12,
        rules: DEFAULT_RULES,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    try {
      setIsSaving(true);
      if (editingProgram.id) {
        await apiClient.put(
          `/hr/customer-loyalty/programs/${editingProgram.id}`,
          editingProgram,
        );
      } else {
        await apiClient.post("/hr/customer-loyalty/programs", editingProgram);
      }
      setIsModalOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error("Error saving program:", error);
      alert("حدث خطأ أثناء حفظ البرنامج");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البرنامج؟")) return;
    try {
      await apiClient.delete(`/hr/customer-loyalty/programs/${id}`);
      fetchPrograms();
    } catch (error) {
      console.error("Error deleting program:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case "POINTS":
        return <Star className="w-5 h-5" />;
      case "TIER":
        return <Crown className="w-5 h-5" />;
      case "CASHBACK":
        return <DollarSign className="w-5 h-5" />;
      case "REFERRAL":
        return <Users className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            برامج النقاط
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة أنظمة النقاط والمكافآت (Loyalty Programs)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPrograms}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            برنامج جديد
          </button>
        </div>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            لا توجد برامج ولاء
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            أنشئ برنامج نقاط لتشجيع العملاء على الشراء
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            إنشاء برنامج جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2 ${program.status === "ACTIVE" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30" : "bg-gray-100 text-gray-600 dark:bg-gray-800"} rounded-lg`}
                >
                  {getProgramIcon(program.type)}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(program.status)}`}
                >
                  {program.status === "ACTIVE"
                    ? "نشط"
                    : program.status === "INACTIVE"
                      ? "غير نشط"
                      : "مسودة"}
                </span>
              </div>

              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {program.nameAr || program.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {program.description}
              </p>

              {/* Active Rewards Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(() => {
                  let rules = DEFAULT_RULES;
                  try {
                    if (typeof program.rules === "string")
                      rules = JSON.parse(program.rules);
                    else if (program.rules) rules = program.rules;
                  } catch (e) {}

                  return (
                    <>
                      {rules.rewards?.points && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500 text-xs font-medium">
                          <Star className="w-3 h-3" /> نقاط
                        </span>
                      )}
                      {rules.rewards?.freeShipping && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-500 text-xs font-medium">
                          <Truck className="w-3 h-3" /> شحن مجاني
                        </span>
                      )}
                      {rules.rewards?.discount && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-500 text-xs font-medium">
                          <Tag className="w-3 h-3" /> خصم %
                          {rules.discountPercent}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    معدل اكتساب النقاط:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {program.pointsPerPurchase} نقطة / {program.pointsPerAmount || 1} عملة
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    عدد المشتركين:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {program.customersCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    صلاحية النقاط (شهر):
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {program.expiryMonths}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleOpenModal(program)}
                  className="flex-1 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(program.id)}
                  className="px-3 py-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProgram.id
                  ? "تعديل برنامج الولاء"
                  : "إنشاء برنامج ولاء جديد"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <Trash2 className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    اسم البرنامج (بالأجنبية)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProgram.name || ""}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    placeholder="e.g. Platinum Points"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    اسم البرنامج (بالعربية)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProgram.nameAr || ""}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        nameAr: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-right"
                    placeholder="مثلاً: البرنامج البلاتيني"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  وصف البرنامج
                </label>
                <textarea
                  value={editingProgram.description || ""}
                  onChange={(e) =>
                    setEditingProgram({
                      ...editingProgram,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-24"
                  placeholder="اشرح كيف يمكن للعملاء كسب النقاط..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    نوع البرنامج
                  </label>
                  <select
                    value={editingProgram.type || "POINTS"}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <option value="POINTS">نقاط (Points)</option>
                    <option value="TIERS">مستويات (Tiers)</option>
                    <option value="CASHBACK">كاش باك (Cashback)</option>
                    <option value="REFERRAL">إحالات (Referral)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الحالة
                  </label>
                  <select
                    value={editingProgram.status || "DRAFT"}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <option value="ACTIVE">نشط</option>
                    <option value="INACTIVE">غير نشط</option>
                    <option value="DRAFT">مسودة</option>
                  </select>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl space-y-4 border border-purple-100 dark:border-purple-900/30">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-600" />
                  تكوين المكافآت (Rewards Config)
                </h4>
                <div className="space-y-4">
                  {/* Points Reward Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-yellow-500">
                        <Star className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          تفعيل نظام النقاط
                        </p>
                        <p className="text-xs text-gray-500">
                          كسب نقاط مقابل كل عملية شراء
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProgram({
                          ...editingProgram,
                          rules: {
                            ...(editingProgram.rules || {}),
                            rewards: {
                              ...(editingProgram.rules?.rewards || {}),
                              points: !editingProgram.rules?.rewards?.points,
                            },
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingProgram.rules?.rewards?.points ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingProgram.rules?.rewards?.points ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* Free Shipping Reward Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-blue-500">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          شحن مجاني
                        </p>
                        <p className="text-xs text-gray-500">
                          عرض شحن مجاني للمشتركين
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProgram({
                          ...editingProgram,
                          rules: {
                            ...(editingProgram.rules || {}),
                            rewards: {
                              ...(editingProgram.rules?.rewards || {}),
                              freeShipping:
                                !editingProgram.rules?.rewards?.freeShipping,
                            },
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingProgram.rules?.rewards?.freeShipping ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingProgram.rules?.rewards?.freeShipping ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {editingProgram.rules?.rewards?.freeShipping && (
                    <div className="mr-12 animate-in fade-in slide-in-from-right-2 duration-200">
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        الحد الأدنى للطلب (0 = بدون حد)
                      </label>
                      <input
                        type="number"
                        value={editingProgram.rules?.freeShippingThreshold || 0}
                        onChange={(e) =>
                          setEditingProgram({
                            ...editingProgram,
                            rules: {
                              ...(editingProgram.rules || {}),
                              freeShippingThreshold: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full max-w-[200px] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                  )}

                  {/* Discount Reward Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-green-500">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          خصم خاص
                        </p>
                        <p className="text-xs text-gray-500">
                          منح خصم مئوي عند الشراء
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProgram({
                          ...editingProgram,
                          rules: {
                            ...(editingProgram.rules || {}),
                            rewards: {
                              ...(editingProgram.rules?.rewards || {}),
                              discount: !editingProgram.rules?.rewards?.discount,
                            },
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingProgram.rules?.rewards?.discount ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingProgram.rules?.rewards?.discount ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {editingProgram.rules?.rewards?.discount && (
                    <div className="mr-12 animate-in fade-in slide-in-from-right-2 duration-200">
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        نسبة الخصم (%)
                      </label>
                      <div className="relative max-w-[200px]">
                        <input
                          type="number"
                          value={editingProgram.rules?.discountPercent || 0}
                          onChange={(e) =>
                            setEditingProgram({
                              ...editingProgram,
                              rules: {
                                ...(editingProgram.rules || {}),
                                discountPercent: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm pr-8"
                        />
                        <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4 border border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-600" />
                  قواعد الربح والاستبدال
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingProgram.type === "POINTS" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          كل عملية شراء بمبلغ (عملة)
                        </label>
                        <input
                          type="number"
                          value={editingProgram.pointsPerAmount || 1}
                          onChange={(e) =>
                            setEditingProgram({
                              ...editingProgram,
                              pointsPerAmount: Number(e.target.value),
                            })
                          }
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          تساوي (نقاط)
                        </label>
                        <input
                          type="number"
                          value={editingProgram.pointsPerPurchase || 0}
                          onChange={(e) =>
                            setEditingProgram({
                              ...editingProgram,
                              pointsPerPurchase: Number(e.target.value),
                            })
                          }
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                    </>
                  )}

                  {editingProgram.type === "REFERRAL" && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500 font-medium">
                        النقاط المكتسبة لكل إحالة ناجحة
                      </label>
                      <input
                        type="number"
                        value={editingProgram.pointsPerReferral || 0}
                        onChange={(e) =>
                          setEditingProgram({
                            ...editingProgram,
                            pointsPerReferral: Number(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">
                      معدل الاستبدال (1 عملة = كم نقطة للاستبدال؟)
                    </label>
                    <input
                      type="number"
                      value={editingProgram.redemptionRate || 0}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          redemptionRate: Number(e.target.value),
                        })
                      }
                      placeholder="مثال: 100 يعادل أن كل 100 نقطة تخصم 1 عملة"
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">
                      صلاحية النقاط (بالأشهر)
                    </label>
                    <input
                      type="number"
                      value={editingProgram.expiryMonths || 0}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          expiryMonths: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">
                      الحد الأدنى للنقاط لبدء الاستبدال
                    </label>
                    <input
                      type="number"
                      value={editingProgram.minimumPoints || 0}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          minimumPoints: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">
                      أقصى نقاط يمكن اكتسابها/استبدالها بالطلب الواحد
                    </label>
                    <input
                      type="number"
                      value={editingProgram.maxPointsPerTransaction || 0}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          maxPointsPerTransaction: Number(e.target.value),
                        })
                      }
                      placeholder="0 تعني بدون حد أقصى"
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
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
    </div>
  );
};

export default LoyaltyPrograms;
