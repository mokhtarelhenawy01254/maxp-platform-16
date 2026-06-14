import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, TagIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { toast } from "sonner";

const AssetCategories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await companyAwareApi.get("/hr/assets/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    setAdding(true);
    try {
      const response = await companyAwareApi.post(
        "/hr/assets/categories",
        newCategory,
      );
      if (response.data.success) {
        setNewCategory({ name: "", description: "" });
        fetchCategories();
      }
    } catch (error) {
      console.error("Error creating category:", error);
      alert("فشل في إضافة التصنيف");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;

    try {
      const response = await companyAwareApi.delete(`/hr/assets/categories/${id}`);
      if (response.data.success) {
        fetchCategories();
      }
    } catch (error) {
      alert("فشل في حذف التصنيف. قد يكون مرتبطاً بأصول.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <TagIcon className="h-6 w-6 text-indigo-600" />
            التصنيفات الحالية
          </h3>
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-full">
            {categories.length} تصنيف
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-400 animate-pulse">جاري تحميل التصنيفات...</p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <div className="h-20 w-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <TagIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-400">لا توجد تصنيفات بعد</h4>
            <p className="text-sm text-gray-400 mt-2">ابدأ بإضافة أول تصنيف من القائمة الجانبية</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {categories.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                        <h4 className="font-black text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                          {cat.name}
                        </h4>
                      </div>
                      {cat.description ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                          {cat.description}
                        </p>
                      ) : (
                        <div className="h-4 mb-4"></div>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                        <div className="flex items-center gap-1.5">
                          <PlusIcon className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-xs font-bold text-gray-400">
                            الأصول: {cat._count?.assets || 0}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="حذف"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Form */}
      <div className="lg:sticky lg:top-6 self-start">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden relative"
        >
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="p-6 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                <PlusIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                تصنيف جديد
              </h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-black text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-indigo-400" />
                  اسم التصنيف
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثل: أجهزة كمبيوتر، أثاث..."
                  className="block w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl py-3 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-indigo-400" />
                  وصف التصنيف
                </label>
                <textarea
                  placeholder="أضف وصفاً مختصراً..."
                  className="block w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl py-3 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium min-h-[100px]"
                  rows={3}
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
              >
                {adding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    إضافة التصنيف
                    <PlusIcon className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AssetCategories;
