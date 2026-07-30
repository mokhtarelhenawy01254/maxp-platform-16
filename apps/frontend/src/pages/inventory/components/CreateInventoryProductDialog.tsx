import { Image as PhotoIcon, Plus as PlusIcon, Trash2 as TrashIcon, X as XMarkIcon } from 'lucide-react';
import React, { useMemo, useState } from "react";
;
import { companyAwareApi } from "../../../services/companyAwareApi";
import { uploadFiles } from "../../../utils/apiHelpers";
import { getImageUrl, normalizeImagePath } from "../../../utils/imageUrl";

interface WarehouseOption {
  id: string;
  name: string;
}

interface InventoryVariantDraft {
  id: string;
  name: string;
  type: string;
  sku: string;
  quantity: string;
  wholesalePrice: string;
  salePrice: string;
}

interface CreateInventoryProductDialogProps {
  open: boolean;
  warehouses: WarehouseOption[];
  defaultWarehouseId?: string;
  onClose: () => void;
  onCreated: (product: { id: string; name?: string }) => void;
}

interface CreateInventoryProductResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    name?: string;
  };
}

const createVariantId = () =>
  `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyVariant = (): InventoryVariantDraft => ({
  id: createVariantId(),
  name: "",
  type: "option",
  sku: "",
  quantity: "",
  wholesalePrice: "",
  salePrice: "",
});

const compactString = (value: string) => value.trim();

const toOptionalNumberString = (value: string) =>
  compactString(value) ? compactString(value) : undefined;

const CreateInventoryProductDialog: React.FC<CreateInventoryProductDialogProps> = ({
  open,
  warehouses,
  defaultWarehouseId,
  onClose,
  onCreated,
}) => {
  const initialWarehouseId = defaultWarehouseId || warehouses[0]?.id || "";
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    wholesalePrice: "",
    salePrice: "",
    warehouseId: initialWarehouseId,
    quantity: "",
    reorderPoint: "",
    batchNumber: "",
    expiryDate: "",
    notes: "",
  });
  const [variants, setVariants] = useState<InventoryVariantDraft[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setFormData((previous) => ({
        ...previous,
        warehouseId:
          previous.warehouseId || defaultWarehouseId || warehouses[0]?.id || "",
      }));
    }
  }, [defaultWarehouseId, open, warehouses]);

  const totalVariantQuantity = useMemo(
    () =>
      variants.reduce(
        (sum, variant) => sum + Math.max(0, Number(variant.quantity || 0)),
        0,
      ),
    [variants],
  );

  const effectiveQuantity =
    variants.length > 0 ? totalVariantQuantity : Math.max(0, Number(formData.quantity || 0));

  if (!open) {
    return null;
  }

  const resetAndClose = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      wholesalePrice: "",
      salePrice: "",
      warehouseId: defaultWarehouseId || warehouses[0]?.id || "",
      quantity: "",
      reorderPoint: "",
      batchNumber: "",
      expiryDate: "",
      notes: "",
    });
    setVariants([]);
    setImages([]);
    setError(null);
    onClose();
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (error) {
      setError(null);
    }
  };

  const updateVariant = (
    variantId: string,
    field: keyof InventoryVariantDraft,
    value: string,
  ) => {
    setVariants((previous) =>
      previous.map((variant) =>
        variant.id === variantId ? { ...variant, [field]: value } : variant,
      ),
    );
    if (error) {
      setError(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploadingImages(true);
    setError(null);
    try {
      const result = await uploadFiles(files, "upload/multiple");
      const rawUrls = Array.isArray(result) ? result : result?.data || [];
      const uploaded = rawUrls
        .map((item: any) => {
          if (typeof item === "string") return item;
          return item?.fullUrl || item?.url || item?.path || "";
        })
        .map((url: string) => normalizeImagePath(url) || url)
        .filter(Boolean);

      setImages((previous) => Array.from(new Set([...previous, ...uploaded])));
    } catch (uploadError: any) {
      setError(uploadError?.message || "تعذر رفع الصور");
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!compactString(formData.name)) {
      setError("اسم المنتج مطلوب");
      return;
    }

    if (!formData.warehouseId) {
      setError("اختيار المخزن مطلوب");
      return;
    }

    if (effectiveQuantity <= 0) {
      setError("الكمية يجب أن تكون أكبر من صفر");
      return;
    }

    const normalizedVariants = variants
      .map((variant) => ({
        name: compactString(variant.name),
        type: compactString(variant.type) || "option",
        sku: compactString(variant.sku) || undefined,
        quantity: Number(variant.quantity || 0),
        wholesalePrice: toOptionalNumberString(variant.wholesalePrice),
        salePrice: toOptionalNumberString(variant.salePrice),
      }))
      .filter((variant) => variant.name);

    if (variants.length > 0 && normalizedVariants.length !== variants.length) {
      setError("كل متغير لازم يكون له اسم واضح");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        name: compactString(formData.name),
        sku: compactString(formData.sku) || undefined,
        barcode: compactString(formData.barcode) || undefined,
        wholesalePrice: toOptionalNumberString(formData.wholesalePrice),
        salePrice: toOptionalNumberString(formData.salePrice),
        warehouseId: formData.warehouseId,
        quantity: variants.length > 0 ? undefined : Number(formData.quantity || 0),
        reorderPoint: toOptionalNumberString(formData.reorderPoint),
        batchNumber: compactString(formData.batchNumber) || undefined,
        expiryDate: formData.expiryDate || undefined,
        notes: compactString(formData.notes) || undefined,
        images,
        variants: normalizedVariants,
      };

      const response = await companyAwareApi.post<CreateInventoryProductResponse>(
        "/inventory/products",
        payload,
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "فشل في إضافة المنتج");
      }

      onCreated(response.data.data);
      resetAndClose();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || submitError?.message || "فشل في إضافة المنتج");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900" dir="rtl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
              إدخال مخزني
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              إضافة منتج من المخزن
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              سيتم إنشاء المنتج قيد المراجعة، ويستكمل فريق المنتجات بيانات البيع لاحقاً.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="إغلاق"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          {warehouses.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              لا توجد مخازن نشطة. أنشئ مخزن أولاً قبل إضافة منتج من المخزن.
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                اسم المنتج *
              </span>
              <input
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-indigo-900/40"
                placeholder="مثال: تيشيرت قطن أسود"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                المخزن *
              </span>
              <select
                value={formData.warehouseId}
                onChange={(event) => updateField("warehouseId", event.target.value)}
                disabled={warehouses.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/50"
              >
                <option value="">اختر المخزن</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                SKU
              </span>
              <input
                value={formData.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="رمز التخزين"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                باركود
              </span>
              <input
                value={formData.barcode}
                onChange={(event) => updateField("barcode", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="GTIN / UPC / كود داخلي"
              />
            </label>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                سعر الجملة / التكلفة
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.wholesalePrice}
                onChange={(event) => updateField("wholesalePrice", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="اختياري"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                سعر البيع
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={(event) => updateField("salePrice", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="اختياري"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                الكمية *
              </span>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                disabled={variants.length > 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/50"
                placeholder={variants.length > 0 ? String(totalVariantQuantity) : "0"}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                حد إعادة الطلب
              </span>
              <input
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(event) => updateField("reorderPoint", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="اختياري"
              />
            </label>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                رقم الدفعة
              </span>
              <input
                value={formData.batchNumber}
                onChange={(event) => updateField("batchNumber", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Batch / Lot"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                تاريخ الصلاحية
              </span>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(event) => updateField("expiryDate", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </section>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  صور المنتج من المخزن
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  صور أولية للتمييز والمراجعة، ويمكن لفريق المنتجات ترتيبها لاحقاً.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <PhotoIcon className="h-4 w-4" />
                {uploadingImages ? "جاري الرفع..." : "رفع صور"}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {images.map((image) => (
                  <div key={image} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <img
                      src={getImageUrl(image) || image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((previous) => previous.filter((item) => item !== image))}
                      className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black"
                      aria-label="حذف الصورة"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  المتغيرات والكميات
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  استخدمها للمقاس أو اللون عندما تكون الكمية موزعة على اختيارات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariants((previous) => [...previous, emptyVariant()])}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
              >
                <PlusIcon className="h-4 w-4" />
                إضافة متغير
              </button>
            </div>

            {variants.length > 0 && (
              <div className="mt-4 space-y-3">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40 md:grid-cols-6"
                  >
                    <input
                      value={variant.name}
                      onChange={(event) => updateVariant(variant.id, "name", event.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white md:col-span-2"
                      placeholder="اسم المتغير: أسود / XL"
                    />
                    <select
                      value={variant.type}
                      onChange={(event) => updateVariant(variant.id, "type", event.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="option">اختيار</option>
                      <option value="color">لون</option>
                      <option value="size">مقاس</option>
                    </select>
                    <input
                      value={variant.quantity}
                      onChange={(event) => updateVariant(variant.id, "quantity", event.target.value)}
                      type="number"
                      min="0"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      placeholder="كمية"
                    />
                    <input
                      value={variant.sku}
                      onChange={(event) => updateVariant(variant.id, "sku", event.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      placeholder="SKU"
                    />
                    <button
                      type="button"
                      onClick={() => setVariants((previous) => previous.filter((item) => item.id !== variant.id))}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300"
                      aria-label="حذف المتغير"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  إجمالي كميات المتغيرات: {totalVariantQuantity}
                </div>
              </div>
            )}
          </section>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ملاحظات المخزن
            </span>
            <textarea
              value={formData.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="أي ملاحظة تخص الدفعة، الحالة، أو طريقة التخزين..."
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              الحالة بعد الحفظ: <span className="font-semibold text-amber-700 dark:text-amber-300">قيد المراجعة</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingImages || warehouses.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusIcon className="h-4 w-4" />
                {submitting ? "جاري الإضافة..." : "إضافة وإرسال للمراجعة"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInventoryProductDialog;
