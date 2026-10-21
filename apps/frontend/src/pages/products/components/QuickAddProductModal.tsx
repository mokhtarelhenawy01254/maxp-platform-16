import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { uploadFiles, productApi } from "../../../utils/apiHelpers";
import { normalizeImagePath, getImageUrl } from "../../../utils/imageUrl";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencySymbol } from "../../../utils/currency";
import {
  CategoryFormModal,
} from "../../../components/category/CategoryFormModal";

export interface QuickVariantOption {
  id: string;
  name: string;
  type?: string;
  price: string;
  stock: string;
}

export interface QuickProductAttribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
}

export interface QuickGeneratedVariant {
  id: string;
  name: string;
  price: string;
  stock: string;
  attributeValues: Record<string, string>;
}

interface CategoryOption {
  id: string;
  name?: string;
  title?: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
}

export interface QuickAddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct: any) => void;
  initialCategories?: CategoryOption[];
  warehouses?: WarehouseOption[];
  defaultWarehouseId?: string;
  showWarehouseSelect?: boolean;
}

interface AttributeTemplate {
  name: string;
  slug: string;
  icon: string;
  suggestedValues: string[];
}

const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  {
    name: "المقاس",
    slug: "size",
    icon: "📏",
    suggestedValues: ["S", "M", "L", "XL", "XXL"],
  },
  {
    name: "اللون",
    slug: "color",
    icon: "🎨",
    suggestedValues: ["أسود", "أبيض", "كحلي", "رمادي", "بيج", "أحمر", "أزرق"],
  },
  {
    name: "مقاس الحذاء",
    slug: "shoe_size",
    icon: "👟",
    suggestedValues: ["39", "40", "41", "42", "43", "44"],
  },
  {
    name: "الخامة",
    slug: "material",
    icon: "🧵",
    suggestedValues: ["قطن", "بوليستر", "جلد", "كتان"],
  },
  {
    name: "العبوة / الباقة",
    slug: "pack",
    icon: "📦",
    suggestedValues: ["قطعة", "قطعتين", "3 قطع", "عرض التوفير"],
  },
];

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialCategories = [],
  warehouses,
  defaultWarehouseId,
  showWarehouseSelect = false,
}) => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const displayCurrency = getCurrencySymbol(currency);
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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);

  // Attributes & Variations Model (المتغيرات والصفات)
  const [hasOptions, setHasOptions] = useState(false);
  const [attributes, setAttributes] = useState<QuickProductAttribute[]>([]);
  const [variants, setVariants] = useState<QuickGeneratedVariant[]>([]);
  const [newCustomAttrName, setNewCustomAttrName] = useState("");
  const [attrInputValues, setAttrInputValues] = useState<Record<string, string>>({});
  const [bulkStockValue, setBulkStockValue] = useState("");

  // Loading & submission state
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"publish" | "advance">("publish");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Warehouse Selection
  const [internalWarehouses, setInternalWarehouses] = useState<WarehouseOption[]>(warehouses || []);
  const [warehouseId, setWarehouseId] = useState<string>(
    defaultWarehouseId || (warehouses && warehouses.length > 0 ? warehouses[0].id : "")
  );
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // Sync warehouses prop and fetch if needed
  useEffect(() => {
    if (!open) return;
    if (warehouses && warehouses.length > 0) {
      setInternalWarehouses(warehouses);
      setWarehouseId((prev) => prev || defaultWarehouseId || warehouses[0].id);
      return;
    }
    if (showWarehouseSelect) {
      setLoadingWarehouses(true);
      apiClient
        .get("/warehouses")
        .then((res) => {
          const resData: any = res.data;
          const list = resData?.data || (Array.isArray(resData) ? resData : []);
          const validList: WarehouseOption[] = Array.isArray(list)
            ? list.filter((w: any) => w && typeof w === "object" && w.id && w.name)
            : [];
          setInternalWarehouses(validList);
          setWarehouseId((prev) => prev || defaultWarehouseId || validList[0]?.id || "");
        })
        .catch((err) => {
          console.error("Failed to load warehouses:", err);
        })
        .finally(() => {
          setLoadingWarehouses(false);
        });
    }
  }, [open, warehouses, showWarehouseSelect, defaultWarehouseId]);

  useEffect(() => {
    if (defaultWarehouseId) {
      setWarehouseId(defaultWarehouseId);
    }
  }, [defaultWarehouseId]);

  // Always load categories from API on open
  useEffect(() => {
    if (!open) return;
    setLoadingCategories(true);
    apiClient
      .get("/products/categories")
      .then((res) => {
        const resData: any = res.data;
        const list = resData?.data || (Array.isArray(resData) ? resData : []);
        const validList = Array.isArray(list)
          ? list.filter((c: any) => c && typeof c === "object" && c.id && (c.name || c.title))
          : [];
        setCategories(validList);
        if (validList.length > 0 && !categoryId) {
          setCategoryId(validList[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
      })
      .finally(() => {
        setLoadingCategories(false);
      });
  }, [open]);

  const handleQuickAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setAddingCategoryLoading(true);
    try {
      const response = await apiClient.post("/products/categories", {
        name: trimmed,
        isActive: true,
      });
      const resData: any = response.data;
      const createdCategory = resData?.data;
      if (createdCategory?.id) {
        setCategories((prev) => [createdCategory, ...prev]);
        setCategoryId(createdCategory.id);
        setNewCategoryName("");
        setIsQuickAddingCategory(false);
        if (fieldErrors.category) {
          setFieldErrors((p) => ({ ...p, category: "" }));
        }
        toast.success(`تمت إضافة القسم "${trimmed}" بنجاح`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "فشل إضافة القسم");
    } finally {
      setAddingCategoryLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName("");
    setPrice("");
    setComparePrice("");
    setStock("10");
    setImages([]);
    setHasOptions(false);
    setAttributes([]);
    setVariants([]);
    setNewCustomAttrName("");
    setAttrInputValues({});
    setBulkStockValue("");
    setWarehouseId(defaultWarehouseId || (internalWarehouses[0]?.id || ""));
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

  // Attribute Operations
  const handleAddAttributeFromTemplate = (template: AttributeTemplate) => {
    if (attributes.some((a) => a.name === template.name || a.slug === template.slug)) {
      toast.info(`الخاصية "${template.name}" مضافة بالفعل`);
      return;
    }
    const newAttr: QuickProductAttribute = {
      id: `attr_${template.slug}_${Date.now()}`,
      name: template.name,
      slug: template.slug,
      values: [...template.suggestedValues.slice(0, 3)], // start with first 3 popular values
    };
    setAttributes((prev) => [...prev, newAttr]);
    if (fieldErrors.options) {
      setFieldErrors((p) => ({ ...p, options: "" }));
    }
  };

  const handleAddCustomAttribute = () => {
    const trimmed = newCustomAttrName.trim();
    if (!trimmed) return;
    if (attributes.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("اسم الخاصية مضاف مسبقاً");
      return;
    }
    const slug = `attr_${Date.now()}`;
    const newAttr: QuickProductAttribute = {
      id: slug,
      name: trimmed,
      slug,
      values: [],
    };
    setAttributes((prev) => [...prev, newAttr]);
    setNewCustomAttrName("");
    if (fieldErrors.options) {
      setFieldErrors((p) => ({ ...p, options: "" }));
    }
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddValueToAttribute = (attrId: string, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setAttributes((prev) =>
      prev.map((a) => {
        if (a.id !== attrId) return a;
        if (a.values.includes(trimmed)) return a;
        return { ...a, values: [...a.values, trimmed] };
      })
    );
    setAttrInputValues((prev) => ({ ...prev, [attrId]: "" }));
    if (fieldErrors.options) {
      setFieldErrors((p) => ({ ...p, options: "" }));
    }
  };

  const handleRemoveValueFromAttribute = (attrId: string, valueToRemove: string) => {
    setAttributes((prev) =>
      prev.map((a) => {
        if (a.id !== attrId) return a;
        return { ...a, values: a.values.filter((v) => v !== valueToRemove) };
      })
    );
  };

  // Combination Counter Calculation
  const validAttributes = useMemo(() => {
    return attributes.filter((a) => a.values && a.values.length > 0);
  }, [attributes]);

  const potentialCombinationCount = useMemo(() => {
    if (validAttributes.length === 0) return 0;
    return validAttributes.reduce((acc, a) => acc * a.values.length, 1);
  }, [validAttributes]);

  // Generate Cartesian Product Variations (توليد المتغيرات)
  const computeCombinations = (
    currentAttributes: QuickProductAttribute[],
    basePrice: string,
    existingVariants: QuickGeneratedVariant[] = []
  ): QuickGeneratedVariant[] => {
    const activeAttrs = currentAttributes.filter(
      (a) => a.values && a.values.length > 0
    );
    if (activeAttrs.length === 0) return [];

    const combinations: { [key: string]: string }[][] = activeAttrs.map((attr) =>
      attr.values.map((value) => ({ [attr.name]: value }))
    );

    const allCombos = combinations.reduce(
      (acc, curr) => {
        if (acc.length === 0) return curr.map((item) => [item]);
        return acc.flatMap((combo) => curr.map((item) => [...combo, item]));
      },
      [] as { [key: string]: string }[][]
    );

    return allCombos.map((combo, idx) => {
      const attributeValues = combo.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      const variantName = Object.values(attributeValues).join(" - ");

      // Match against existing variants to preserve price/stock
      const existing = existingVariants.find((ev) => {
        if (ev.name.trim() === variantName.trim()) return true;
        if (
          ev.attributeValues &&
          Object.keys(ev.attributeValues).length === Object.keys(attributeValues).length
        ) {
          return Object.entries(attributeValues).every(
            ([k, v]) => ev.attributeValues[k] === v
          );
        }
        return false;
      });

      return {
        id: existing?.id || `var-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: variantName,
        price: existing?.price !== undefined ? existing.price : (basePrice || ""),
        stock: existing?.stock !== undefined ? existing.stock : "10",
        attributeValues,
      };
    });
  };

  const handleGenerateVariations = () => {
    if (validAttributes.length === 0) {
      toast.error("يرجى إضافة قيم واحدة على الأقل لكل خاصية قبل التوليد");
      return;
    }
    const generated = computeCombinations(attributes, price, variants);
    setVariants(generated);
    if (fieldErrors.options) {
      setFieldErrors((p) => ({ ...p, options: "" }));
    }
    toast.success(`تم توليد ${generated.length} متغير بنجاح`);
  };

  const handleUpdateVariant = (
    id: string,
    field: "price" | "stock",
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleApplyBasePriceToAll = () => {
    if (!price) return;
    setVariants((prev) => prev.map((v) => ({ ...v, price })));
    toast.success(`تم تطبيق السعر ${price} ${displayCurrency} على جميع المتغيرات`);
  };

  const handleApplyBulkStockToAll = () => {
    const trimmed = bulkStockValue.trim();
    if (!trimmed || isNaN(Number(trimmed))) return;
    setVariants((prev) => prev.map((v) => ({ ...v, stock: trimmed })));
    toast.success(`تم تطبيق الكمية ${trimmed} على جميع المتغيرات`);
    setBulkStockValue("");
  };

  // Validation
  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = "يرجى كتابة اسم المنتج";
    if (!price || Number(price) <= 0) errors.price = "يرجى إدخال سعر صحيح";
    if (!categoryId) errors.category = "يرجى اختيار قسم للمنتج";
    if (showWarehouseSelect && !warehouseId) errors.warehouse = "يرجى اختيار المخزن";
    if (comparePrice && Number(comparePrice) <= Number(price)) {
      errors.comparePrice = "السعر قبل الخصم يجب أن يكون أكبر من سعر البيع";
    }
    if (hasOptions) {
      if (validAttributes.length === 0) {
        errors.options = "لقد قمت بتفعيل المتغيرات، يرجى إضافة خاصية واحدة على الأقل وبها قيم (مثل المقاس أو اللون)";
      } else if (variants.length === 0 && potentialCombinationCount === 0) {
        errors.options = "يرجى إضافة قيم للمتغيرات ثم الضغط على توليد المتغيرات";
      }
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
      // If user configured attributes with values but forgot to click "توليد المتغيرات",
      // auto-generate them now so they are not blocked or surprised.
      let finalVariants = variants;
      if (hasOptions && finalVariants.length === 0 && validAttributes.length > 0) {
        finalVariants = computeCombinations(attributes, price, []);
        setVariants(finalVariants);
      }

      // 1. Prepare Attributes and Variants payload
      const productAttributes = hasOptions && validAttributes.length > 0
        ? validAttributes.map((attr) => ({
            id: attr.slug || attr.id,
            name: attr.name,
            slug: attr.slug || attr.name.toLowerCase().replace(/\s+/g, "_"),
            values: attr.values,
            visible: true,
            forVariations: true,
            requiredForOrder: true,
          }))
        : [];

      const totalCalculatedStock = hasOptions && finalVariants.length > 0
        ? finalVariants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0)
        : parseInt(stock, 10) || 0;

      const attributeStyles: Record<string, string> = {};
      const requiredAttrKeys: string[] = [];
      const attributeLabelsMap: Record<string, string> = {};

      productAttributes.forEach((attr) => {
        attributeStyles[attr.name] = "buttons";
        requiredAttrKeys.push(attr.name);
        attributeLabelsMap[attr.slug] = attr.name;
      });

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
        warehouseId: warehouseId || undefined,
        metadata: JSON.stringify({
          attributes: productAttributes,
          shippingClass: "standard",
          enableCheckoutForm: true,
          warehouseId: warehouseId || undefined,
          variantSettings: hasOptions && validAttributes.length > 0 ? {
            styles: attributeStyles,
          } : undefined,
          aiOrderOptions: {
            requiredAttributes: requiredAttrKeys,
            attributeLabels: attributeLabelsMap,
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
      if (hasOptions && finalVariants.length > 0) {
        await Promise.all(
          finalVariants.map(async (v, idx) => {
            const variantPayload = {
              name: v.name,
              type: "combination",
              price: v.price ? parseFloat(v.price) : parseFloat(price),
              comparePrice: comparePrice ? parseFloat(comparePrice) : null,
              stock: parseInt(v.stock, 10) || 0,
              trackInventory: true,
              isActive: true,
              sortOrder: idx,
              warehouseId: warehouseId || undefined,
              metadata: JSON.stringify({
                attributeValues: v.attributeValues,
                shippingClass: "standard",
                warehouseId: warehouseId || undefined,
              }),
            };
            try {
              await productApi.createVariant(createdProductId, variantPayload);
            } catch (vErr) {
              console.error("فشل إنشاء المتغير:", v.name, vErr);
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

  if (!open) return null;

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

          {/* 2. Pricing Grid */}
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

          {/* 3. Category & Warehouse Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category with inline quick add and select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  قسم المنتج <span className="text-rose-500">*</span>
                </label>
                {!isQuickAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingCategory(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>إضافة قسم جديد</span>
                  </button>
                )}
              </div>

              {isQuickAddingCategory ? (
                <div className="space-y-2 p-2 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddCategory();
                        }
                      }}
                      placeholder="اكتب اسم القسم الجديد (مثال: ملابس)..."
                      className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      disabled={addingCategoryLoading || !newCategoryName.trim()}
                      onClick={handleQuickAddCategory}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-lg transition-all shrink-0"
                    >
                      {addingCategoryLoading ? "جارٍ الحفظ..." : "حفظ القسم"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickAddingCategory(false);
                        setNewCategoryName("");
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: "" }));
                    }}
                    disabled={loadingCategories}
                    className={`flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                      fieldErrors.category
                        ? "border-rose-400 dark:border-rose-600"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <option value="">
                      {loadingCategories
                        ? "جارٍ تحميل الأقسام..."
                        : categories.length === 0
                        ? "-- لا توجد أقسام (اضغط + لإضافة قسم) --"
                        : "-- اختر القسم --"}
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingCategory(true)}
                    title="إضافة قسم جديد فوراً"
                    aria-label="إضافة قسم جديد"
                    className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-xs font-bold transition-all transform active:scale-95 shrink-0"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">قسم جديد</span>
                  </button>
                </div>
              )}
              {fieldErrors.category && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.category}</p>
              )}
            </div>

            {/* Warehouse Selector (shown when showWarehouseSelect is true) */}
            {showWarehouseSelect && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  المخزن <span className="text-rose-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    if (fieldErrors.warehouse) setFieldErrors((p) => ({ ...p, warehouse: "" }));
                  }}
                  disabled={loadingWarehouses}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    fieldErrors.warehouse
                      ? "border-rose-400 dark:border-rose-600"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <option value="">
                    {loadingWarehouses
                      ? "جارٍ تحميل المخازن..."
                      : internalWarehouses.length === 0
                      ? "-- لا توجد مخازن متاحة --"
                      : "-- اختر المخزن --"}
                  </option>
                  {internalWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.warehouse && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.warehouse}</p>
                )}
              </div>
            )}

            {/* Initial Stock (Only manually editable when no variants are enabled) */}
            <div className={showWarehouseSelect ? "sm:col-span-2" : ""}>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                الكمية المتوفرة بالمخزن
                {hasOptions && (
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400 mr-1.5">
                    (تُحسب تلقائياً من مجموع المتغيرات)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                disabled={hasOptions}
                value={
                  hasOptions
                    ? variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0)
                    : stock
                }
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

          {/* 5. Attributes & Variations Section (المتغيرات والتركيبات) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  هل للمنتج مقاسات أو ألوان؟
                </span>
                <p className="text-xs text-slate-400">
                  فعل هذا الخيار لتحديد الخصائص (مثل المقاس واللون) وتوليد المتغيرات
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
                  if (next && attributes.length === 0) {
                    // Default to Size template with S, M, L
                    const defaultTemplate = ATTRIBUTE_TEMPLATES[0];
                    setAttributes([
                      {
                        id: `attr_${defaultTemplate.slug}_${Date.now()}`,
                        name: defaultTemplate.name,
                        slug: defaultTemplate.slug,
                        values: ["M", "L", "XL"],
                      },
                    ]);
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
              <div className="mt-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-5">
                {/* 5.1. Attribute Selector / Templates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. تحديد المتغيرات والخصائص (Attributes)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      اختر قالباً جاهزاً أو أضف خاصية جديدة
                    </span>
                  </div>

                  {/* Template Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {ATTRIBUTE_TEMPLATES.map((tmpl) => {
                      const isAdded = attributes.some((a) => a.name === tmpl.name);
                      return (
                        <button
                          key={tmpl.slug}
                          type="button"
                          onClick={() => handleAddAttributeFromTemplate(tmpl)}
                          disabled={isAdded}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isAdded
                              ? "bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                              : "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 active:scale-97 shadow-2xs"
                          }`}
                        >
                          <span>{tmpl.icon}</span>
                          <span>{tmpl.name}</span>
                          {isAdded ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ مضاف</span>
                          ) : (
                            <PlusIcon className="w-3 h-3 text-indigo-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Attribute Adder */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomAttrName}
                      onChange={(e) => setNewCustomAttrName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomAttribute();
                        }
                      }}
                      placeholder="أو اكتب اسم خاصية مخصصة (مثال: الخامة، السعة، الوزن)..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAttribute}
                      disabled={!newCustomAttrName.trim()}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-97 disabled:opacity-50 rounded-lg transition-all shrink-0"
                    >
                      + إضافة خاصية
                    </button>
                  </div>
                </div>

                {/* 5.2. Active Attributes Cards (المتغير وتحته قيمه) */}
                {attributes.length > 0 && (
                  <div className="space-y-3">
                    {attributes.map((attr) => {
                      const templateMatch = ATTRIBUTE_TEMPLATES.find((t) => t.name === attr.name);
                      const currentInput = attrInputValues[attr.id] || "";

                      return (
                        <div
                          key={attr.id}
                          className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-3"
                        >
                          {/* Attribute Card Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                {templateMatch?.icon || "🏷️"}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                {attr.name}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 rounded-full">
                                {attr.values.length} {attr.values.length === 1 ? "قيمة" : "قيم"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAttribute(attr.id)}
                              title={`حذف خاصية ${attr.name}`}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Values Chips Underneath Attribute (المتغير وتحته قيمه) */}
                          <div>
                            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                              القيم المحددة لـ {attr.name}:
                            </span>
                            {attr.values.length === 0 ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                                لم تضف أي قيم بعد. اختر من الاقتراحات بالأسفل أو اكتب قيمة جديدة:
                              </p>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                {attr.values.map((val) => (
                                  <span
                                    key={val}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded-lg shadow-2xs"
                                  >
                                    <span>{val}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveValueFromAttribute(attr.id, val)}
                                      aria-label={`حذف القيمة ${val}`}
                                      className="text-indigo-400 hover:text-rose-600 transition-colors mr-0.5"
                                    >
                                      <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Suggested Values Quick-Click (if applicable) */}
                            {templateMatch && (
                              <div className="flex flex-wrap items-center gap-1 mb-2.5">
                                <span className="text-[10px] text-slate-400 ml-1">اقتراحات سريعة:</span>
                                {templateMatch.suggestedValues
                                  .filter((sv) => !attr.values.includes(sv))
                                  .map((sv) => (
                                    <button
                                      key={sv}
                                      type="button"
                                      onClick={() => handleAddValueToAttribute(attr.id, sv)}
                                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-50 dark:bg-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-600 rounded-md transition-all active:scale-95"
                                    >
                                      + {sv}
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* Add Custom Value Input for this Attribute */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={currentInput}
                                onChange={(e) =>
                                  setAttrInputValues((prev) => ({
                                    ...prev,
                                    [attr.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && currentInput.trim()) {
                                    e.preventDefault();
                                    handleAddValueToAttribute(attr.id, currentInput);
                                  }
                                }}
                                placeholder={`اكتب قيمة لـ ${attr.name} واضغط Enter (مثال: ${
                                  attr.name === "اللون" ? "رمادي" : attr.name === "المقاس" ? "XXL" : "قيمة جديدة"
                                })...`}
                                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddValueToAttribute(attr.id, currentInput)}
                                disabled={!currentInput.trim()}
                                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                              >
                                + إضافة قيمة
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5.3. Generation Action Banner (توليد المتغيرات) */}
                {validAttributes.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ArrowPathIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          توليد التركيبات والمتغيرات ({potentialCombinationCount})
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                        سيتم دمج الخصائص:{" "}
                        {validAttributes.map((a) => `${a.name} (${a.values.length})`).join(" × ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateVariations}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-97 shrink-0"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      <span>توليد المتغيرات ({potentialCombinationCount})</span>
                    </button>
                  </div>
                )}

                {/* 5.4. Generated Variations Matrix / List (المتغيرات المولدة) */}
                {variants.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          قائمة المتغيرات المولدة ({variants.length})
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          حدد السعر والكمية لكل متغير أو طبّق قيمة موحدة
                        </p>
                      </div>

                      {/* Bulk Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {price && (
                          <button
                            type="button"
                            onClick={handleApplyBasePriceToAll}
                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800/40 transition-colors"
                          >
                            تطبيق السعر الأساسي ({price}) على الكل
                          </button>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={bulkStockValue}
                            onChange={(e) => setBulkStockValue(e.target.value)}
                            placeholder="كمية موحدة"
                            className="w-20 px-2 py-1 text-xs tabular-nums bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyBulkStockToAll}
                            disabled={!bulkStockValue.trim()}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-colors"
                          >
                            تطبيق
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Variations Scrollable List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                      {variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <TagIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {v.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Price */}
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">السعر:</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={v.price}
                                onChange={(e) => handleUpdateVariant(v.id, "price", e.target.value)}
                                placeholder={price || "0.00"}
                                className="w-20 px-2 py-1 text-xs tabular-nums bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                            </div>

                            {/* Stock */}
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">الكمية:</span>
                              <input
                                type="number"
                                min="0"
                                value={v.stock}
                                onChange={(e) => handleUpdateVariant(v.id, "stock", e.target.value)}
                                placeholder="10"
                                className="w-18 px-2 py-1 text-xs tabular-nums bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                            </div>

                            {/* Delete variant */}
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(v.id)}
                              aria-label={`حذف متغير ${v.name}`}
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
