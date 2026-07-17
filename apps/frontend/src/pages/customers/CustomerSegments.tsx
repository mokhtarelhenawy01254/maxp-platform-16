import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";

// ── Types ──────────────────────────────────────────
interface LeadCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  autoFollowUp: boolean;
  autoPromoteCategoryId: string | null;
  contactCount: number;
}

interface TagItem {
  name: string;
  count: number;
}

// ── Color presets for categories ───────────────────
const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280",
];

// ── Component ──────────────────────────────────────
const CustomerSegments: React.FC = () => {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");

  // ── Lead Categories state ──────────────────────
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState("");
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<LeadCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catAutoFollowUp, setCatAutoFollowUp] = useState(true);
  const [catSaving, setCatSaving] = useState(false);

  // ── Tags state ─────────────────────────────────
  const [tags, setTags] = useState<TagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState("");
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagActionLoading, setTagActionLoading] = useState(false);

  // ── Load categories ────────────────────────────
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError("");
    try {
      const res = await apiClient.get("/lead-categories");
      setCategories(res.data?.data || []);
    } catch (err: any) {
      setCatError(err.response?.data?.message || "فشل تحميل التصنيفات");
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ── Load tags ──────────────────────────────────
  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError("");
    try {
      const res = await apiClient.get("/customers/tags/distinct");
      setTags(res.data?.data || []);
    } catch (err: any) {
      setTagsError(err.response?.data?.message || "فشل تحميل الوسوم");
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  // ── Category CRUD ──────────────────────────────
  const resetCatForm = () => {
    setShowCatForm(false);
    setEditingCat(null);
    setCatName("");
    setCatColor("#6366f1");
    setCatAutoFollowUp(true);
  };

  const openEditCat = (cat: LeadCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatAutoFollowUp(cat.autoFollowUp);
    setShowCatForm(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      if (editingCat) {
        await apiClient.put(`/lead-categories/${editingCat.id}`, {
          name: catName.trim(),
          color: catColor,
          autoFollowUp: catAutoFollowUp,
        });
      } else {
        await apiClient.post("/lead-categories", {
          name: catName.trim(),
          color: catColor,
          autoFollowUp: catAutoFollowUp,
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
      await apiClient.delete(`/lead-categories/${id}`);
      await loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل حذف التصنيف");
    }
  };

  // ── Tag actions ────────────────────────────────
  const handleRenameTag = async (oldName: string) => {
    if (!newTagName.trim() || newTagName.trim() === oldName) return;
    setTagActionLoading(true);
    try {
      await apiClient.put("/customers/tags/rename", {
        oldName,
        newName: newTagName.trim(),
      });
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

  // ── Tab definitions ────────────────────────────
  const tabs = [
    { key: "categories" as const, label: "تصنيفات الليدات", icon: FolderIcon },
    { key: "tags" as const, label: "الوسوم", icon: TagIcon },
  ];

  // ── Render ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تقسيمات العملاء</h1>
          <p className="text-gray-600 dark:text-gray-400">إدارة تصنيفات العملاء والوسوم</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow dark:shadow-md overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Lead Categories ────────────────────── */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={() => { resetCatForm(); setShowCatForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 ml-2" />
              إضافة تصنيف
            </button>
          </div>

          {/* Inline form */}
          {showCatForm && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-md border border-indigo-200 dark:border-indigo-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="اسم التصنيف"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللون</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCatColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${
                          catColor === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catAutoFollowUp}
                      onChange={(e) => setCatAutoFollowUp(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">متابعة تلقائية</span>
                  </label>
                </div>
                <div className="flex items-end gap-2 justify-end">
                  <button
                    onClick={resetCatForm}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={catSaving || !catName.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {catSaving ? "جاري الحفظ..." : editingCat ? "تحديث" : "إضافة"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {catLoading && (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          )}

          {/* Error */}
          {catError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">{catError}</div>
          )}

          {/* Table */}
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
                          {cat.autoFollowUp
                            ? <span className="text-green-600 dark:text-green-400 text-sm">مفعلة</span>
                            : <span className="text-gray-400 text-sm">غير مفعلة</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" dir="ltr">{cat.sortOrder}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEditCat(cat)} className="text-indigo-600 hover:text-indigo-800">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700">
                              <TrashIcon className="h-4 w-4" />
                            </button>
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

      {/* ── TAB: Tags ────────────────────────────── */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          {/* Loading */}
          {tagsLoading && (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          )}

          {/* Error */}
          {tagsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">{tagsError}</div>
          )}

          {/* Tags table */}
          {!tagsLoading && !tagsError && (
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
                              <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameTag(tag.name);
                                  if (e.key === "Escape") { setRenamingTag(null); setNewTagName(""); }
                                }}
                              />
                              <button
                                onClick={() => handleRenameTag(tag.name)}
                                disabled={tagActionLoading}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => { setRenamingTag(null); setNewTagName(""); }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                إلغاء
                              </button>
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
                              <button
                                onClick={() => { setRenamingTag(tag.name); setNewTagName(tag.name); }}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="إعادة تسمية"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTag(tag.name)}
                                disabled={tagActionLoading}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                title="حذف"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
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
