import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";
import { Award, ArrowLeft, Save, AlertTriangle, RefreshCw, User, Calendar, DollarSign, Star, Grid } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3007";

const REWARD_CATEGORIES: Record<string, string> = {
  ATTENDANCE: "حضور وانضباط",
  PERFORMANCE: "أداء متميز",
  ACHIEVEMENT: "إنجاز",
  SEASONAL: "موسمية",
  TEAM_BASED: "فريق",
  COMPANY_WIDE: "عامة",
  TARGET_ACHIEVEMENT: "تحقيق تارجت",
  TARGET_EXCEED: "تجاوز تارجت",
  PUNCTUALITY: "التزام بالمواعيد",
  NO_ABSENCE: "عدم غياب",
  QUALITY: "جودة العمل",
  EMPLOYEE_OF_MONTH: "موظف الشهر",
  INITIATIVE: "مبادرة مميزة",
  PROJECT_SUCCESS: "مشروع ناجح",
  SALES: "مبيعات",
  ADMINISTRATIVE: "مكافأة إدارية",
  OTHER: "أخرى",
};

const CALCULATION_METHODS: Record<string, string> = {
  FIXED_AMOUNT: "مبلغ ثابت",
  PERCENTAGE_SALARY: "نسبة من الراتب",
  PERCENTAGE_SALES: "نسبة من المبيعات",
  PERCENTAGE_PROJECT_PROFIT: "نسبة من أرباح المشروع",
  POINTS: "نقاط",
  NON_MONETARY: "عينية",
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  departmentRelation?: { name: string };
}

interface RewardType {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  calculationMethod: string;
  value: number;
  eligibilityConditions: any;
}

interface FormData {
  userId: string;
  rewardTypeId: string;
  calculatedValue: string;
  periodStart: string;
  periodEnd: string;
  appliedMonth: string;
  appliedYear: string;
  reason: string;
  rewardName: string;
  rewardCategory: string;
}

const CreateEditReward: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([]);
  const [selectedRewardType, setSelectedRewardType] =
    useState<RewardType | null>(null);

  const [formData, setFormData] = useState<FormData>({
    userId: "",
    rewardTypeId: "",
    calculatedValue: "",
    periodStart: "",
    periodEnd: "",
    appliedMonth: (new Date().getMonth() + 1).toString(),
    appliedYear: new Date().getFullYear().toString(),
    reason: "",
    rewardName: "",
    rewardCategory: "OTHER",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    fetchEmployees();
    fetchRewardTypes();
    if (isEdit) {
      fetchRewardDetails();
    }
  }, [id]);

  useEffect(() => {
    if (formData.rewardTypeId) {
      const type = rewardTypes.find((t) => t.id === formData.rewardTypeId);
      setSelectedRewardType(type || null);
      if (type && !formData.calculatedValue) {
        // If it's a fixed amount, just set the value
        if (type.calculationMethod === "FIXED_AMOUNT") {
          setFormData((prev) => ({
            ...prev,
            calculatedValue: type.value.toString(),
          }));
        } else {
          // For percentages, we keep it empty for the user to enter the target base (e.g. salary or sales)
          // or we can auto-fill some placeholder
          setFormData((prev) => ({ ...prev, calculatedValue: "" }));
        }
      }
    }
  }, [formData.rewardTypeId, rewardTypes]);

  const getCategoryLabel = (category: string) =>
    REWARD_CATEGORIES[category] || category;
  const getMethodLabel = (method: string) =>
    CALCULATION_METHODS[method] || method;

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get(`/hr/employees`);

      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchRewardTypes = async () => {
    try {
      const response = await apiClient.get(`/hr/rewards/types`);

      if (response.data.success) {
        setRewardTypes(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching reward types:", err);
    }
  };

  const seedDefaults = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/hr/rewards/types/seed`);
      if (response.data.success) {
        await fetchRewardTypes();
      }
    } catch (err) {
      console.error("Error seeding defaults:", err);
      setError("فشل في تجهيز القوالب. يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/hr/rewards/records/${id}`);

      if (response.data.success) {
        const reward = response.data.data;
        setFormData({
          userId: reward.userId,
          rewardTypeId: reward.rewardTypeId,
          calculatedValue: reward.calculatedValue.toString(),
          periodStart: reward.periodStart.split("T")[0],
          periodEnd: reward.periodEnd.split("T")[0],
          appliedMonth: reward.appliedMonth.toString(),
          appliedYear: reward.appliedYear.toString(),
          reason: reward.reason || "",
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل في تحميل بيانات المكافأة");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData["userId"]) {
      errors["userId"] = "يجب اختيار الموظف";
    }

    if (!formData["rewardTypeId"]) {
      errors["rewardTypeId"] = "يجب اختيار نوع المكافأة";
    } else if (
      formData["rewardTypeId"] === "custom" &&
      !formData["rewardName"]
    ) {
      errors["rewardName"] = "يجب إدخال اسم المكافأة المخصصة";
    }

    if (
      !formData["calculatedValue"] ||
      parseFloat(formData["calculatedValue"]) <= 0
    ) {
      errors["calculatedValue"] = "يجب إدخال قيمة صحيحة للمكافأة";
    }

    if (!formData["periodStart"]) {
      errors["periodStart"] = "يجب تحديد تاريخ بداية الفترة";
    }

    if (!formData["periodEnd"]) {
      errors["periodEnd"] = "يجب تحديد تاريخ نهاية الفترة";
    }

    if (formData["periodStart"] && formData["periodEnd"]) {
      if (new Date(formData["periodStart"]) > new Date(formData["periodEnd"])) {
        errors["periodEnd"] = "تاريخ النهاية يجب أن يكون بعد تاريخ البداية";
      }
    }

    if (
      !formData["appliedMonth"] ||
      parseInt(formData["appliedMonth"]) < 1 ||
      parseInt(formData["appliedMonth"]) > 12
    ) {
      errors["appliedMonth"] = "يجب إدخال شهر صحيح (1-12)";
    }

    if (!formData["appliedYear"] || parseInt(formData["appliedYear"]) < 2020) {
      errors["appliedYear"] = "يجب إدخال سنة صحيحة";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        calculatedValue: parseFloat(formData["calculatedValue"]),
        appliedMonth: parseInt(formData["appliedMonth"]),
        appliedYear: parseInt(formData["appliedYear"]),
      };

      if (isEdit) {
        await apiClient.put(`/hr/rewards/records/${id}`, payload);
        alert("تم تحديث المكافأة بنجاح");
      } else {
        await apiClient.post(`/hr/rewards/records`, payload);
        alert("تم إضافة المكافأة بنجاح");
      }

      navigate("/hr/rewards");
    } catch (err: any) {
      console.error("Error saving reward:", err);
      setError(err.response?.data?.message || "فشل في حفظ المكافأة");

      if (err.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};
        err.response.data.errors.forEach((error: any) => {
          backendErrors[error.field] = error.message;
        });
        setValidationErrors(backendErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/hr/rewards")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-8 h-8 text-blue-600" />
            {isEdit ? t("rewards.form.editReward") : t("rewards.form.addReward")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEdit
              ? "تعديل بيانات المكافأة"
              : "إنشاء مكافأة يدوية جديدة للموظف"}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              حدث خطأ
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            معلومات الموظف
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الموظف <span className="text-red-500">*</span>
              </label>
              <select
                value={formData["userId"]}
                onChange={(e) => handleChange("userId", e.target.value)}
                disabled={isEdit}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["userId"]
                    ? "border-red-500"
                    : "border-gray-300"
                } ${isEdit ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-75" : ""}`}
              >
                <option value="">اختر الموظف</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                    {emp.departmentRelation &&
                      ` (${emp.departmentRelation.name})`}
                  </option>
                ))}
              </select>
              {validationErrors["userId"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["userId"]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reward Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            تفاصيل المكافأة
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع المكافأة <span className="text-red-500">*</span>
              </label>
              <select
                value={formData["rewardTypeId"]}
                onChange={(e) => handleChange("rewardTypeId", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${validationErrors["rewardTypeId"] ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">اختر نوع المكافأة</option>
                {rewardTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nameAr || type.name} (
                    {getCategoryLabel(type.category)})
                  </option>
                ))}
                <option value="custom">-- إضافة نوع مكافأة جديد --</option>
              </select>

              {rewardTypes.length === 0 && (
                <div className="mt-4 p-8 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-gray-700 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none relative overflow-hidden group">
                  {/* Decorative background elements */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-60 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors duration-700"></div>
                  <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-60 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors duration-700"></div>

                  <div className="relative z-10">
                    <div
                      className="flex flex-col md:flex-row items-center gap-8 text-right"
                      dir="rtl"
                    >
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                          <Sparkles className="w-3 h-3" />
                          نظام ذكي متكامل
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-3 bg-gradient-to-l from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                          جاهز لتكريم موظفيك؟
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                          قائمة القوالب فارغة حالياً. بضغطة واحدة، سنقوم بتجهيز{" "}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            10 أنواع مكافآت احترافية
                          </span>{" "}
                          مصممة بعناية لتغطية كافة جوانب العمل (موظف الشهر،
                          الالتزام، المبيعات...)
                        </p>

                        <button
                          type="button"
                          onClick={seedDefaults}
                          disabled={loading}
                          className="group/btn relative px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                        >
                          <RefreshCw
                            className={`w-5 h-5 ${loading ? "animate-spin" : "group-hover/btn:rotate-180 transition-transform duration-700"}`}
                          />
                          تجهيز كافة القوالب الآن
                        </button>
                      </div>

                      <div className="w-full md:w-64 space-y-2 relative">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">
                          معاينة لبعض القوالب
                        </p>
                        {[
                          {
                            name: "موظف الشهر",
                            icon: "🏆",
                            color:
                              "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
                          },
                          {
                            name: "مكافأة الالتزام",
                            icon: "⏰",
                            color:
                              "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
                          },
                          {
                            name: "تحقيق التارجت",
                            icon: "🎯",
                            color:
                              "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                          },
                          {
                            name: "المبادرة والابتكار",
                            icon: "💡",
                            color:
                              "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transform transition-all duration-500 hover:scale-105 hover:shadow-md cursor-default pointer-events-none ${idx % 2 === 0 ? "translate-x-2" : "-translate-x-2"}`}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${item.color}`}
                            >
                              {item.icon}
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationErrors["rewardTypeId"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["rewardTypeId"]}
                </p>
              )}

              {formData["rewardTypeId"] === "custom" && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 animate-in slide-in-from-top-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    تفاصيل المكافأة الجديدة
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      اسم المكافأة بالعربي
                    </label>
                    <input
                      type="text"
                      value={formData["rewardName"]}
                      onChange={(e) =>
                        handleChange("rewardName", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="مثلاً: مكافأة الأداء الاستثنائي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      التصنيف
                    </label>
                    <select
                      value={formData["rewardCategory"]}
                      onChange={(e) =>
                        handleChange("rewardCategory", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(REWARD_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {selectedRewardType && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                        نوع المكافأة المختارة
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100 font-bold">
                        {selectedRewardType.nameAr || selectedRewardType.name}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-left">
                        التصنيف
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {getCategoryLabel(selectedRewardType.category)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-blue-100 dark:border-blue-800 pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                        طريقة الحساب
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {getMethodLabel(selectedRewardType.calculationMethod)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                        القيمة الافتراضية
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {selectedRewardType.calculationMethod === "FIXED_AMOUNT"
                          ? `${selectedRewardType.value.toLocaleString()} ج.م`
                          : `${selectedRewardType.value}%`}
                      </p>
                    </div>
                  </div>

                  {selectedRewardType.eligibilityConditions && (
                    <div className="border-t border-blue-100 dark:border-blue-800 pt-2">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
                        شروط الاستحقاق الواجب توفرها:
                      </p>
                      <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        {selectedRewardType.eligibilityConditions
                          .minTargetProgress > 0 && (
                          <li>
                            تحقيق تارجت لا يقل عن %
                            {
                              selectedRewardType.eligibilityConditions
                                .minTargetProgress
                            }
                          </li>
                        )}
                        {selectedRewardType.eligibilityConditions
                          .maxLatenessCount === 0 &&
                          selectedRewardType.category === "PUNCTUALITY" && (
                            <li>عدم وجود أي تأخيرات خلال الشهر</li>
                          )}
                        {selectedRewardType.eligibilityConditions
                          .maxAbsenceCount === 0 && (
                          <li>عدم وجود أي أيام غياب</li>
                        )}
                        {selectedRewardType.eligibilityConditions.maxErrorRate >
                          0 && (
                          <li>
                            نسبة أخطاء أقل من %
                            {
                              selectedRewardType.eligibilityConditions
                                .maxErrorRate
                            }
                          </li>
                        )}
                        {selectedRewardType.eligibilityConditions
                          .requiresManagerNomination && (
                          <li>يتطلب ترشيح من المدير المباشر</li>
                        )}
                        {selectedRewardType.eligibilityConditions
                          .requiresHRApproval && (
                          <li>يتطلب موافقة قسم الموارد البشرية</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                قيمة المكافأة (ج.م) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData["calculatedValue"]}
                onChange={(e) =>
                  handleChange("calculatedValue", e.target.value)
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["calculatedValue"]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0.00"
              />
              {validationErrors["calculatedValue"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["calculatedValue"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                السبب / الوصف
              </label>
              <textarea
                value={formData["reason"]}
                onChange={(e) => handleChange("reason", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="اكتب سبب منح المكافأة..."
              />
            </div>
          </div>
        </div>

        {/* Period Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            الفترة الزمنية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تاريخ بداية الفترة <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData["periodStart"]}
                onChange={(e) => handleChange("periodStart", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["periodStart"]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {validationErrors["periodStart"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["periodStart"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تاريخ نهاية الفترة <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData["periodEnd"]}
                onChange={(e) => handleChange("periodEnd", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["periodEnd"]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {validationErrors["periodEnd"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["periodEnd"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الشهر المطبق <span className="text-red-500">*</span>
              </label>
              <select
                value={formData["appliedMonth"]}
                onChange={(e) => handleChange("appliedMonth", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["appliedMonth"]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              {validationErrors["appliedMonth"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["appliedMonth"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                السنة المطبقة <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={formData["appliedYear"]}
                onChange={(e) => handleChange("appliedYear", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                  validationErrors["appliedYear"]
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {validationErrors["appliedYear"] && (
                <p className="text-sm text-red-600 mt-1">
                  {validationErrors["appliedYear"]}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/hr/rewards")}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEdit ? "تحديث المكافأة" : "إضافة المكافأة"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEditReward;
