import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  PhotoIcon,
  CheckIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { ProductAttribute, ProductVariant } from "../../types";
import { getImageUrl } from "../../../../utils/imageUrl";
import {
  groupVariantsByColor,
  detectGroupingAttributes,
  VariantColorGroup,
} from "../../utils/variantColorGrouping";

interface VariantColorImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: ProductVariant[];
  attributes?: ProductAttribute[];
  uploadedImages?: string[];
  onBatchUpdateVariants: (
    indices: number[],
    updates: Partial<ProductVariant> | ((v: ProductVariant) => Partial<ProductVariant>)
  ) => void;
  onUploadImageForVariants?: (
    indices: number[],
    file: File
  ) => Promise<string | undefined>;
  variantSettings?: any;
  setVariantSettings?: React.Dispatch<React.SetStateAction<any>>;
}

export const VariantColorImagesModal: React.FC<VariantColorImagesModalProps> = ({
  isOpen,
  onClose,
  variants,
  attributes = [],
  uploadedImages = [],
  onBatchUpdateVariants,
  onUploadImageForVariants,
  variantSettings,
  setVariantSettings,
}) => {
  const [selectedAttrKey, setSelectedAttrKey] = useState<string>("");
  const [uploadingGroupId, setUploadingGroupId] = useState<string | null>(null);
  const [customUrlInputs, setCustomUrlInputs] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Detect available grouping attributes (e.g. Color, Size)
  const availableAttrs = useMemo(() => {
    return detectGroupingAttributes(attributes, variants);
  }, [attributes, variants]);

  const activeAttrKey = selectedAttrKey || (availableAttrs[0]?.id ?? "");

  // Group variants by selected attribute (default: color)
  const groups = useMemo(() => {
    return groupVariantsByColor(variants, attributes, activeAttrKey);
  }, [variants, attributes, activeAttrKey]);

  if (!isOpen) return null;

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleApplyImageToGroup = (group: VariantColorGroup, imageUrl: string) => {
    if (!imageUrl) return;
    const indices = group.items.map((item) => item.index);

    onBatchUpdateVariants(indices, (v) => ({
      image: imageUrl,
      images:
        v.images && v.images.length > 0
          ? [imageUrl, ...v.images.filter((img) => img !== imageUrl)]
          : [imageUrl],
    }));

    // Optionally sync with variantSettings.attributeImages if available
    if (setVariantSettings && group.attributeName) {
      setVariantSettings((prev: any) => {
        const currentAttrImages = prev?.attributeImages || {};
        const attrKey = group.attributeName || "اللون";
        return {
          ...prev,
          attributeImages: {
            ...currentAttrImages,
            [attrKey]: {
              ...(currentAttrImages[attrKey] || {}),
              [group.name]: imageUrl,
            },
          },
        };
      });
    }

    showToast(`تم تطبيق الصورة على ${indices.length} مقاس للون "${group.name}"`);
  };

  const handleRemoveImageFromGroup = (group: VariantColorGroup) => {
    const indices = group.items.map((item) => item.index);
    onBatchUpdateVariants(indices, {
      image: undefined,
      images: [],
    });

    if (setVariantSettings && group.attributeName) {
      setVariantSettings((prev: any) => {
        const currentAttrImages = { ...(prev?.attributeImages || {}) };
        const attrKey = group.attributeName || "اللون";
        if (currentAttrImages[attrKey]) {
          const updatedSub = { ...currentAttrImages[attrKey] };
          delete updatedSub[group.name];
          currentAttrImages[attrKey] = updatedSub;
        }
        return {
          ...prev,
          attributeImages: currentAttrImages,
        };
      });
    }

    showToast(`تمت إزالة الصورة من مقاسات "${group.name}"`);
  };

  const handleFileUpload = async (
    group: VariantColorGroup,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const indices = group.items.map((item) => item.index);
    setUploadingGroupId(group.id);

    try {
      if (onUploadImageForVariants) {
        const uploadedUrl = await onUploadImageForVariants(indices, file);
        if (uploadedUrl) {
          handleApplyImageToGroup(group, uploadedUrl);
        }
      }
    } catch (err) {
      console.error("Error uploading image for group:", err);
    } finally {
      setUploadingGroupId(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleUrlSubmit = (group: VariantColorGroup) => {
    const url = customUrlInputs[group.id]?.trim();
    if (!url) return;
    handleApplyImageToGroup(group, url);
    setCustomUrlInputs((prev) => ({ ...prev, [group.id]: "" }));
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <PhotoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                تعيين صور المتغيرات حسب اللون
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ارفع أو اختر صورة لكل لون، وسيتم تعيينها لجميع مقاسات هذا اللون تلقائياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filter / Top Controls */}
        <div className="px-5 py-3 bg-gray-50/40 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              التجميع حسب:
            </span>
            {availableAttrs.length > 1 ? (
              <select
                value={activeAttrKey}
                onChange={(e) => setSelectedAttrKey(e.target.value)}
                className="text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md py-1 px-2.5 text-gray-800 dark:text-gray-200"
              >
                {availableAttrs.map((attr) => (
                  <option key={attr.id} value={attr.id}>
                    {attr.name} {attr.isColor ? "(اللون)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                {availableAttrs[0]?.name || "اللون"}
              </span>
            )}
          </div>

          <div className="text-gray-500 dark:text-gray-400 tabular-nums">
            تم كشف <span className="font-semibold text-gray-700 dark:text-gray-200">{groups.length}</span> مجموعة تغطي{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{variants.length}</span> متغير
          </div>
        </div>

        {/* Toast Alert */}
        {successToast && (
          <div className="mx-5 mt-3 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
            <CheckIcon className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              لا توجد متغيرات قابلة للتجميع حالياً.
            </div>
          ) : (
            groups.map((group) => {
              const isUploading = uploadingGroupId === group.id;
              const hasImage = Boolean(group.currentImage);
              const customUrl = customUrlInputs[group.id] || "";

              return (
                <div
                  key={group.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
                >
                  {/* Group Info Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {group.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 tabular-nums">
                        {group.items.length} مقاسات / متغيرات
                      </span>

                      {/* Pill tags for sizes */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {group.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                            title={item.variant.name}
                          >
                            {item.secondaryLabel || item.variant.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs">
                      {group.imagesCount === group.items.length && hasImage ? (
                        <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md font-medium">
                          ✓ مطبقة على كل المقاسات ({group.items.length})
                        </span>
                      ) : group.imagesCount > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md font-medium tabular-nums">
                          مطبقة على {group.imagesCount} من {group.items.length}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                          لم يتم تعيين صورة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Image Assignment Area */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    {/* Thumbnail Preview */}
                    <div className="relative flex-shrink-0">
                      {hasImage ? (
                        <div className="relative group/thumb w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                          <img
                            src={getImageUrl(group.currentImage!) || group.currentImage}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImageFromGroup(group)}
                            title="إزالة الصورة من هذا اللون"
                            className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white rounded p-1 shadow transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/30">
                          <PhotoIcon className="w-6 h-6 mb-1" />
                          <span className="text-[10px]">بدون صورة</span>
                        </div>
                      )}
                    </div>

                    {/* Controls: Upload & URL */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* File Upload Button */}
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 active:scale-[0.98] rounded-lg cursor-pointer transition shadow-sm">
                          {isUploading ? (
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PhotoIcon className="w-3.5 h-3.5" />
                          )}
                          <span>{isUploading ? "جارٍ الرفع..." : "رفع صورة للون"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(group, e)}
                            className="hidden"
                          />
                        </label>

                        {/* URL input */}
                        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={(e) =>
                              setCustomUrlInputs((prev) => ({
                                ...prev,
                                [group.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleUrlSubmit(group);
                              }
                            }}
                            placeholder="أو ضع رابط الصورة هنا..."
                            className="flex-1 text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg py-1.5 px-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                          />
                          {customUrl && (
                            <button
                              type="button"
                              onClick={() => handleUrlSubmit(group)}
                              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition"
                            >
                              تطبيق
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick pick from product gallery images if available */}
                      {uploadedImages && uploadedImages.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            أو اختر من صور المنتج:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {uploadedImages.slice(0, 8).map((imgUrl, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleApplyImageToGroup(group, imgUrl)}
                                title="تطبيق هذه الصورة على مقاسات هذا اللون"
                                className={`w-8 h-8 rounded border overflow-hidden transition-all hover:scale-105 active:scale-95 ${
                                  group.currentImage === imgUrl
                                    ? "ring-2 ring-indigo-500 border-indigo-500"
                                    : "border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img
                                  src={getImageUrl(imgUrl) || imgUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            يتم حفظ التعديلات تلقائياً في مسودة المنتج عند الضغط على "حفظ التغييرات" بالصفحة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-[0.98]"
          >
            تم / إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
