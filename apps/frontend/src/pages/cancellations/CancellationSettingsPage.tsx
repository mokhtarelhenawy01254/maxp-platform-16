import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  cancellationService,
  CancellationReason,
  CancellationReasonCategory,
} from "../../services/cancellationService";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Tag,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { CategoryModal } from "./components/CategoryModal";
import { ReasonModal } from "./components/ReasonModal";

const getDefaultData = (t: any) => [
  {
    name: t('cancellations.k_1'),
    reasons: [
      { reason: t('cancellations.k_2'), description: t('cancellations.k_3') },
      { reason: t('cancellations.k_4'), description: t('cancellations.k_5') },
      { reason: t('cancellations.k_6'), description: t('cancellations.k_7') },
    ],
  },
  {
    name: t('cancellations.k_8'),
    reasons: [
      { reason: t('cancellations.k_9'), description: t('cancellations.k_10') },
      { reason: t('cancellations.k_11'), description: t('cancellations.k_12') },
    ],
  },
  {
    name: t('cancellations.k_13'),
    reasons: [
      { reason: t('cancellations.k_14'), description: t('cancellations.k_15') },
      { reason: t('cancellations.k_16'), description: t('cancellations.k_17') },
    ],
  },
];

const CancellationSettingsPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {
  const { t } = useTranslation();
  const DEFAULT_DATA = React.useMemo(() => getDefaultData(t), [t]);
  const [categories, setCategories] = useState<CancellationReasonCategory[]>([]);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CancellationReasonCategory | null>(null);
  const [editingReason, setEditingReason] = useState<CancellationReason | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [reasonDesc, setReasonDesc] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, resRes] = await Promise.all([
        cancellationService.getCategories(),
        cancellationService.getReasons(),
      ]);
      setCategories(catRes.data);
      setReasons(resRes.data);
    } catch (error) {
      toast.error(t('cancellations.k_18'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addDefaults = async () => {
    if (!confirm(t('cancellations.k_19'))) return;
    setLoading(true);
    try {
      for (const catData of DEFAULT_DATA) {
        const catRes = await cancellationService.createCategory({ name: catData.name });
        const catId = catRes.data.id;
        for (const reasonData of catData.reasons) {
          await cancellationService.createReason({
            reason: reasonData.reason,
            description: reasonData.description,
            categoryId: catId,
          });
        }
      }
      toast.success(t('cancellations.k_20'));
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(t('cancellations.k_21'));
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await cancellationService.updateCategory(editingCategory.id, { name: categoryName });
        toast.success(t('cancellations.k_22'));
      } else {
        await cancellationService.createCategory({ name: categoryName });
        toast.success(t('cancellations.k_23'));
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName("");
      fetchData();
    } catch (error) {
      toast.error(t('cancellations.k_24'));
    }
  };

  const handleSaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReason) {
        await cancellationService.updateReason(editingReason.id, {
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('cancellations.k_25'));
      } else {
        await cancellationService.createReason({
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('cancellations.k_26'));
      }
      setIsReasonModalOpen(false);
      setEditingReason(null);
      setReasonText("");
      setReasonDesc("");
      setSelectedCategoryId("");
      fetchData();
    } catch (error) {
      toast.error(t('cancellations.k_24'));
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm(t('cancellations.k_27'))) return;
    try {
      await cancellationService.deleteReason(id);
      toast.success(t('cancellations.k_28'));
      fetchData();
    } catch (error) {
      toast.error(t('cancellations.k_29'));
    }
  };

  return (
    <div
      className={isEmbedded ? "" : "p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white"}
      dir="rtl"
    >
      {!isEmbedded && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {t('cancellations.k_43')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('cancellations.k_44')}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={addDefaults}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors text-sm"
          >
            <Sparkles size={18} /> {t('cancellations.k_45')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <FolderPlus size={20} className="text-blue-500" /> {t('cancellations.k_46')}
            </h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName("");
                setIsCategoryModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('cancellations.k_47')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('cancellations.k_30')}</div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-gray-400">{t('cancellations.k_31')}</div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryName(cat.name);
                      setIsCategoryModalOpen(true);
                    }}
                    className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reasons List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Tag size={20} className="text-green-500" /> {t('cancellations.k_48')}
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
              {t('cancellations.k_49')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('cancellations.k_32')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('cancellations.k_33')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('cancellations.k_34')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">{t('cancellations.k_35')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">{t('cancellations.k_30')}</td>
                  </tr>
                ) : reasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">{t('cancellations.k_36')}</td>
                  </tr>
                ) : (
                  reasons.map((reason) => (
                    <tr key={reason.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{reason.reason}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{reason.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                          {reason.category?.name || t('cancellations.k_37')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {reason.isActive ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                            <CheckCircle size={14} /> {t('cancellations.k_50')}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs">
                            <XCircle size={14} /> {t('cancellations.k_51')}
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
                              setSelectedCategoryId(reason.categoryId || "");
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
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        isEditing={Boolean(editingCategory)}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
      />

      {/* Reason Modal */}
      <ReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        onSave={handleSaveReason}
        isEditing={Boolean(editingReason)}
        reasonText={reasonText}
        setReasonText={setReasonText}
        reasonDesc={reasonDesc}
        setReasonDesc={setReasonDesc}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        categories={categories}
      />
    </div>
  );
};

export default CancellationSettingsPage;
