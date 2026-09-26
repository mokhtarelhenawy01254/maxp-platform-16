import React, { useState, useMemo } from "react";
import { ProductAttribute, ProductVariant } from "../../types";
import {
  XMarkIcon,
  DocumentTextIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  CubeIcon,
  TruckIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { getImageUrl } from "../../../../utils/imageUrl";
import { ShippingClassOption } from "../../../../constants/shippingClasses";
import { VariantColorImagesModal } from "./VariantColorImagesModal";
import {
  groupVariantsByColor,
  VariantColorGroup,
} from "../../utils/variantColorGrouping";

interface VariantsTabProps {
  variants: ProductVariant[];
  showVariants: boolean;
  setShowVariants: React.Dispatch<React.SetStateAction<boolean>>;
  bulkAction: string;
  handleBulkActionChange: (action: string) => void;
  showBulkInput: boolean;
  bulkValue: string | number;
  setBulkValue: React.Dispatch<React.SetStateAction<string | number>>;
  applyBulkAction: () => void;
  removeVariant: (idx: number) => void;
  updateVariant: (idx: number, field: keyof ProductVariant, value: any) => void;
  handleVariantImageChange: (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  addVariant: () => void;
  displayCurrency: string;
  shippingClassOptions: ShippingClassOption[];
  defaultPricing?: {
    price?: number;
    comparePrice?: number;
    cost?: number;
  };
  syncWithProductPricing?: (targetIdx?: number) => void;
  t: any;
  attributes?: ProductAttribute[];
  uploadedImages?: string[];
  onBatchUpdateVariants?: (
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

export const VariantsTab: React.FC<VariantsTabProps> = ({
  variants,
  showVariants,
  setShowVariants,
  bulkAction,
  handleBulkActionChange,
  showBulkInput,
  bulkValue,
  setBulkValue,
  applyBulkAction,
  removeVariant,
  updateVariant,
  handleVariantImageChange,
  addVariant,
  displayCurrency,
  shippingClassOptions,
  defaultPricing,
  syncWithProductPricing,
  t,
  attributes = [],
  uploadedImages = [],
  onBatchUpdateVariants,
  onUploadImageForVariants,
  variantSettings,
  setVariantSettings,
}) => {
  const [expandedVariantIdx, setExpandedVariantIdx] = useState<number | null>(
    null,
  );
  const [isColorImagesModalOpen, setIsColorImagesModalOpen] = useState(false);
  const [copiedGroupToast, setCopiedGroupToast] = useState<{
    idx: number;
    message: string;
  } | null>(null);
  const [selectedQuickColorId, setSelectedQuickColorId] = useState<string>("");
  const [quickCustomUrl, setQuickCustomUrl] = useState<string>("");
  const [isQuickUploading, setIsQuickUploading] = useState<boolean>(false);

  const effectiveBatchUpdate = (
    indices: number[],
    updates: Partial<ProductVariant> | ((v: ProductVariant) => Partial<ProductVariant>),
  ) => {
    if (onBatchUpdateVariants) {
      onBatchUpdateVariants(indices, updates);
    } else {
      indices.forEach((idx) => {
        const current = variants[idx];
        const patch = typeof updates === "function" ? updates(current) : updates;
        Object.entries(patch).forEach(([k, val]) => {
          updateVariant(idx, k as keyof ProductVariant, val);
        });
      });
    }
  };

  const colorGroups = useMemo(() => {
    return groupVariantsByColor(variants, attributes, undefined, variantSettings);
  }, [variants, attributes, variantSettings]);

  const activeQuickGroup = useMemo(() => {
    if (!colorGroups.length) return null;
    return (
      colorGroups.find((g) => g.id === selectedQuickColorId) ||
      colorGroups[0]
    );
  }, [colorGroups, selectedQuickColorId]);

  const syncableSavedCount = useMemo(() => {
    return colorGroups.filter(
      (g) => Boolean(g.savedAttributeImage || g.currentImage) && g.imagesCount < g.items.length
    ).length;
  }, [colorGroups]);

  const applyImageToGroup = (group: VariantColorGroup, imageUrl: string) => {
    if (!imageUrl) return;
    const indices = group.items.map((it) => it.index);
    effectiveBatchUpdate(indices, (v) => ({
      image: imageUrl,
      images:
        v.images && v.images.length > 0
          ? [imageUrl, ...v.images.filter((img) => img !== imageUrl)]
          : [imageUrl],
    }));

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

    setCopiedGroupToast({
      idx: -1,
      message: `✓ تم تطبيق الصورة على جميع مقاسات "${group.name}" (${indices.length})`,
    });
    setTimeout(() => setCopiedGroupToast(null), 3500);
  };

  const handleApplyAllSavedColorImages = () => {
    let count = 0;
    colorGroups.forEach((group) => {
      const img = group.savedAttributeImage || group.currentImage;
      if (img && group.imagesCount < group.items.length) {
        applyImageToGroup(group, img);
        count += 1;
      }
    });
    if (count > 0) {
      setCopiedGroupToast({
        idx: -1,
        message: `✓ تم تطبيق صور الألوان المحفوظة على كافة المقاسات لـ ${count} ألوان بنجاح`,
      });
      setTimeout(() => setCopiedGroupToast(null), 4000);
    }
  };

  const variantColorGroupMap = useMemo(() => {
    const map = new Map<number, VariantColorGroup>();
    colorGroups.forEach((group) => {
      group.items.forEach((item) => {
        map.set(item.index, group);
      });
    });
    return map;
  }, [colorGroups]);


  const toggleVariant = (idx: number) => {
    setExpandedVariantIdx(expandedVariantIdx === idx ? null : idx);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Variants Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("products.variants.title")} ({variants.length})
            </h3>
            {variants.length > 0 && (
              <button
                type="button"
                onClick={() => setIsColorImagesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-colors shadow-sm active:scale-[0.98]"
                title="تعيين ورفع الصور لكل لون وتطبيقها على كافة مقاساته دفعة واحدة"
              >
                <PhotoIcon className="h-3.5 w-3.5" />
                تعيين الصور حسب اللون ({colorGroups.length} ألوان)
              </button>
            )}
            {variants.length > 0 &&
              defaultPricing?.price !== undefined &&
              Number(defaultPricing.price) > 0 && (
                <button
                  type="button"
                  onClick={() => syncWithProductPricing?.()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 rounded-lg transition-colors shadow-sm"
                  title="تطبيق سعر وسعر شراء المنتج الأساسي على جميع المتغيرات"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  مزامنة تسعير الكل مع المنتج الأساسي ({defaultPricing.price}{" "}
                  {displayCurrency})
                </button>
              )}
          </div>
          <button
            type="button"
            onClick={() => setShowVariants(!showVariants)}
            className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
          >
            {showVariants ? "إخفاء" : "إظهار"}
          </button>
        </div>

        {/* Bulk Actions */}
        {showVariants && variants.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                إجراء جماعي على كل المتغيرات:
              </span>
              <select
                value={bulkAction}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "set_color_images") {
                    setIsColorImagesModalOpen(true);
                    return;
                  }
                  handleBulkActionChange(val);
                }}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm min-w-[200px]"
              >
                <option value="">-- اختر إجراء --</option>
                <optgroup label="🖼️ الصور">
                  <option value="set_color_images">
                    🎨 تعيين الصور حسب اللون...
                  </option>
                </optgroup>
                <optgroup label="📌 الحالة">
                  <option value="activate">✅ تفعيل الكل</option>
                  <option value="deactivate">⏸️ إيقاف الكل</option>
                  <option value="delete">🗑️ حذف الكل</option>
                </optgroup>
                <optgroup label="💰 التسعير">
                  {defaultPricing?.price !== undefined &&
                    Number(defaultPricing.price) > 0 && (
                      <option value="sync_product_pricing">
                        🔄 تطبيق تسعير المنتج الأساسي ({defaultPricing.price}{" "}
                        {displayCurrency})
                      </option>
                    )}
                  <option value="set_price">💵 تعيين السعر</option>
                  <option value="increase_price">📈 زيادة السعر (مبلغ)</option>
                  <option value="decrease_price">📉 تخفيض السعر (مبلغ)</option>
                  <option value="increase_price_percent">
                    📈 زيادة السعر (%)
                  </option>
                  <option value="decrease_price_percent">
                    📉 تخفيض السعر (%)
                  </option>
                  <option value="set_compare_price">
                    🏷️ تعيين السعر الأساسي
                  </option>
                  <option value="set_cost">💳 تعيين سعر الشراء</option>
                </optgroup>
                <optgroup label="📦 المخزون">
                  <option value="track_inventory">📊 تفعيل تتبع المخزون</option>
                  <option value="untrack_inventory">
                    📭 إيقاف تتبع المخزون
                  </option>
                  <option value="set_stock">🔢 تعيين الكمية</option>
                  <option value="set_low_stock">⚠️ تعيين حد التنبيه</option>
                  <option value="in_stock">✅ متوفر</option>
                  <option value="out_of_stock">❌ نفد المخزون</option>
                  <option value="allow_backorders">
                    🔄 السماح بالطلبات المسبقة
                  </option>
                  <option value="disallow_backorders">
                    🚫 منع الطلبات المسبقة
                  </option>
                </optgroup>
                <optgroup label="🚚 الشحن">
                  <option value="set_weight">⚖️ تعيين الوزن (كجم)</option>
                  <option value="set_length">📏 تعيين الطول (سم)</option>
                  <option value="set_width">📐 تعيين العرض (سم)</option>
                  <option value="set_height">📐 تعيين الارتفاع (سم)</option>
                  <option value="set_shipping_class">📦 تعيين فئة الشحن</option>
                </optgroup>
              </select>

              {/* Input for value-based actions */}
              {showBulkInput && bulkAction !== "set_shipping_class" && (
                <input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={
                    bulkAction.includes("percent")
                      ? "النسبة %"
                      : bulkAction.includes("price") ||
                          bulkAction.includes("cost")
                        ? "المبلغ"
                        : bulkAction.includes("stock")
                          ? "الكمية"
                          : bulkAction.includes("weight")
                            ? "الوزن (كجم)"
                            : "القيمة"
                  }
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm w-28"
                  min="0"
                  step={bulkAction.includes("weight") ? "0.01" : "1"}
                />
              )}

              {/* Shipping class select */}
              {showBulkInput && bulkAction === "set_shipping_class" && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm"
                >
                  <option value="">اختر فئة الشحن</option>
                  {shippingClassOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={applyBulkAction}
                disabled={!bulkAction || (showBulkInput && !bulkValue)}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تطبيق على {variants.length} متغير
              </button>
            </div>
          </div>
        )}

        {/* Global Action Toast */}
        {copiedGroupToast?.idx === -1 && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
            <span className="font-semibold">{copiedGroupToast.message}</span>
            <button
              type="button"
              onClick={() => setCopiedGroupToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1-Click Sync Banner for Saved Attribute Images */}
        {showVariants && syncableSavedCount > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-emerald-950/30 dark:to-indigo-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 sm:p-4 mb-4 flex items-center justify-between flex-wrap gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                <PhotoIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  تم العثور على {syncableSavedCount} صور ألوان محفوظة مسبقاً لهذا المنتج!
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  يمكنك تطبيقها فوراً على جميع المقاسات والمتغيرات ({variants.length} مقاس) بنقرة واحدة دون الحاجة لإعادة الرفع.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyAllSavedColorImages}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              تطبيق صور الألوان على كل المقاسات الآن
            </button>
          </div>
        )}

        {/* Inline Quick Color Image Toolbar */}
        {showVariants && colorGroups.length > 0 && (
          <div className="bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <PhotoIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  تعيين الصورة حسب اللون لجميع المقاسات:
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (اختر اللون وارفع أو ضع صورته لتطبيقها على كافة مقاساته فوراً)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsColorImagesModalOpen(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                إدارة صور جميع الألوان ({colorGroups.length} ألوان)...
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Color dropdown */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  اللون:
                </label>
                <select
                  value={activeQuickGroup?.id || ""}
                  onChange={(e) => {
                    setSelectedQuickColorId(e.target.value);
                    setQuickCustomUrl("");
                  }}
                  className="flex-1 text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg py-1.5 px-2.5 font-semibold focus:ring-1 focus:ring-indigo-500"
                >
                  {colorGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.items.length} مقاسات) {g.imagesCount === g.items.length ? "✓" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Image Preview + Controls */}
              {activeQuickGroup && (
                <div className="flex items-center gap-2.5 flex-1 flex-wrap">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-center">
                    {activeQuickGroup.currentImage || activeQuickGroup.savedAttributeImage ? (
                      <img
                        src={
                          getImageUrl(activeQuickGroup.currentImage || activeQuickGroup.savedAttributeImage!) ||
                          (activeQuickGroup.currentImage || activeQuickGroup.savedAttributeImage)
                        }
                        alt={activeQuickGroup.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Upload button */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 active:scale-[0.98] rounded-lg cursor-pointer transition shadow-sm whitespace-nowrap">
                    {isQuickUploading ? (
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PhotoIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{isQuickUploading ? "جارٍ الرفع..." : `رفع صورة لـ "${activeQuickGroup.name}"`}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isQuickUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !activeQuickGroup) return;
                        const indices = activeQuickGroup.items.map((it) => it.index);
                        setIsQuickUploading(true);
                        try {
                          if (onUploadImageForVariants) {
                            const uploadedUrl = await onUploadImageForVariants(indices, file);
                            if (uploadedUrl) {
                              applyImageToGroup(activeQuickGroup, uploadedUrl);
                            }
                          }
                        } catch (err) {
                          console.error("Error uploading image for quick group:", err);
                        } finally {
                          setIsQuickUploading(false);
                          if (e.target) e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* URL input */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={quickCustomUrl}
                      onChange={(e) => setQuickCustomUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickCustomUrl.trim()) {
                          e.preventDefault();
                          applyImageToGroup(activeQuickGroup, quickCustomUrl.trim());
                          setQuickCustomUrl("");
                        }
                      }}
                      placeholder={`رابط صورة لتطبيقها على كل مقاسات "${activeQuickGroup.name}"...`}
                      className="flex-1 text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg py-1.5 px-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                    {quickCustomUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          applyImageToGroup(activeQuickGroup, quickCustomUrl.trim());
                          setQuickCustomUrl("");
                        }}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap active:scale-[0.98] transition shadow-sm"
                      >
                        تطبيق ({activeQuickGroup.items.length} مقاسات)
                      </button>
                    )}
                  </div>

                  {/* Button to apply current/saved image to all sizes if not applied yet */}
                  {(activeQuickGroup.currentImage || activeQuickGroup.savedAttributeImage) &&
                    activeQuickGroup.imagesCount < activeQuickGroup.items.length && (
                      <button
                        type="button"
                        onClick={() => {
                          const img = activeQuickGroup.currentImage || activeQuickGroup.savedAttributeImage;
                          if (img) applyImageToGroup(activeQuickGroup, img);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-semibold whitespace-nowrap transition shadow-sm"
                      >
                        ⚡ تطبيق هذه الصورة على كافة المقاسات ({activeQuickGroup.items.length})
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* Quick Pick from Product Images */}
            {uploadedImages && uploadedImages.length > 0 && activeQuickGroup && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-200/80 dark:border-gray-700/60 flex-wrap">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  أو اختر من صور المنتج لتعيينها لـ "{activeQuickGroup.name}":
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {uploadedImages.slice(0, 10).map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyImageToGroup(activeQuickGroup, imgUrl)}
                      title={`تطبيق على جميع مقاسات ${activeQuickGroup.name}`}
                      className={`w-7 h-7 rounded border overflow-hidden transition-all hover:scale-110 active:scale-95 ${
                        activeQuickGroup.currentImage === imgUrl
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
        )}

        {showVariants && (

          <div className="space-y-3">
            {variants.map((variant, idx) => {
              const isExpanded = expandedVariantIdx === idx;
              return (
                <div
                  key={idx}
                  className={`border overflow-hidden transition-all duration-200 ${
                    isExpanded
                      ? "border-indigo-200 dark:border-indigo-800/50 shadow-md rounded-xl bg-white dark:bg-gray-800 ring-1 ring-indigo-50 dark:ring-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow"
                  }`}
                >
                  {/* Variant Header - Clickable */}
                  <div
                    className={`px-5 py-4 flex flex-wrap gap-4 items-center justify-between cursor-pointer transition-colors select-none group`}
                    onClick={() => toggleVariant(idx)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Number Handle */}
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-md text-sm font-semibold transition-colors ${
                          isExpanded
                            ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-semibold text-base transition-colors ${
                              isExpanded
                                ? "text-indigo-900 dark:text-indigo-100"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {variant.name || "متغير جديد"}
                          </h4>
                          {variant.type && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                              {variant.type === "color"
                                ? "لون"
                                : variant.type === "size"
                                  ? "حجم"
                                  : variant.type}
                            </span>
                          )}
                        </div>
                        {variant.sku && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 font-mono tracking-wide">
                            {variant.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {variant.price ? (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                            السعر
                          </p>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {variant.price}{" "}
                            <span className="text-xs font-normal text-gray-500">
                              {displayCurrency}
                            </span>
                          </span>
                        </div>
                      ) : null}

                      {variant.trackInventory && variant.stock !== undefined ? (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                            المخزون
                          </p>
                          <span
                            className={`text-sm font-bold ${variant.stock > 0 ? "text-gray-900 dark:text-gray-100" : "text-red-600 dark:text-red-400"}`}
                          >
                            {variant.stock}{" "}
                            <span className="text-xs font-normal text-gray-500">
                              قطعة
                            </span>
                          </span>
                        </div>
                      ) : null}

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          variant.isActive
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50"
                            : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        }`}
                      >
                        {variant.isActive ? "نشط" : "معطل"}
                      </span>

                      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVariant(idx);
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        title="حذف المتغير"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>

                      <div
                        className={`p-1.5 rounded-full transition-colors ${
                          isExpanded
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                            : "bg-transparent text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Variant Content */}
                  {isExpanded && (
                    <div className="border-t border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-gray-800 p-6 space-y-8 animate-slide-down">
                      {/* Section 1: Basic Info */}
                      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <DocumentTextIcon className="h-4 w-4 ml-1" />
                          المعلومات الأساسية
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              اسم المتغير *
                            </label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) =>
                                updateVariant(idx, "name", e.target.value)
                              }
                              placeholder="مثل: أبيض، كبير"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              نوع المتغير
                            </label>
                            <select
                              value={variant.type}
                              onChange={(e) =>
                                updateVariant(idx, "type", e.target.value)
                              }
                              className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                              <option value="color">لون</option>
                              <option value="size">حجم</option>
                              <option value="material">مادة</option>
                              <option value="style">نمط</option>
                              <option value="other">أخرى</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={variant.sku || ""}
                              onChange={(e) =>
                                updateVariant(idx, "sku", e.target.value)
                              }
                              placeholder="PROD-VAR-001"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </div>
                        {/* Description */}
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            وصف المتغير
                          </label>
                          <textarea
                            value={variant.description || ""}
                            onChange={(e) =>
                              updateVariant(idx, "description", e.target.value)
                            }
                            rows={2}
                            placeholder="وصف مختصر لهذا المتغير (اختياري)"
                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Section 2: Image */}
                      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <PhotoIcon className="h-4 w-4 ml-1" />
                          صورة المتغير
                        </h5>
                        <div className="flex items-center gap-4">
                          {variant.image ? (
                            <div className="relative group">
                              <img
                                src={
                                  getImageUrl(variant.image) || variant.image
                                }
                                alt=""
                                className="h-24 w-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateVariant(idx, "image", undefined)
                                }
                                className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 dark:hover:bg-red-700"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <label className="h-24 w-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                              <PhotoIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                رفع صورة
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleVariantImageChange(idx, e)
                                }
                                className="hidden"
                              />
                            </label>
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={variant.image || ""}
                                onChange={(e) =>
                                  updateVariant(idx, "image", e.target.value)
                                }
                                placeholder="أو أدخل رابط الصورة"
                                className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              />
                              <label className="px-3 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm cursor-pointer hover:bg-indigo-700 dark:hover:bg-indigo-800 flex items-center gap-1">
                                <PhotoIcon className="h-4 w-4" />
                                رفع
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleVariantImageChange(idx, e)
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* Quick batch action for this specific color */}
                            {(() => {
                              const group = variantColorGroupMap.get(idx);
                              if (!group || group.items.length <= 1) {
                                return null;
                              }
                              const availImg = group.currentImage || group.savedAttributeImage;
                              const isCopied = copiedGroupToast?.idx === idx;

                              // Case 1: Variant doesn't have an image, but color group has an image!
                              if (!variant.image && availImg) {
                                return (
                                  <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      صورة لون "{group.name}" المتاحة:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateVariant(idx, "image", availImg)}
                                      className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 rounded px-2 py-0.5 hover:bg-indigo-100"
                                    >
                                      استخدام لهذا المقاس
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => applyImageToGroup(group, availImg)}
                                      className="inline-flex items-center gap-1 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded px-2.5 py-0.5 hover:bg-emerald-100 font-semibold"
                                    >
                                      ⚡ تطبيق على كل مقاسات "{group.name}" ({group.items.length})
                                    </button>
                                  </div>
                                );
                              }

                              // Case 2: Variant has an image, offer to apply to all sizes of this color!
                              if (variant.image) {
                                return (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        applyImageToGroup(group, variant.image!);
                                        setCopiedGroupToast({
                                          idx,
                                          message: `✓ تم تطبيق الصورة على جميع مقاسات "${group.name}" (${group.items.length})`,
                                        });
                                        setTimeout(
                                          () => setCopiedGroupToast(null),
                                          3500,
                                        );
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-md px-2.5 py-1.5 transition-colors shadow-sm active:scale-[0.98]"
                                      title={`نسخ هذه الصورة إلى جميع مقاسات ${group.name}`}
                                    >
                                      <PhotoIcon className="h-3.5 w-3.5" />
                                      <span>
                                        {isCopied
                                          ? copiedGroupToast.message
                                          : `تطبيق هذه الصورة على جميع مقاسات "${group.name}" (${group.items.length} مقاسات)`}
                                      </span>
                                    </button>
                                  </div>
                                );
                              }

                              return null;
                            })()}

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              صورة مختلفة لهذا المتغير (اختياري)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Pricing */}
                      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 ml-1" />
                            التسعير
                          </h5>
                          {defaultPricing?.price !== undefined &&
                            Number(defaultPricing.price) > 0 && (
                              <button
                                type="button"
                                onClick={() => syncWithProductPricing?.(idx)}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                                title="استعادة تسعير المنتج الأساسي لهذا المتغير"
                              >
                                <ArrowPathIcon className="h-3 w-3" />
                                استعادة تسعير المنتج الأساسي ({defaultPricing.price}{" "}
                                {displayCurrency})
                              </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              السعر في الخصم ({displayCurrency})
                            </label>
                            <input
                              type="number"
                              value={
                                variant.price !== undefined &&
                                variant.price !== null
                                  ? variant.price
                                  : ""
                              }
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "price",
                                  e.target.value !== ""
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              min="0"
                              step="0.01"
                              placeholder="السعر بعد الخصم"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              السعر الأساسي ({displayCurrency})
                            </label>
                            <input
                              type="number"
                              value={
                                variant.comparePrice !== undefined &&
                                variant.comparePrice !== null
                                  ? variant.comparePrice
                                  : ""
                              }
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "comparePrice",
                                  e.target.value !== ""
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              min="0"
                              step="0.01"
                              placeholder="السعر قبل الخصم"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              سعر الشراء ({displayCurrency})
                            </label>
                            <input
                              type="number"
                              value={
                                variant.cost !== undefined &&
                                variant.cost !== null
                                  ? variant.cost
                                  : ""
                              }
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "cost",
                                  e.target.value !== ""
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              min="0"
                              step="0.01"
                              placeholder="تكلفة الشراء"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          💡 يتم أخذ التسعير تلقائياً من إعدادات تسعير المنتج الأساسي، ويمكنك تخصيص أي قيمة بحرية لهذا المتغير.
                        </p>
                      </div>

                      {/* Section 4: Inventory */}
                      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <CubeIcon className="h-4 w-4 ml-1" />
                          المخزون
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                تتبع المخزون
                              </label>
                            </div>
                            <input
                              type="checkbox"
                              checked={variant.trackInventory}
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "trackInventory",
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                          </div>
                          {variant.trackInventory && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  الكمية
                                </label>
                                <input
                                  type="number"
                                  value={variant.stock || 0}
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      "stock",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  min="0"
                                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  حد التنبيه
                                </label>
                                <input
                                  type="number"
                                  value={variant.lowStockThreshold || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      "lowStockThreshold",
                                      parseInt(e.target.value) || undefined,
                                    )
                                  }
                                  min="0"
                                  placeholder="5"
                                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                              </div>
                              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    طلبات مسبقة
                                  </label>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    السماح بالشراء عند نفاد المخزون
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={variant.allowBackorders || false}
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      "allowBackorders",
                                      e.target.checked,
                                    )
                                  }
                                  className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section 5: Shipping */}
                      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <TruckIcon className="h-4 w-4 ml-1" />
                          الشحن
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              الوزن (كجم)
                            </label>
                            <input
                              type="number"
                              value={variant.weight || ""}
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "weight",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              min="0"
                              step="0.01"
                              placeholder="0.5"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              الطول (سم)
                            </label>
                            <input
                              type="number"
                              value={variant.dimensions?.length || ""}
                              onChange={(e) =>
                                updateVariant(idx, "dimensions", {
                                  ...variant.dimensions,
                                  length: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              min="0"
                              placeholder="20"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              العرض (سم)
                            </label>
                            <input
                              type="number"
                              value={variant.dimensions?.width || ""}
                              onChange={(e) =>
                                updateVariant(idx, "dimensions", {
                                  ...variant.dimensions,
                                  width: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              min="0"
                              placeholder="15"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              الارتفاع (سم)
                            </label>
                            <input
                              type="number"
                              value={variant.dimensions?.height || ""}
                              onChange={(e) =>
                                updateVariant(idx, "dimensions", {
                                  ...variant.dimensions,
                                  height: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              min="0"
                              placeholder="10"
                              className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            فئة الشحن
                          </label>
                          <select
                            value={variant.shippingClass || "standard"}
                            onChange={(e) =>
                              updateVariant(
                                idx,
                                "shippingClass",
                                e.target.value,
                              )
                            }
                            className="block w-full md:w-1/3 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            {shippingClassOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Section 6: Status */}
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            حالة المتغير
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            تفعيل أو إيقاف هذا المتغير
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              variant.isActive
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {variant.isActive ? "نشط" : "غير نشط"}
                          </span>
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(e) =>
                              updateVariant(idx, "isActive", e.target.checked)
                            }
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Variant Button */}
            <button
              type="button"
              onClick={addVariant}
              className="w-full flex justify-center items-center px-4 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-medium mt-4"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              {t("products.variants.addVariant")}
            </button>

            {/* Info Box */}
            {variants.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-center">
                <CubeIcon className="h-12 w-12 text-blue-400 dark:text-blue-500 mx-auto mb-2" />
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  {t("products.variants.noVariants")}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  {t("products.variants.noVariantsDesc")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for setting images by color */}
      <VariantColorImagesModal
        isOpen={isColorImagesModalOpen}
        onClose={() => setIsColorImagesModalOpen(false)}
        variants={variants}
        attributes={attributes}
        uploadedImages={uploadedImages}
        onBatchUpdateVariants={effectiveBatchUpdate}
        onUploadImageForVariants={onUploadImageForVariants}
        variantSettings={variantSettings}
        setVariantSettings={setVariantSettings}
      />
    </div>
  );
};
