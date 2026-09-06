import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  returnService,
  ReturnReason,
  ReturnReasonCategory,
  ReviewDisplayConfig,
  ReturnSettingsData,
  ReturnType,
  ReturnTypeCode,
  ReturnTypeCostModel,
  ReturnShippingCompany,
} from "../../services/returnService";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Truck, Tag, Shield, Eye, EyeOff, Save, Settings2, Package, Calendar, CheckCircle, XCircle, Sparkles, FolderPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const typeCodeKey = (code: string): string => {
  switch (code) {
    case "SENDER_PAYS":
      return "241";
    case "RECIPIENT_PAYS":
      return "242";
    case "CANCELLED":
      return "243";
    default:
      return "244";
  }
};

const costModelKey = (model: string): string => {
  switch (model) {
    case "FULL":
      return "245";
    case "NONE":
      return "246";
    default:
      return "247";
  }
};

const getOrderStatusFields = (t: any): {
  code: string;
  label: string;
}[] => [
  { code: "PENDING", label: t('returns.k_1') },
  { code: "CONFIRMED", label: t('returns.k_2') },
  { code: "SCHEDULED", label: t('returns.k_3') },
  { code: "PROCESSING", label: t('returns.k_4') },
  { code: "SHIPPED", label: t('returns.k_5') },
  { code: "DELIVERED", label: t('returns.k_6') },
  { code: "CANCELLED", label: t('returns.k_7') },
  { code: "RETURNED", label: t('returns.k_8') },
  { code: "REFUNDED", label: t('returns.k_9') },
  { code: "DUPLICATE_ORDER", label: t('returns.k_10') },
  { code: "ON_HOLD", label: t('returns.k_11') },
  { code: "PARTIALLY_DELIVERED", label: t('returns.k_12') },
];



const getDisplayFields = (t: any): {
  key: keyof ReviewDisplayConfig;
  label: string;
  description: string;
  section: "columns" | "controls";
}[] => [
  {
    key: "showOrderColumn",
    label: t('returns.k_47'),
    description: t('returns.k_48'),
    section: "columns",
  },
  {
    key: "showCustomerColumn",
    label: t('returns.k_49'),
    description: t('returns.k_50'),
    section: "columns",
  },
  {
    key: "showCustomerRating",
    label: t('returns.k_51'),
    description: t('returns.k_52'),
    section: "columns",
  },
  {
    key: "showCustomerSuccessScore",
    label: t('returns.k_53'),
    description: t('returns.k_54'),
    section: "columns",
  },
  {
    key: "showCustomerPhone",
    label: t('returns.k_55'),
    description: t('returns.k_56'),
    section: "columns",
  },
  {
    key: "showReasonColumn",
    label: t('returns.k_57'),
    description: t('returns.k_58'),
    section: "columns",
  },
  {
    key: "showResponsiblePartyColumn",
    label: t('returns.k_59'),
    description: t('returns.k_60'),
    section: "columns",
  },
  {
    key: "showReviewColumn",
    label: t('returns.k_63'),
    description: t('returns.k_64'),
    section: "columns",
  },
  {
    key: "showDateColumn",
    label: t('returns.k_65'),
    description: t('returns.k_66'),
    section: "columns",
  },
  {
    key: "showActionsColumn",
    label: t('returns.k_67'),
    description: t('returns.k_68'),
    section: "columns",
  },
  {
    key: "showFilterBar",
    label: t('returns.k_69'),
    description: t('returns.k_70'),
    section: "controls",
  },
  {
    key: "showCreateButton",
    label: t('returns.k_71'),
    description: t('returns.k_72'),
    section: "controls",
  },
];

const getDefaultData = (t: any) => [
  {
    name: t('returns.k_77'),
    defaultRole: "STORE",
    reasons: [
      { reason: t('returns.k_78'), description: t('returns.k_79') },
      { reason: t('returns.k_80'), description: t('returns.k_81') },
    ],
  },
  {
    name: t('returns.k_82'),
    defaultRole: "SHIPPING",
    reasons: [
      {
        reason: t('returns.k_83'),
        description: t('returns.k_84'),
      },
      {
        reason: t('returns.k_85'),
        description: t('returns.k_86'),
      },
    ],
  },
  {
    name: t('returns.k_87'),
    defaultRole: "CUSTOMER",
    reasons: [
      { reason: t('returns.k_88'), description: t('returns.k_89') },
      { reason: t('returns.k_90'), description: t('returns.k_91') },
    ],
  },
  {
    name: 'أسباب رفض العميل (RTO)',
    defaultRole: 'CUSTOMER',
    reasons: [
      { reason: 'العميل غير موجود عند التسليم', description: 'لم يتم العثور على العميل في العنوان المحدد' },
      { reason: 'العنوان خطأ أو غير مكتمل', description: 'بيانات العنوان غير صحيحة أو ناقصة' },
      { reason: 'رفض السعر', description: 'العميل رفض السعر عند الاستلام' },
      { reason: 'طلب مكرر', description: 'العميل قام بطلب نفس المنتج من مكان آخر' },
      { reason: 'العميل غير رأيه', description: 'غير رأيه في الشراء' },
      { reason: 'تأخير في التوصيل', description: 'وصلت الشحنة متأخرة عن الموعد المتوقع' },
    ],
  },
];

const ReturnSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const ORDER_STATUS_FIELDS = React.useMemo(() => getOrderStatusFields(t), [t]);
  const DISPLAY_FIELDS = React.useMemo(() => getDisplayFields(t), [t]);
  const DEFAULT_DATA = React.useMemo(() => getDefaultData(t), [t]);
  const DEFAULT_DISPLAY_CONFIG = React.useMemo(() => ({
    showOrderColumn: true,
    showCustomerColumn: true,
    showCustomerRating: true,
    showCustomerSuccessScore: true,
    showCustomerPhone: true,
    showReasonColumn: true,
    showResponsiblePartyColumn: true,
    showStatusColumn: true,
    showReviewColumn: true,
    showDateColumn: true,
    showActionsColumn: true,
  }), [ORDER_STATUS_FIELDS]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as "display" | "reasons" | "types") || "display";
  const [activeTab, setActiveTabState] = useState<"display" | "reasons" | "types">(
    ["display", "reasons", "types"].includes(initialTab) ? initialTab : "display",
  );

  const setActiveTab = (tab: "display" | "reasons" | "types") => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab") as "display" | "reasons" | "types" | null;
    if (tabParam && ["display", "reasons", "types"].includes(tabParam) && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  // Display settings state
  const [displayConfig, setDisplayConfig] = useState<ReviewDisplayConfig>(
    DEFAULT_DISPLAY_CONFIG,
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reasons state (existing)
  const [categories, setCategories] = useState<ReturnReasonCategory[]>([]);
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ReturnReasonCategory | null>(null);
  const [editingReason, setEditingReason] = useState<ReturnReason | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [defaultRole, setDefaultRole] = useState<
    "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER"
  >("OTHER");

  const [reasonText, setReasonText] = useState("");
  const [reasonDesc, setReasonDesc] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Return Types (أنواع المرتجع حسب شركة الشحن)
  const [shippingCompanies, setShippingCompanies] = useState<
    ReturnShippingCompany[]
  >([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ReturnType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeShippingCompanyId, setTypeShippingCompanyId] = useState("");
  const [typeCode, setTypeCode] = useState<ReturnTypeCode>("SENDER_PAYS");
  const [typeCostModel, setTypeCostModel] =
    useState<ReturnTypeCostModel>("FULL");
  const [typeFixedAmount, setTypeFixedAmount] = useState("");
  const [savingType, setSavingType] = useState(false);

  // Load display settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await returnService.getSettings();
      const data: ReturnSettingsData = res.data;
      if (data.reviewDisplayConfig) {
        setDisplayConfig({
          ...DEFAULT_DISPLAY_CONFIG,
          ...data.reviewDisplayConfig,
        });
      }
    } catch (error) {
      console.error("Failed to load display settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchReasonsData = async () => {
    setLoading(true);
    try {
      const [catRes, resRes] = await Promise.all([
        returnService.getCategories(),
        returnService.getReasons(),
      ]);
      setCategories(catRes.data);
      setReasons(resRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    setTypesLoading(true);
    try {
      const res = await returnService.getReturnShippingCompanies();
      setShippingCompanies(res.data.data);
    } catch (error) {
      console.error("Failed to load return types:", error);
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchReasonsData();
  }, []);

  useEffect(() => {
    if (activeTab === "types") {
      fetchTypes();
    }
  }, [activeTab]);

  const handleSaveDisplayConfig = async () => {
    setSaving(true);
    try {
      await returnService.updateSettings({
        reviewDisplayConfig: displayConfig,
      });
      toast.success(t('returns.k_92'));
    } catch (error) {
      toast.error(t('returns.k_93'));
    } finally {
      setSaving(false);
    }
  };

  const toggleDisplayField = (key: keyof ReviewDisplayConfig) => {
    setDisplayConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isOrderStatusVisible = (code: string) => {
    const arr = displayConfig.visibleOrderStatuses;
    return !arr || arr.includes(code);
  };

  const toggleOrderStatusField = (code: string) => {
    setDisplayConfig((prev) => {
      const arr = prev.visibleOrderStatuses || ORDER_STATUS_FIELDS.map((f) => f.code);
      if (arr.includes(code)) {
        return { ...prev, visibleOrderStatuses: arr.filter((c) => c !== code) };
      }
      return { ...prev, visibleOrderStatuses: [...arr, code] };
    });
  };

  const addDefaults = async () => {
    if (!confirm(t('returns.k_94'))) return;
    setLoading(true);
    try {
      for (const catData of DEFAULT_DATA) {
        const catRes = await returnService.createCategory({
          name: catData.name,
          defaultRole: catData.defaultRole as any,
        });
        const catId = catRes.data.id;
        for (const reasonData of catData.reasons) {
          await returnService.createReason({
            reason: reasonData.reason,
            description: reasonData.description,
            categoryId: catId,
          });
        }
      }
      toast.success(t('returns.k_95'));
      fetchReasonsData();
    } catch (error) {
      console.error(error);
      toast.error(t('returns.k_96'));
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await returnService.updateCategory(editingCategory.id, {
          name: categoryName,
          defaultRole,
        });
        toast.success(t('returns.k_97'));
      } else {
        await returnService.createCategory({ name: categoryName, defaultRole });
        toast.success(t('returns.k_98'));
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName("");
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_99'));
    }
  };

  const handleSaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReason) {
        await returnService.updateReason(editingReason.id, {
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('returns.k_100'));
      } else {
        await returnService.createReason({
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('returns.k_101'));
      }
      setIsReasonModalOpen(false);
      setEditingReason(null);
      setReasonText("");
      setReasonDesc("");
      setSelectedCategoryId("");
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_99'));
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm(t('returns.k_102'))) return;
    try {
      await returnService.deleteReason(id);
      toast.success(t('returns.k_103'));
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_104'));
    }
  };

  const openTypeModal = (type?: ReturnType, presetCompanyId?: string) => {
    setEditingType(type || null);
    setTypeName(type?.name || "");
    setTypeShippingCompanyId(type?.shippingCompanyId || presetCompanyId || "");
    setTypeCode(type?.code || "SENDER_PAYS");
    setTypeCostModel(type?.costModel || "FULL");
    setTypeFixedAmount(
      type?.fixedAmount != null ? String(type.fixedAmount) : "",
    );
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeShippingCompanyId) {
      toast.error(t('returns.k_257'));
      return;
    }
    setSavingType(true);
    try {
      const fixedAmount =
        typeCostModel === "FIXED" && typeFixedAmount !== ""
          ? parseFloat(typeFixedAmount)
          : null;
      if (editingType) {
        await returnService.updateReturnType(editingType.id, {
          name: typeName,
          code: typeCode,
          costModel: typeCostModel,
          shippingCompanyId: typeShippingCompanyId,
          fixedAmount,
        });
      } else {
        await returnService.createReturnType({
          name: typeName,
          code: typeCode,
          costModel: typeCostModel,
          shippingCompanyId: typeShippingCompanyId,
          fixedAmount: fixedAmount ?? undefined,
        });
      }
      toast.success(t('returns.k_248'));
      setIsTypeModalOpen(false);
      fetchTypes();
    } catch (error) {
      const serverMsg = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      if (serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error(t('returns.k_249'));
      }
    } finally {
      setSavingType(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm(t('returns.k_252'))) return;
    try {
      await returnService.deleteReturnType(id);
      toast.success(t('returns.k_250'));
      fetchTypes();
    } catch (error) {
      toast.error(t('returns.k_251'));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t('returns.k_261'))) return;
    try {
      await returnService.deleteCategory(id);
      toast.success(t('returns.k_262'));
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_263'));
    }
  };

  return (
    <div
      className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white"
      dir="rtl"
    >
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            {t('returns.k_160')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {t('returns.k_161')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 w-full sm:w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab("display")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "display"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <Eye size={16} /> {t('returns.k_162')}
        </button>
        <button
          onClick={() => setActiveTab("reasons")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "reasons"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <Tag size={16} /> {t('returns.k_163')}
        </button>
        <button
          onClick={() => setActiveTab("types")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "types"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <Truck size={16} /> {t('returns.k_230')}
        </button>
      </div>

      {/* Tab: Display Settings */}
      {activeTab === "display" && (
        <div className="space-y-6">
          {/* Columns Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {t('returns.k_164')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('returns.k_165')}
                </p>
              </div>
            </div>

            {settingsLoading ? (
              <div className="text-center py-8 text-gray-400">
                {t('returns.k_144')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DISPLAY_FIELDS.filter((f) => f.section === "columns").map(
                  (field) => (
                    <div
                      key={field.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            displayConfig[field.key]
                              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {displayConfig[field.key] ? (
                            <Eye size={18} />
                          ) : (
                            <EyeOff size={18} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-white">
                            {field.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {field.description}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={displayConfig[field.key]}
                        onCheckedChange={() => toggleDisplayField(field.key)}
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {t('returns.k_166')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('returns.k_167')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DISPLAY_FIELDS.filter((f) => f.section === "controls").map(
                (field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          displayConfig[field.key]
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {displayConfig[field.key] ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-white">
                          {field.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {field.description}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={displayConfig[field.key]}
                      onCheckedChange={() => toggleDisplayField(field.key)}
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white">
                    {t('returns.k_170')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('returns.k_171')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ORDER_STATUS_FIELDS.map((field) => (
                  <div
                    key={field.code}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isOrderStatusVisible(field.code)
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {isOrderStatusVisible(field.code) ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-white">
                          {field.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {field.code}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isOrderStatusVisible(field.code)}
                      onCheckedChange={() => toggleOrderStatusField(field.code)}
                    />
                  </div>
                ))}
              </div>
            </div>

          {/* Start Date Filter Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  تاريخ بدء ظهور الطلبات والمرتجعات
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تحديد تاريخ بداية الشغل على النظام بحيث تظهر فقط الطلبات والمرتجعات المنشأة من هذا التاريخ وما بعده
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-md">
              <input
                type="date"
                value={displayConfig.ordersStartDate ? displayConfig.ordersStartDate.split('T')[0] : ""}
                onChange={(e) =>
                  setDisplayConfig((prev) => ({
                    ...prev,
                    ordersStartDate: e.target.value || undefined,
                  }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {displayConfig.ordersStartDate && (
                <button
                  type="button"
                  onClick={() =>
                    setDisplayConfig((prev) => ({
                      ...prev,
                      ordersStartDate: undefined,
                    }))
                  }
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline font-medium"
                >
                  إلغاء تاريخ البدء (عرض جميع البيانات القديمة)
                </button>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveDisplayConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-sm"
            >
              <Save size={18} />
              {saving ? t('returns.k_105') : t('returns.k_106')}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Reasons (existing) */}
      {activeTab === "reasons" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={addDefaults}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
            >
              <Sparkles size={18} /> {t('returns.k_172')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories List */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <FolderPlus size={20} className="text-blue-500" /> {t('returns.k_173')}
                </h2>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryName("");
                    setDefaultRole("OTHER");
                    setIsCategoryModalOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {t('returns.k_174')}
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('returns.k_144')}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    {t('returns.k_175')}
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {cat.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Shield size={12} />{t('returns.k_107')}{" "}
                          {cat.defaultRole}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setDefaultRole(cat.defaultRole);
                            setIsCategoryModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reasons List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Tag size={20} className="text-green-500" /> {t('returns.k_176')}
                </h2>
                <button
                  onClick={() => {
                    setEditingReason(null);
                    setReasonText("");
                    setReasonDesc("");
                    setSelectedCategoryId(categories[0]?.id || "");
                    setIsReasonModalOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {t('returns.k_177')}
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('returns.k_57')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('returns.k_178')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('returns.k_61')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">
                        {t('returns.k_67')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-center text-gray-500 dark:text-gray-400"
                        >
                          {t('returns.k_144')}
                        </td>
                      </tr>
                    ) : reasons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-center text-gray-400"
                        >
                          {t('returns.k_179')}
                        </td>
                      </tr>
                    ) : (
                      reasons.map((reason) => (
                        <tr
                          key={reason.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {reason.reason}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {reason.description}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                              {reason.category?.name || t('returns.k_108')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {reason.isActive ? (
                              <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                                <CheckCircle size={14} /> {t('returns.k_180')}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs">
                                <XCircle size={14} /> {t('returns.k_181')}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-left pl-6">
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setEditingReason(reason);
                                  setReasonText(reason.reason);
                                  setReasonDesc(reason.description || "");
                                  setSelectedCategoryId(
                                    reason.categoryId || "",
                                  );
                                  setIsReasonModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => deleteReason(reason.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Category Modal */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  {editingCategory ? t('returns.k_109') : t('returns.k_110')}
                </h3>
                <form onSubmit={handleSaveCategory}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_182')}
                      </label>
                      <input
                        type="text"
                        required
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_183')}
                      </label>
                      <select
                        value={defaultRole}
                        onChange={(e) => setDefaultRole(e.target.value as any)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="CUSTOMER">
                          {t('returns.k_184')}
                        </option>
                        <option value="STORE">{t('returns.k_111')}</option>
                        <option value="SHIPPING">
                          {t('returns.k_185')}
                        </option>
                        <option value="OTHER">{t('returns.k_112')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('returns.k_158')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('returns.k_186')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reason Modal */}
          {isReasonModalOpen && (
            <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  {editingReason ? t('returns.k_113') : t('returns.k_114')}
                </h3>
                <form onSubmit={handleSaveReason}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_187')}
                      </label>
                      <input
                        type="text"
                        required
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_178')}
                      </label>
                      <select
                        required
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">{t('returns.k_115')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_188')}
                      </label>
                      <textarea
                        value={reasonDesc}
                        onChange={(e) => setReasonDesc(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsReasonModalOpen(false)}
                      className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('returns.k_158')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('returns.k_186')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Return Types (أنواع المرتجع حسب شركة الشحن) */}
      {activeTab === "types" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {t('returns.k_230')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('returns.k_231')}
                </p>
              </div>
            </div>
            <button
              onClick={() => openTypeModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} /> {t('returns.k_234')}
            </button>
          </div>

          {typesLoading ? (
            <div className="text-center py-8 text-gray-400">
              {t('returns.k_144')}
            </div>
          ) : shippingCompanies.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
              {t('returns.k_233')}
            </div>
          ) : (
            <div className="space-y-6">
              {shippingCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <Truck size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {company.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {company.returnTypes?.length || 0}{" "}
                          {t('returns.k_255')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openTypeModal(undefined, company.id)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={14} /> {t('returns.k_234')}
                    </button>
                  </div>

                  {!company.returnTypes || company.returnTypes.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                      {t('returns.k_240')}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {company.returnTypes.map((type) => (
                        <div
                          key={type.id}
                          className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {type.name}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  type.isActive
                                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {type.isActive
                                  ? t('returns.k_259')
                                  : t('returns.k_260')}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
                                {type.code}
                              </span>
                              <span>{t(`returns.k_${typeCodeKey(type.code)}`)}</span>
                              <span>•</span>
                              <span>{t(`returns.k_${costModelKey(type.costModel)}`)}</span>
                              {type.costModel === "FIXED" &&
                                type.fixedAmount != null && (
                                  <span className="font-medium">
                                    {type.fixedAmount}{" "}
                                    {t('returns.k_22')}
                                  </span>
                                )}
                            </div>
                          </div>
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openTypeModal(type)}
                              className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                              title={t('returns.k_235')}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteType(type.id)}
                              className="text-red-400 hover:text-red-600"
                              title={t('returns.k_250')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Type Modal */}
          {isTypeModalOpen && (
            <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  {editingType ? t('returns.k_235') : t('returns.k_234')}
                </h3>
                <form onSubmit={handleSaveType}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_236')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={typeName}
                        onChange={(e) => setTypeName(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_254')} *
                      </label>
                      <select
                        required
                        value={typeShippingCompanyId}
                        onChange={(e) => setTypeShippingCompanyId(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">{t('returns.k_115')}</option>
                        {shippingCompanies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_237')} *
                      </label>
                      <select
                        required
                        value={typeCode}
                        onChange={(e) =>
                          setTypeCode(e.target.value as ReturnTypeCode)
                        }
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="SENDER_PAYS">{t('returns.k_241')}</option>
                        <option value="RECIPIENT_PAYS">{t('returns.k_242')}</option>
                        <option value="CANCELLED">{t('returns.k_243')}</option>
                        <option value="CUSTOM">{t('returns.k_244')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('returns.k_238')} *
                      </label>
                      <select
                        required
                        value={typeCostModel}
                        onChange={(e) =>
                          setTypeCostModel(
                            e.target.value as ReturnTypeCostModel,
                          )
                        }
                        className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="FULL">{t('returns.k_245')}</option>
                        <option value="NONE">{t('returns.k_246')}</option>
                        <option value="FIXED">{t('returns.k_247')}</option>
                      </select>
                    </div>
                    {typeCostModel === "FIXED" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('returns.k_239')} *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={typeFixedAmount}
                          onChange={(e) => setTypeFixedAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsTypeModalOpen(false)}
                      className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('returns.k_158')}
                    </button>
                    <button
                      type="submit"
                      disabled={savingType}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingType ? t('returns.k_105') : t('returns.k_186')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReturnSettingsPage;
