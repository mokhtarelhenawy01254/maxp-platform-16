import React, { useState, useEffect, useRef, useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { uploadFiles, productApi } from "../../../utils/apiHelpers";
import { normalizeImagePath, getImageUrl } from "../../../utils/imageUrl";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyByCode } from "../../../utils/currency";
import {
  CategoryFormModal,
  CategoryFormModalCategory,
} from "../../../components/category/CategoryFormModal";

export interface QuickVariantOption {
  id: string;
  name: string; // e.g. "مقاس M" or "أسود"
  type: string; // "size" | "color" | "option"
  price: string;
  stock: string;
}

interface CategoryOption {
  id: string;
  name?: string;
  title?: string;
}

interface QuickAddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct: any) => void;
  initialCategories?: CategoryOption[];
}

const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["39", "40", "41", "42", "43", "44"];
const POPULAR_COLORS = ["أسود", "أبيض", "كحلي", "رمادي", "بيج"];

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialCategories = [],
}) => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const displayCurrency = getCurrencyByCode(currency)?.symbol || currency || "ج.م";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Basic Form Fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState("10");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Categories list & add modal
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Options / Variants (المقاسات والألوان)
  const [hasOptions, setHasOptions] = useState(false);
  const [options, setOptions] = useState<QuickVariantOption[]>([]);
  const [customOptionName, setCustomOptionName] = useState("");

  // Loading & submission state
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"publish" | "advance">("publish");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Sync / load categories if not provided
  useEffect(() => {
    if (!open) return;
    if (categories.length === 0) {
      apiClient
        .get("/products/categories")
        .then((res) => {
          const resData: any = res.data;
          const list = resData?.data || (Array.isArray(resData) ? resData : []);
          setCategories(list);
          if (list.length > 0 && !categoryId) {
            setCategoryId(list[0].id);
          }
        })
        .catch(() => {});
    } else if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [open, categories.length, categoryId]);

  if (!open) return null;

  // Reset form
  const resetForm = () => {
    setName("");
    setPrice("");
    setComparePrice("");
    setStock("10");
    setImages([]);
    setHasOptions(false);
    setOptions([]);
    setCustomOptionName("");
    setFieldErrors({});
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    setUploadingImage(true);
    try {
      const fileUrls: any = await uploadFiles(files, "upload/multiple");
      const urls = Array.isArray(fileUrls) ? fileUrls : (fileUrls?.data || []);
      const urlList = urls
        .map((u: any) => {
          if (typeof u === "string") return u;
          if (u && typeof u === "object") return u.fullUrl || u.url || u.path;
          return null;
        })
        .filter((u: any): u is string => typeof u === "string" && u.length > 0)
        .map((u: string) => normalizeImagePath(u) || u)
        .filter(Boolean) as string[];

      if (urlList.length > 0) {
        setImages((prev) => [...prev, ...urlList]);
      }
    } catch {
      toast.error("تعذر رفع الصورة، يرجى المحاولة مجدداً");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Quick Option Presets (إضافة سريعة لمقاس أو لون)
  const addOptionItem = (optionLabel: string, type: string) => {
    if (options.some((o) => o.name === optionLabel)) return;
    const newOption: QuickVariantOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: optionLabel,
      type,
      price: price || "",
      stock: "10",
    };
    setOptions((prev) => [...prev, newOption]);
  };

  const removeOptionItem = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOptionItem = (
    id: string,
    field: "price" | "stock",
    value: string
  ) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // Validation
  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = "يرجى كتابة اسم المنتج";
    if (!price || Number(price) <= 0) errors.price = "يرجى إدخال سعر صحيح";
    if (!categoryId) errors.category = "يرجى اختيار قسم للمنتج";
    if (comparePrice && Number(comparePrice) <= Number(price)) {
      errors.comparePrice = "السعر قبل الخصم يجب أن يكون أكبر من سعر البيع";
    }
    if (hasOptions && options.length === 0) {
      errors.options = "لقد قمت بتفعيل الخيارات، يرجى إضافة مقاس أو لون واحد على الأقل";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (advanceToFullEditor: boolean) => {
    if (!validate()) return;
    setSubmitting(true);
    setActionType(advanceToFullEditor ? "advance" : "publish");

    try {
      // 1. Prepare Attributes and Variants payload if options exist
      const productAttributes = hasOptions && options.length > 0
        ? [
            {
              id: "options",
              name: "خيارات المنتج",
              slug: "options",
              values: options.map((o) => o.name),
              visible: true,
              forVariations: true,
              requiredForOrder: true,
            },
          ]
        : [];

      const totalCalculatedStock = hasOptions && options.length > 0
        ? options.reduce((sum, o) => sum + (parseInt(o.stock, 10) || 0), 0)
        : parseInt(stock, 10) || 0;

      const productPayload = {
        name: name.trim(),
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        category: categoryId,
        stock: totalCalculatedStock,
        trackInventory: true,
        isActive: true,
        enableCheckoutForm: true,
        showAddToCartButton: true,
        images,
        mainImage: images[0] || null,
        metadata: JSON.stringify({
          attributes: productAttributes,
          shippingClass: "standard",
          enableCheckoutForm: true,
          variantSettings: hasOptions && options.length > 0 ? {
            styles: {
              "خيارات المنتج": "buttons",
            },
          } : undefined,
          aiOrderOptions: {
            requiredAttributes: hasOptions && options.length > 1 ? ["options"] : [],
            attributeLabels: hasOptions && options.length > 0 ? { options: "خيارات المنتج" } : {},
          },
        }),
      };

      // 2. Create Base Product
      const response = await apiClient.post("/products", productPayload, {
        timeout: 60000,
      });
      const resData: any = response.data;
      const createdProduct = resData?.data;
      const createdProductId = createdProduct?.id;

      if (!createdProductId) {
        throw new Error(resData?.message || "تعذر حفظ المنتج");
      }

      // 3. Create Variants if enabled
      if (hasOptions && options.length > 0) {
        await Promise.all(
          options.map(async (opt, idx) => {
            const variantPayload = {
              name: opt.name,
              type: opt.type,
              price: opt.price ? parseFloat(opt.price) : parseFloat(price),
              comparePrice: comparePrice ? parseFloat(comparePrice) : null,
              stock: parseInt(opt.stock, 10) || 0,
              trackInventory: true,
              isActive: true,
              sortOrder: idx,
              metadata: JSON.stringify({
                attributeValues: {
                  "خيارات المنتج": opt.name,
                },
                shippingClass: "standard",
              }),
            };
            try {
              await productApi.createVariant(createdProductId, variantPayload);
            } catch (vErr) {
              console.error("فشل إنشاء خيار:", opt.name, vErr);
            }
          })
        );
      }

      toast.success("تمت إضافة المنتج بنجاح");
      if (onSuccess) onSuccess(createdProduct);
      handleClose();

      if (advanceToFullEditor) {
        navigate(`/products/${createdProductId}/edit`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "حدث خطأ أثناء حفظ المنتج";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <PlusIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  إنشاء طلب سريع
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40 rounded-full">
                  طلب سريع
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أدخل البيانات الأساسية لإطلاق منتجك في متجرك فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="إغلاق النافذة"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-right" dir="rtl">
          {/* 1. Name */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              اسم المنتج <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
              }}
              placeholder="مثال: تيشرت قطن أوفر سايز"
              className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                fieldErrors.name
                  ? "border-rose-400 dark:border-rose-600"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-rose-500">{fieldErrors.name}</p>
            )}
          </div>

          {/* 2. Pricing & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sale Price */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                سعر البيع ({displayCurrency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (fieldErrors.price) setFieldErrors((p) => ({ ...p, price: "" }));
                }}
                placeholder="0.00"
                className={`w-full px-3.5 py-2.5 text-sm tabular-nums bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                  fieldErrors.price
                    ? "border-rose-400 dark:border-rose-600"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {fieldErrors.price && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.price}</p>
              )}
            </div>

            {/* Compare Price (Optional) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                السعر قبل الخصم ({displayCurrency})
                <span className="text-[11px] font-normal text-slate-400 mr-1.5">(اختياري للخصومات)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={comparePrice}
                onChange={(e) => {
                  setComparePrice(e.target.value);
                  if (fieldErrors.comparePrice) setFieldErrors((p) => ({ ...p, comparePrice: "" }));
                }}
                placeholder="0.00"
                className={`w-full px-3.5 py-2.5 text-sm tabular-nums bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                  fieldErrors.comparePrice
                    ? "border-rose-400 dark:border-rose-600"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              />
              {fieldErrors.comparePrice && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.comparePrice}</p>
              )}
            </div>
          </div>

          {/* 3. Category & Stock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category with inline + button */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                قسم المنتج <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: "" }));
                  }}
                  className={`flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    fieldErrors.category
                      ? "border-rose-400 dark:border-rose-600"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <option value="">-- اختر القسم --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  title="إضافة قسم جديد"
                  aria-label="إضافة قسم جديد"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shrink-0"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              {fieldErrors.category && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.category}</p>
              )}
            </div>

            {/* Initial Stock (Only shown when no variants are enabled) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                الكمية المتوفرة بالمخزن
                {hasOptions && (
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400 mr-1.5">
                    (تُحسب تلقائياً من المقاسات)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                disabled={hasOptions}
                value={hasOptions ? options.reduce((sum, o) => sum + (parseInt(o.stock, 10) || 0), 0) : stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* 4. Product Images */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              صور المنتج
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {/* Existing Uploaded Images */}
              {images.map((imgUrl, idx) => (
                <div
                  key={imgUrl}
                  className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={getImageUrl(imgUrl) || imgUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold bg-indigo-600 text-white rounded">
                      الرئيسية
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((u) => u !== imgUrl))}
                    className="absolute top-1 left-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف الصورة"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Upload Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50/50 dark:bg-slate-800/40"
              >
                {uploadingImage ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PhotoIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium">إضافة صورة</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>
          </div>

          {/* 5. Options (Sizes & Colors) - Simplified */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  هل للمنتج مقاسات أو ألوان؟
                </span>
                <p className="text-xs text-slate-400">
                  فعل هذا الخيار إذا كان المنتج متوفراً بعدة مقاسات أو ألوان
                </p>
              </div>

              {/* Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={hasOptions}
                onClick={() => {
                  const next = !hasOptions;
                  setHasOptions(next);
                  if (next && options.length === 0) {
                    // Default to M & L as initial friendly options
                    addOptionItem("مقاس M", "size");
                    addOptionItem("مقاس L", "size");
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  hasOptions ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    hasOptions ? "-translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Options Body when Enabled */}
            {hasOptions && (
              <div className="mt-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
                {/* Presets Chips */}
                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    إضافة سريعة بنقرة واحدة:
                  </span>
                  <div className="space-y-2">
                    {/* Clothing Sizes */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">مقاسات ملابس:</span>
                      {CLOTHING_SIZES.map((s) => {
                        const optName = `مقاس ${s}`;
                        const isAdded = options.some((o) => o.name === optName);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => (isAdded ? removeOptionItem(options.find((o) => o.name === optName)!.id) : addOptionItem(optName, "size"))}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              isAdded
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {s} {isAdded && "✓"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Shoe Sizes */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">مقاسات أحذية:</span>
                      {SHOE_SIZES.map((s) => {
                        const optName = `مقاس ${s}`;
                        const isAdded = options.some((o) => o.name === optName);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => (isAdded ? removeOptionItem(options.find((o) => o.name === optName)!.id) : addOptionItem(optName, "size"))}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition-all ${
                              isAdded
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {s} {isAdded && "✓"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Popular Colors */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">ألوان شائعة:</span>
                      {POPULAR_COLORS.map((c) => {
                        const isAdded = options.some((o) => o.name === c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => (isAdded ? removeOptionItem(options.find((o) => o.name === c)!.id) : addOptionItem(c, "color"))}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              isAdded
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {c} {isAdded && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Custom Option Input */}
                <div className="flex gap-2 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/30">
                  <input
                    type="text"
                    value={customOptionName}
                    onChange={(e) => setCustomOptionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customOptionName.trim()) {
                        e.preventDefault();
                        addOptionItem(customOptionName.trim(), "custom");
                        setCustomOptionName("");
                      }
                    }}
                    placeholder="أو اكتب خياراً مخصصاً (مثال: 50 مل أو ذهبي)"
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customOptionName.trim()) {
                        addOptionItem(customOptionName.trim(), "custom");
                        setCustomOptionName("");
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 rounded-lg transition-colors"
                  >
                    إضافة الخيار
                  </button>
                </div>

                {/* Selected Options List */}
                {options.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      قائمة الخيارات المحددة:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {options.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                        >
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate min-w-[90px]">
                            {opt.name}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Option Price */}
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">السعر:</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={opt.price}
                                onChange={(e) => updateOptionItem(opt.id, "price", e.target.value)}
                                placeholder={price || "0.00"}
                                className="w-18 px-2 py-1 text-xs tabular-nums bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                            </div>

                            {/* Option Stock */}
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">الكمية:</span>
                              <input
                                type="number"
                                min="0"
                                value={opt.stock}
                                onChange={(e) => updateOptionItem(opt.id, "stock", e.target.value)}
                                placeholder="10"
                                className="w-16 px-2 py-1 text-xs tabular-nums bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                            </div>

                            {/* Delete Option */}
                            <button
                              type="button"
                              onClick={() => removeOptionItem(opt.id)}
                              aria-label={`حذف ${opt.name}`}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {fieldErrors.options && (
                  <p className="text-xs text-rose-500">{fieldErrors.options}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleClose();
              navigate("/products/new");
            }}
            className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors order-2 sm:order-1"
          >
            الانتقال للنموذج المتقدم مباشرة ←
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-all shrink-0"
            >
              {submitting && actionType === "advance" ? "جارٍ الحفظ..." : "حفظ ومتابعة التفاصيل"}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-97 shadow-sm rounded-xl transition-all disabled:opacity-50 shrink-0"
            >
              {submitting && actionType === "publish" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>حفظ ونشر فوراً</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Creation Modal */}
      {isCategoryModalOpen && (
        <CategoryFormModal
          open={isCategoryModalOpen}
          editingCategory={null}
          onClose={() => setIsCategoryModalOpen(false)}
          onSaved={(newCategory) => {
            setCategories((prev) => [...prev, newCategory]);
            setCategoryId(newCategory.id);
            setIsCategoryModalOpen(false);
            if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: "" }));
          }}
        />
      )}
    </div>
  );
};
