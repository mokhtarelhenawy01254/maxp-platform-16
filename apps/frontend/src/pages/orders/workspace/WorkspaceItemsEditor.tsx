import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShoppingBagIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { apiClient } from '../../../services/apiClient';
import { WorkspaceOrder, WorkspaceOrderItem } from './types';

const COLOR_KEYS = ['اللون', 'الوان', 'Color', 'color', 'pa_color', 'لون'];
const SIZE_KEYS = ['المقاس', 'مقاس', 'Size', 'size', 'pa_size', 'الحجم', 'القياس'];

const getAttrValue = (metaAttrs: any, keys: string[]) => {
  if (!metaAttrs || typeof metaAttrs !== 'object') return null;
  for (const k of keys) {
    if (metaAttrs[k] != null && String(metaAttrs[k]).trim()) return String(metaAttrs[k]).trim();
  }
  return null;
};

const normalizeText = (s?: string | null) =>
  (s || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/[ةه]/g, 'ه').trim();

const SimplifiedProductSelectionModal = React.lazy(
  () => import('../components/SimplifiedProductSelectionModal')
);

interface WorkspaceItemsEditorProps {
  order: WorkspaceOrder;
  onSave: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const WorkspaceItemsEditor: React.FC<WorkspaceItemsEditorProps> = ({
  order,
  onSave,
  onCancel,
  isSaving,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const toEditableItems = (source: WorkspaceOrderItem[] | undefined): WorkspaceOrderItem[] =>
    (source || []).map((it, idx) => ({
      ...it,
      id: it.id || `item-${idx}-${Date.now()}`,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      total: Number(it.total) || (Number(it.price) || 0) * (Number(it.quantity) || 1),
    }));

  const [items, setItems] = useState<WorkspaceOrderItem[]>(() => toEditableItems(order.items));

  const [shipping, setShipping] = useState<number>(Number(order.shipping) || 0);
  const [discount, setDiscount] = useState<number>(Number(order.discount) || 0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [customColorMode, setCustomColorMode] = useState<Record<number, boolean>>({});
  const [customSizeMode, setCustomSizeMode] = useState<Record<number, boolean>>({});
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, any[]>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  // إعادة التهيئة عند تبديل الطلب — بدونها يستمر المحرر ببنود الطلب السابق
  // ويحفظها فوق الطلب الجديد عندما يستبدل الـ poll الطلب المفتوح
  useEffect(() => {
    setItems(toEditableItems(order.items));
    setShipping(Number(order.shipping) || 0);
    setDiscount(Number(order.discount) || 0);
    setCustomColorMode({});
    setCustomSizeMode({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  // جلب متغيرات المنتجات إذا لم تكن محملة مسبقاً
  useEffect(() => {
    items.forEach((item) => {
      const pId = item.productId;
      if (
        pId &&
        (!item.variants || item.variants.length === 0) &&
        !productVariantsMap[pId] &&
        !inFlightRef.current.has(pId)
      ) {
        inFlightRef.current.add(pId);
        apiClient
          .get(`/agent-workspace/products/${pId}/variants`)
          .then((res) => {
            if (res.data?.success && res.data?.data?.variants) {
              setProductVariantsMap((prev) => ({
                ...prev,
                [pId]: res.data.data.variants,
              }));
            }
          })
          .catch(() => {
            // حفظ مصفوفة فارغة لتجنب التكرار اللانهائي في حال فشل الطلب
            setProductVariantsMap((prev) => ({
              ...prev,
              [pId]: [],
            }));
          })
          .finally(() => {
            inFlightRef.current.delete(pId);
          });
      }
    });
  }, [items, productVariantsMap]);

  const getItemOptions = (item: WorkspaceOrderItem) => {
    const vars =
      (item.variants && item.variants.length > 0 ? item.variants : null) ||
      (item.product?.variants && item.product.variants.length > 0 ? item.product.variants : null) ||
      (item.product?.productVariants && item.product.productVariants.length > 0 ? item.product.productVariants : null) ||
      (item.productId && productVariantsMap[item.productId] && productVariantsMap[item.productId].length > 0
        ? productVariantsMap[item.productId]
        : null) ||
      [];

    const colors = new Set<string>();
    const sizes = new Set<string>();

    vars.forEach((v: any) => {
      let meta: any = {};
      if (typeof v.metadata === 'string') {
        try { meta = JSON.parse(v.metadata); } catch {}
      } else if (v.metadata && typeof v.metadata === 'object') {
        meta = v.metadata;
      }
      const attrs = meta.attributeValues || {};
      const c = getAttrValue(attrs, COLOR_KEYS) || v.color;
      const s = getAttrValue(attrs, SIZE_KEYS) || (v.size != null ? String(v.size) : null);

      if (c) colors.add(String(c).trim());
      if (s) sizes.add(String(s).trim());

      if ((!c || !s) && v.name && v.name.includes('-')) {
        const parts = v.name.split('-').map((p: string) => p.trim());
        if (parts.length >= 2) {
          if (!c && parts[0]) colors.add(parts[0]);
          if (!s && parts[1]) sizes.add(parts[1]);
        }
      }
    });

    return {
      colors: Array.from(colors),
      sizes: Array.from(sizes),
      variants: vars,
    };
  };

  const handleVariantAttributeChange = (index: number, newColor: string, newSize: string) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const { variants: vars } = getItemOptions(item);

        const normColor = normalizeText(newColor);
        const normSize = normalizeText(newSize);

        // Find matching variant only if color or size is specified
        const matched = (normColor || normSize)
          ? vars.find((v: any) => {
              let meta: any = {};
              try { meta = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : (v.metadata || {}); } catch {}
              const attrs = meta.attributeValues || {};
              const vColor = getAttrValue(attrs, COLOR_KEYS) || v.color;
              const vSize = getAttrValue(attrs, SIZE_KEYS) || (v.size != null ? String(v.size) : null);

              const normVColor = normalizeText(vColor);
              const normVSize = normalizeText(vSize);
              const variantNameTokens = (v.name || '').split(/[\s\-_/]+/).map(normalizeText);

              const colorMatch = !normColor || (normVColor && normVColor === normColor) || variantNameTokens.includes(normColor);
              const sizeMatch = !normSize || (normVSize && normVSize === normSize) || variantNameTokens.includes(normSize);
              return colorMatch && sizeMatch;
            })
          : null;

        const updatedImage =
          matched?.image ||
          (matched?.images
            ? Array.isArray(matched.images)
              ? matched.images[0]
              : typeof matched.images === 'string'
              ? (() => {
                  try {
                    const arr = JSON.parse(matched.images);
                    return Array.isArray(arr) ? arr[0] : arr;
                  } catch {
                    return matched.images;
                  }
                })()
              : null
            : null);

        const updatedSku = matched?.sku || item.productSku || item.sku;
        const updatedPrice = matched?.price ? Number(matched.price) : item.price;

        return {
          ...item,
          productColor: newColor,
          productSize: newSize,
          variantId: matched ? matched.id : null,
          productSku: updatedSku,
          sku: updatedSku,
          productImage: updatedImage || item.productImage,
          price: updatedPrice,
          total: updatedPrice * item.quantity,
        };
      })
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const finalTotal = Math.max(0, subtotal + shipping - discount);

  const handleUpdateQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.price,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProductSelected = (product: any, variant?: any) => {
    const unitPrice = Number(variant?.price || product.price || 0);
    const newItem: WorkspaceOrderItem = {
      id: `new-${Date.now()}`,
      productId: product.id,
      variantId: variant?.id,
      productName: product.name,
      name: product.name,
      quantity: 1,
      price: unitPrice,
      total: unitPrice,
      productColor: variant?.color,
      productSize: variant?.size,
      productImage: variant?.image || product.image,
      sku: variant?.sku || product.sku,
      product: product,
      variants: product.variants,
    };

    setItems((prev) => [...prev, newItem]);
    setIsCatalogOpen(false);
  };

  const handleSave = async () => {
    await onSave(order.id, items, {
      shipping,
      discount,
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShoppingBagIcon className="h-4 w-4 text-primary" />
          <span>{isArabic ? 'تعديل بنود وعروض الطلب' : 'Edit Order Items & Upsell'}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCatalogOpen(true)}
          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? '+ إضافة عرض إضافي (Upsell)' : '+ Add Upsell Item'}</span>
        </button>
      </div>

      {/* Items list */}
      <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
        {items.map((item, idx) => {
          const { colors, sizes } = getItemOptions(item);
          const isCustomColor =
            customColorMode[idx] ||
            (colors.length > 0 && item.productColor && !colors.includes(item.productColor));
          const isCustomSize =
            customSizeMode[idx] ||
            (sizes.length > 0 && item.productSize && !sizes.includes(item.productSize));

          return (
            <div
              key={item.id || idx}
              className="rounded-md border border-border/40 bg-muted/20 p-2 text-xs space-y-2"
            >
              {/* Row 1: Image, Name, Price, Stepper & Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.productImage && (
                    <img
                      src={item.productImage}
                      alt=""
                      className="h-8 w-8 rounded object-cover border border-border/40 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">
                      {item.productName || item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                      <span>{formatPrice(item.price)}</span>
                      {item.productSku && <span className="opacity-70 truncate">({item.productSku})</span>}
                    </div>
                  </div>
                </div>

                {/* Stepper & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center rounded border border-border/60 bg-background">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, -1)}
                      disabled={item.quantity <= 1}
                      className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                      title={isArabic ? 'تقليل' : 'Decrease'}
                    >
                      <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="min-w-[20px] text-center font-mono text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, 1)}
                      className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                      title={isArabic ? 'زيادة' : 'Increase'}
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="min-w-[50px] text-end font-mono font-bold tabular-nums text-foreground">
                    {formatPrice(item.quantity * item.price)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    title={isArabic ? 'حذف البند' : 'Remove item'}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Color and Size Editor Controls */}
              <div className="flex flex-wrap items-center gap-2 rounded bg-background/70 p-1.5 border border-border/40 text-[11px]">
                {/* Color Selector / Input */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                    {isArabic ? 'اللون:' : 'Color:'}
                  </span>
                  {colors.length > 0 && !isCustomColor ? (
                    <div className="flex items-center gap-0.5">
                      <select
                        value={item.productColor || ''}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setCustomColorMode((prev) => ({ ...prev, [idx]: true }));
                          } else {
                            handleVariantAttributeChange(idx, e.target.value, item.productSize || '');
                          }
                        }}
                        className="h-6 max-w-[130px] rounded border border-border/60 bg-background px-1 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="">{isArabic ? '-- اختر اللون --' : '-- Select --'}</option>
                        {colors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__CUSTOM__">{isArabic ? '✏️ كتابة لون آخر...' : '✏️ Other...'}</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        value={item.productColor || ''}
                        onChange={(e) =>
                          handleVariantAttributeChange(idx, e.target.value, item.productSize || '')
                        }
                        placeholder={isArabic ? 'اللون...' : 'Color...'}
                        className="h-6 w-24 rounded border border-border/60 bg-background px-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
                      />
                      {colors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomColorMode((prev) => ({ ...prev, [idx]: false }));
                            handleVariantAttributeChange(idx, '', item.productSize || '');
                          }}
                          className="px-1 text-[10px] text-primary hover:underline"
                          title={isArabic ? 'اختيار من القائمة' : 'Select from list'}
                        >
                          ↩
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Size Selector / Input */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                    {isArabic ? 'المقاس:' : 'Size:'}
                  </span>
                  {sizes.length > 0 && !isCustomSize ? (
                    <div className="flex items-center gap-0.5">
                      <select
                        value={item.productSize || ''}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setCustomSizeMode((prev) => ({ ...prev, [idx]: true }));
                          } else {
                            handleVariantAttributeChange(idx, item.productColor || '', e.target.value);
                          }
                        }}
                        className="h-6 max-w-[110px] rounded border border-border/60 bg-background px-1 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="">{isArabic ? '-- اختر المقاس --' : '-- Select --'}</option>
                        {sizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="__CUSTOM__">{isArabic ? '✏️ مقاس آخر...' : '✏️ Other...'}</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        value={item.productSize || ''}
                        onChange={(e) =>
                          handleVariantAttributeChange(idx, item.productColor || '', e.target.value)
                        }
                        placeholder={isArabic ? 'المقاس...' : 'Size...'}
                        className="h-6 w-20 rounded border border-border/60 bg-background px-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
                      />
                      {sizes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSizeMode((prev) => ({ ...prev, [idx]: false }));
                            handleVariantAttributeChange(idx, item.productColor || '', '');
                          }}
                          className="px-1 text-[10px] text-primary hover:underline"
                          title={isArabic ? 'اختيار من القائمة' : 'Select from list'}
                        >
                          ↩
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Financials Controls */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-2 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? 'الشحن' : 'Shipping'}
          </label>
          <input
            type="number"
            min="0"
            value={shipping}
            onChange={(e) => setShipping(Math.max(0, parseFloat(e.target.value) || 0))}
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? 'الخصم' : 'Discount'}
          </label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Totals Preview */}
      <div className="mt-2.5 flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="font-bold text-foreground">
          {isArabic ? 'الإجمالي الجديد المحسوب:' : 'New Computed Total:'}
        </span>
        <span className="font-mono text-sm font-black tabular-nums text-primary">
          {formatPrice(finalTotal)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? 'إلغاء' : 'Cancel'}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          <span>{isSaving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : (isArabic ? 'حفظ التعديلات' : 'Save Changes')}</span>
        </button>
      </div>

      {/* Simplified Product Selection Modal for Upsells */}
      {isCatalogOpen && (
        <React.Suspense fallback={null}>
          <SimplifiedProductSelectionModal
            isOpen={isCatalogOpen}
            onClose={() => setIsCatalogOpen(false)}
            onProductSelected={handleProductSelected}
          />
        </React.Suspense>
      )}
    </div>
  );
};
