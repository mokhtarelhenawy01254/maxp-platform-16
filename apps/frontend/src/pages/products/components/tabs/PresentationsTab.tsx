import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { getImageUrl } from "../../../../utils/imageUrl";
import type { ProductPresentation } from "../../hooks/useProductPresentations";

interface PresentationsTabProps {
  presentations: ProductPresentation[];
  loading: boolean;
  productId: string | null;
  productSlug?: string;
  storefrontOrigin?: string;
  onAdd: (data: Partial<ProductPresentation>) => Promise<any>;
  onUpdate: (id: string, data: Partial<ProductPresentation>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const PresentationsTab: React.FC<PresentationsTabProps> = ({
  presentations,
  loading,
  productId,
  productSlug,
  storefrontOrigin,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editState, setEditState] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      onRefresh();
    }
  }, [productId]);

  const generateSlug = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleAdd = async () => {
    const name = editState._newName?.trim();
    if (!name) {
      setError("الرجاء إدخال اسم العرض التقديمي");
      return;
    }
    setError(null);
    try {
      await onAdd({
        name,
        slug: editState._newSlug?.trim() || generateSlug(name),
        images: editState._newImages || [],
        mainImage: editState._newMainImage || null,
        title: editState._newTitle?.trim() || null,
        description: editState._newDescription?.trim() || null,
        isActive: true,
        sortOrder: presentations.length,
      });
      setEditState({});
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (presentation: ProductPresentation) => {
    const id = presentation.id!;
    const changes = editState[id];
    if (!changes) return;

    const updateData: Partial<ProductPresentation> = {};
    if (changes.name !== undefined) updateData.name = changes.name;
    if (changes.slug !== undefined) updateData.slug = changes.slug;
    if (changes.title !== undefined) updateData.title = changes.title;
    if (changes.description !== undefined) updateData.description = changes.description;
    if (changes.images !== undefined) updateData.images = changes.images;
    if (changes.mainImage !== undefined) updateData.mainImage = changes.mainImage;
    if (changes.isActive !== undefined) updateData.isActive = changes.isActive;
    if (changes.sortOrder !== undefined) updateData.sortOrder = changes.sortOrder;

    if (Object.keys(updateData).length > 0) {
      try {
        await onUpdate(id, updateData);
        setEditState((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleImageUpload = async (presentation: ProductPresentation, file: File) => {
    const formData = new FormData();
    formData.append("images", file);
    try {
      const { apiClient } = await import("../../../../services/apiClient");
      const res = await apiClient.post(`/products/${productId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success && res.data.data?.uploadedImages) {
        const urls: string[] = res.data.data.uploadedImages;
        const currentImages = editState[presentation.id!]?.images ?? presentation.images ?? [];
        const newImages = [...currentImages, ...urls];
        setEditState((prev) => ({
          ...prev,
          [presentation.id!]: { ...prev[presentation.id!], images: newImages, mainImage: currentImages.length === 0 ? urls[0] : prev[presentation.id!]?.mainImage },
        }));
      }
    } catch {
      setError("فشل في رفع الصورة");
    }
  };

  const removeImage = (presentation: ProductPresentation, imageIdx: number) => {
    const currentImages = editState[presentation.id!]?.images ?? presentation.images ?? [];
    const newImages = currentImages.filter((_: string, i: number) => i !== imageIdx);
    const currentMain = editState[presentation.id!]?.mainImage ?? presentation.mainImage;
    setEditState((prev) => ({
      ...prev,
      [presentation.id!]: {
        ...prev[presentation.id!],
        images: newImages,
        mainImage: currentMain === currentImages[imageIdx] ? (newImages[0] || null) : currentMain,
      },
    }));
  };

  const setAsMain = (presentation: ProductPresentation, imageUrl: string) => {
    setEditState((prev) => ({
      ...prev,
      [presentation.id!]: { ...prev[presentation.id!], mainImage: imageUrl },
    }));
  };

  const getImages = (pres: ProductPresentation) =>
    editState[pres.id!]?.images ?? pres.images ?? [];

  const getMainImage = (pres: ProductPresentation) =>
    editState[pres.id!]?.mainImage ?? pres.mainImage;

  // صورة مصغّرة للعرض: الأساسية → أول صورة → افتار بحرف الاسم
  const getThumbnail = (pres: ProductPresentation): string => {
    const main = getMainImage(pres);
    if (main) return main;
    const images = getImages(pres);
    return images[0] || "";
  };

  // اللينك الكامل للعرض التقديمي: /products/{productSlug|productId}/{presentationSlug}
  // (نفضّل الـ slug لأنه أنضف للإعلانات، والـ id fallback دايماً بيشتغل على الستورفرونت)
  const buildPresentationUrl = (pres: ProductPresentation) => {
    const presSlug = encodeURIComponent(editState[pres.id!]?.slug ?? pres.slug);
    const productKey = productSlug
      ? encodeURIComponent(productSlug)
      : productId
        ? encodeURIComponent(productId)
        : "";
    return `/products/${productKey}/${presSlug}`;
  };

  // الرابط الكامل على المتجر (لو معروفين الـ origin بنستخدمه وإلا نسبي)
  const buildFullPresentationUrl = (pres: ProductPresentation) => {
    const relative = buildPresentationUrl(pres);
    if (!storefrontOrigin) {
      return relative;
    }
    return `${storefrontOrigin.replace(/\/$/, "")}${relative}`;
  };

  const openPresentationPage = (pres: ProductPresentation) => {
    const url = buildFullPresentationUrl(pres);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!productId) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6 animate-fade-in">
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
            <LinkIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            العروض التقديمية (Presentations)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            أنشئ روابط مخصصة لهذا المنتج (بصور وعناوين مختلفة) مناسبة
            للحملات الإعلانية ومجموعات العملاء المختلفة — دون تكرار المنتج في
            الكتالوج أو تقسيم المخزون.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <span>💡</span>
            <span>احفظ المنتج أولاً لتتمكن من إضافة عروض تقديمية له</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <PhotoIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                العروض التقديمية ({presentations.length})
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أنشئ عروض تقديمية مختلفة لنفس المنتج — كل عرض له صوره ورابطه المستقل
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-3 rounded-l-md">
            <div className="flex items-center gap-2">
              <XMarkIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="space-y-3">
            {presentations.map((pres) => {
              const isExpanded = expandedId === pres.id;
              const images = getImages(pres);
              const mainImage = getMainImage(pres);
              const presEdit = editState[pres.id!] || {};

              return (
                <div
                  key={pres.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                >
                  {/* Header (collapsed) */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(pres.id!)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold shrink-0">
                        {getThumbnail(pres) ? (
                          <img
                            src={getImageUrl(getThumbnail(pres)) || ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          pres.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {presEdit.name ?? pres.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 dir-ltr text-left">
                          {buildPresentationUrl(pres)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPresentationPage(pres);
                        }}
                        title="فتح صفحة العرض في المتجر"
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        فتح الصفحة
                      </button>
                      {presEdit.isActive ?? pres.isActive ? (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          غير نشط
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-600 p-4 space-y-4">
                      {/* Name & Slug */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الاسم
                          </label>
                          <input
                            type="text"
                            value={presEdit.name ?? pres.name}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [pres.id!]: { ...prev[pres.id!], name: e.target.value },
                              }))
                            }
                            className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الرابط
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 shrink-0">/products/</span>
                            <input
                              type="text"
                              value={presEdit.slug ?? pres.slug}
                              onChange={(e) =>
                                setEditState((prev) => ({
                                  ...prev,
                                  [pres.id!]: { ...prev[pres.id!], slug: e.target.value },
                                }))
                              }
                              className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            عنوان مخصص
                          </label>
                          <input
                            type="text"
                            value={presEdit.title ?? pres.title ?? ""}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [pres.id!]: { ...prev[pres.id!], title: e.target.value },
                              }))
                            }
                            placeholder="يورث من اسم المنتج"
                            className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الحالة
                          </label>
                          <select
                            value={presEdit.isActive ?? pres.isActive ? "active" : "inactive"}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [pres.id!]: { ...prev[pres.id!], isActive: e.target.value === "active" },
                              }))
                            }
                            className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                          >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          وصف مخصص
                        </label>
                        <textarea
                          rows={2}
                          value={presEdit.description ?? pres.description ?? ""}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [pres.id!]: { ...prev[pres.id!], description: e.target.value },
                            }))
                          }
                          placeholder="يورث من وصف المنتج"
                          className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                        />
                      </div>

                      {/* Images */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          الصور
                        </label>
                        <div className="flex gap-3 flex-wrap">
                          {images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={getImageUrl(img)}
                                alt=""
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                {mainImage !== img && (
                                  <button
                                    type="button"
                                    onClick={() => setAsMain(pres, img)}
                                    className="p-1 bg-white/90 rounded text-xs font-medium text-indigo-600 hover:bg-white"
                                    title="تعيين كأساسية"
                                  >
                                    ★
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeImage(pres, imgIdx)}
                                  className="p-1 bg-white/90 rounded text-xs font-medium text-red-600 hover:bg-white"
                                >
                                  ✕
                                </button>
                              </div>
                              {mainImage === img && (
                                <span className="absolute -top-1 -left-1 bg-yellow-400 text-xs px-1 rounded font-bold">
                                  أساسية
                                </span>
                              )}
                            </div>
                          ))}
                          <label className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                            <PlusIcon className="h-6 w-6 text-gray-400" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(pres, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Description preview */}
                      <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        الرابط: {buildPresentationUrl(pres)} (رابط فريد قابل للتتبع)
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openPresentationPage(pres)}
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            فتح الصفحة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("هل أنت متأكد من حذف هذا العرض التقديمي؟")) {
                                onDelete(pres.id!);
                              }
                            }}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            حذف
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditState((prev) => {
                                const next = { ...prev };
                                delete next[pres.id!];
                                return next;
                              });
                              setExpandedId(null);
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdate(pres)}
                            disabled={!editState[pres.id!] || Object.keys(editState[pres.id!] || {}).length === 0}
                            className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add new presentation */}
        {isAdding ? (
          <div className="mt-4 border border-dashed border-purple-300 dark:border-purple-600 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم العرض التقديمي
                </label>
                <input
                  type="text"
                  value={editState._newName ?? ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEditState((prev) => ({
                      ...prev,
                      _newName: name,
                      _newSlug: generateSlug(name),
                    }));
                  }}
                  placeholder="مثال: اختبار صور فيسبوك"
                  className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الرابط
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">
                    /products/{productId || productSlug || "..."}/
                  </span>
                  <input
                    type="text"
                    value={editState._newSlug ?? ""}
                    onChange={(e) =>
                      setEditState((prev) => ({ ...prev, _newSlug: e.target.value }))
                    }
                    className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عنوان مخصص (اختياري)
                </label>
                <input
                  type="text"
                  value={editState._newTitle ?? ""}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, _newTitle: e.target.value }))
                  }
                  placeholder="يورث من اسم المنتج"
                  className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditState((prev) => {
                      const next = { ...prev };
                      delete next._newName;
                      delete next._newSlug;
                      delete next._newTitle;
                      delete next._newDescription;
                      delete next._newImages;
                      delete next._newMainImage;
                      return next;
                    });
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  إضافة
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                وصف مخصص (اختياري)
              </label>
              <textarea
                rows={2}
                value={editState._newDescription ?? ""}
                onChange={(e) =>
                  setEditState((prev) => ({ ...prev, _newDescription: e.target.value }))
                }
                placeholder="يورث من وصف المنتج"
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة عرض تقديمي جديد
          </button>
        )}
      </div>
    </div>
  );
};
