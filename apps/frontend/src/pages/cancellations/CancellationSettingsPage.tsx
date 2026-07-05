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

const DEFAULT_DATA = [
  {
    name: "العميل",
    reasons: [
      { reason: "العميل طلب الإلغاء", description: "تواصل العميل وطلب إلغاء الطلب" },
      { reason: "رقم الهاتف غير صحيح", description: "رقم الهاتف المسجل خطأ أو لا يعمل" },
      { reason: "غير مرغوب فيه", description: "العميل غير راغب في استلام الطلب" },
    ],
  },
  {
    name: "المخزون",
    reasons: [
      { reason: "نفاد المخزون", description: "المنتج غير متوفر في المخزون" },
      { reason: "خطأ في السعر", description: "تم تسعير المنتج بشكل خاطئ" },
    ],
  },
  {
    name: "الشحن",
    reasons: [
      { reason: "الشحن غير متاح", description: "لا يمكن الشحن إلى المنطقة المطلوبة" },
      { reason: "تأخير في التوصيل", description: "تأخر التوصيل عن الموعد المحدد" },
    ],
  },
];

const CancellationSettingsPage: React.FC = () => {
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
      toast.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addDefaults = async () => {
    if (!confirm("سيتم إضافة بيانات افتراضية. هل أنت متأكد؟")) return;
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
      toast.success("تم إضافة البيانات الافتراضية بنجاح");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("فشل في إضافة البيانات الافتراضية");
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await cancellationService.updateCategory(editingCategory.id, { name: categoryName });
        toast.success("تم تحديث التصنيف");
      } else {
        await cancellationService.createCategory({ name: categoryName });
        toast.success("تم إنشاء التصنيف");
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName("");
      fetchData();
    } catch (error) {
      toast.error("فشل في الحفظ");
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
        toast.success("تم تحديث السبب");
      } else {
        await cancellationService.createReason({
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success("تم إنشاء السبب");
      }
      setIsReasonModalOpen(false);
      setEditingReason(null);
      setReasonText("");
      setReasonDesc("");
      setSelectedCategoryId("");
      fetchData();
    } catch (error) {
      toast.error("فشل في الحفظ");
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السبب؟")) return;
    try {
      await cancellationService.deleteReason(id);
      toast.success("تم الحذف");
      fetchData();
    } catch (error) {
      toast.error("فشل في الحذف");
    }
  };

  return (
    <div
      className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white"
      dir="rtl"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            إعدادات أسباب الإلغاء
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            إدارة تصنيفات وأسباب إلغاء الطلبات
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={addDefaults}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors text-sm"
          >
            <Sparkles size={18} /> اقتراحات ذكية
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <FolderPlus size={20} className="text-blue-500" /> التصنيفات
            </h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName("");
                setIsCategoryModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + إضافة
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-gray-400">لا توجد تصنيفات</div>
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
              <Tag size={20} className="text-green-500" /> أسباب الإلغاء
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
              + إضافة سبب
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">السبب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">التصنيف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase pl-6">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</td>
                  </tr>
                ) : reasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">لا توجد أسباب</td>
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
                          {reason.category?.name || "غير مصنف"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {reason.isActive ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                            <CheckCircle size={14} /> نشط
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs">
                            <XCircle size={14} /> معطل
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
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {editingCategory ? "تعديل تصنيف" : "تصنيف جديد"}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم التصنيف (مثال: العميل، المخزون، الشحن)
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {editingReason ? "تعديل سبب" : "سبب جديد"}
            </h3>
            <form onSubmit={handleSaveReason}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    السبب (مثال: العميل طلب الإلغاء)
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
                    التصنيف
                  </label>
                  <select
                    required
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">اختر تصنيفاً...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    وصف إضافي
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
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationSettingsPage;
