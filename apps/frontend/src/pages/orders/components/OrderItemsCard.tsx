import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  TrashIcon,
  ExclamationCircleIcon,
  MinusIcon,
  EllipsisVerticalIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import { OrderItem } from "../types";
import { validatePrice, validateQuantity } from "../../../utils/validation";
import DeleteItemConfirmModal from "./DeleteItemConfirmModal";

const looksLikeSizeValue = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    value.trim(),
  );
};

const normalizeVariantDisplayValues = (color: unknown, size: unknown) => {
  const normalizedColor = typeof color === "string" ? color.trim() : "";
  let normalizedSize = typeof size === "string" ? size.trim() : "";

  if (
    normalizedColor &&
    normalizedSize &&
    normalizedColor.toLowerCase() === normalizedSize.toLowerCase()
  ) {
    normalizedSize = "";
  }

  if (normalizedSize && !looksLikeSizeValue(normalizedSize)) {
    if (
      normalizedColor &&
      (normalizedColor.includes(normalizedSize) ||
        normalizedSize.includes(normalizedColor))
    ) {
      normalizedSize = "";
    }
  }

  return {
    color: normalizedColor,
    size: normalizedSize,
  };
};

interface OrderItemsCardProps {
  isEditing: boolean;
  items: OrderItem[];
  currency: string;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
  onAddItem: () => void;
  onItemChange: (index: number, field: string, value: unknown) => void;
  onRemoveItem: (index: number) => void;
  onShippingChange?: (value: number) => void;
  onTaxChange?: (value: number) => void;
}

type OrderItemAttributeEntry = {
  type?: unknown;
  option?: unknown;
};

type OrderItemMetadata = {
  sku?: unknown;
  image?: unknown;
  images?: unknown;
  stock?: unknown;
  color?: unknown;
  size?: unknown;
  quantityOffer?: {
    groupId?: unknown;
    offerLabel?: unknown;
    offerQuantity?: unknown;
    slotIndex?: unknown;
    freeShipping?: unknown;
  };
  attributeValues?: Record<string, unknown>;
  attributes?: OrderItemAttributeEntry[];
};

type QuantityOfferDisplay = {
  groupId: string;
  offerLabel: string;
  offerQuantity: number;
  slotIndex: number | null;
  freeShipping: boolean;
};

type QuantityOfferGroupedItem = {
  item: OrderItem;
  index: number;
  slotIndex: number | null;
};

type QuantityOfferGroup = {
  groupId: string;
  offerLabel: string;
  offerQuantity: number;
  freeShipping: boolean;
  total: number;
  selectedPieces: number;
  items: QuantityOfferGroupedItem[];
};

const getOrderItemMetadata = (item: OrderItem): OrderItemMetadata => {
  const { metadata } = item;

  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as OrderItemMetadata;
      }
    } catch (error) {
      console.error("Error parsing order item metadata:", error);
    }

    return {};
  }

  return typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as OrderItemMetadata)
    : {};
};

const normalizeVariantBadges = (
  item: OrderItem,
  itemMetadata: OrderItemMetadata,
) => {
  let displayColor = item.productColor;
  let displaySize = item.productSize;

  try {
    if (!displayColor && itemMetadata.color) {
      displayColor = itemMetadata.color as string;
    }

    if (!displaySize && itemMetadata.size) {
      displaySize = itemMetadata.size as string;
    }

    if (itemMetadata.attributeValues) {
      if (!displayColor && itemMetadata.attributeValues["اللون"]) {
        displayColor = itemMetadata.attributeValues["اللون"] as string;
      }
      if (!displaySize && itemMetadata.attributeValues["المقاس"]) {
        displaySize = itemMetadata.attributeValues["المقاس"] as string;
      }
    }

    if (itemMetadata.attributes && Array.isArray(itemMetadata.attributes)) {
      itemMetadata.attributes.forEach((attr) => {
        if (
          attr.type === "color" &&
          typeof attr.option === "string" &&
          !displayColor
        ) {
          displayColor = attr.option;
        }
        if (
          attr.type === "size" &&
          typeof attr.option === "string" &&
          !displaySize
        ) {
          displaySize = attr.option;
        }
      });
    }
  } catch (error) {
    console.error("Error parsing variant metadata:", error);
  }

  return normalizeVariantDisplayValues(displayColor, displaySize);
};

const OrderItemsCard: React.FC<OrderItemsCardProps> = ({
  isEditing,
  items,

  totals,
  onAddItem,
  onItemChange,
  onRemoveItem,
  onShippingChange,
  onTaxChange,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    index: number;
    itemName: string;
    itemDetails: string;
  }>({
    isOpen: false,
    index: -1,
    itemName: "",
    itemDetails: "",
  });
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const handleDeleteClick = (index: number, item: OrderItem) => {
    const details = [];
    if (item.productColor) details.push(`اللون: ${item.productColor}`);
    if (item.productSize) details.push(`المقاس: ${item.productSize}`);
    if (item.quantity) details.push(`الكمية: ${item.quantity}`);

    setDeleteModal({
      isOpen: true,
      index,
      itemName: item.productName,
      itemDetails: details.join(" • "),
    });
    setOpenMenuIndex(null);
  };

  const handleConfirmDelete = () => {
    onRemoveItem(deleteModal.index);
    setDeleteModal({ isOpen: false, index: -1, itemName: "", itemDetails: "" });
  };

  const handlePriceChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    const validation = validatePrice(numValue);

    if (!validation.isValid && value !== "") {
      setValidationErrors((prev) => ({
        ...prev,
        [`price_${index}`]: validation.error || "",
      }));
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`price_${index}`];
        return newErrors;
      });
    }

    onItemChange(index, "price", isNaN(numValue) ? 0 : numValue);
  };

  const handleQuantityChange = (index: number, value: number) => {
    const validation = validateQuantity(value);

    if (!validation.isValid) {
      setValidationErrors((prev) => ({
        ...prev,
        [`quantity_${index}`]: validation.error || "",
      }));
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`quantity_${index}`];
        return newErrors;
      });
    }

    onItemChange(index, "quantity", value);
  };

  const incrementQuantity = (index: number, currentQty: number) => {
    handleQuantityChange(index, currentQty + 1);
  };

  const decrementQuantity = (index: number, currentQty: number) => {
    if (currentQty > 1) {
      handleQuantityChange(index, currentQty - 1);
    }
  };

  const normalizeImageSrc = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return normalizeImageSrc(value[0]);
    }

    if (typeof value === "object") {
      const candidate = value as { url?: unknown; src?: unknown };
      if (typeof candidate.url === "string") return candidate.url;
      if (typeof candidate.src === "string") return candidate.src;
    }

    return null;
  };

  // Prefer persisted order item images, then fall back to legacy metadata formats.
  const getProductImage = (item: OrderItem): string | null => {
    const metadata = getOrderItemMetadata(item);

    try {
      const directImage = normalizeImageSrc(item.productImage);
      if (directImage) return directImage;

      const metadataImage = normalizeImageSrc(metadata.image);
      if (metadataImage) return metadataImage;
      if (Array.isArray(metadata.images) && metadata.images.length > 0) {
        const firstImage = normalizeImageSrc(metadata.images);
        if (firstImage) return firstImage;
      }
    } catch (e) {
      console.error("Error parsing product image:", e);
    }
    return null;
  };

  // Get stock info from metadata
  const getStockInfo = (
    item: OrderItem,
  ): { stock: number; status: "available" | "low" | "out" } => {
    const metadata = getOrderItemMetadata(item);
    const stock = Number(metadata.stock || 0);

    if (stock <= 0) return { stock, status: "out" };
    if (stock < 5) return { stock, status: "low" };
    return { stock, status: "available" };
  };

  const getQuantityOfferSummary = (
    item: OrderItem,
  ): QuantityOfferDisplay | null => {
    const metadata = getOrderItemMetadata(item);
    if (!metadata.quantityOffer) {
      return null;
    }

    const quantityOffer = metadata.quantityOffer;
    const groupId =
      typeof quantityOffer.groupId === "string" ? quantityOffer.groupId.trim() : "";
    const offerQuantity = Number(quantityOffer.offerQuantity);
    const slotIndex = Number(quantityOffer.slotIndex);

    return {
      groupId,
      offerLabel:
        (typeof quantityOffer.offerLabel === "string"
          ? quantityOffer.offerLabel
          : "") ||
        (typeof metadata.attributeValues?.["عرض الكمية"] === "string"
          ? metadata.attributeValues["عرض الكمية"]
          : "") ||
        "عرض كميات",
      offerQuantity:
        Number.isFinite(offerQuantity) && offerQuantity > 0
          ? offerQuantity
          : Math.max(1, Number(item.quantity || 1)),
      slotIndex:
        Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null,
      freeShipping: Boolean(quantityOffer?.freeShipping),
    };
  };

  const groupedQuantityOffers = useMemo(() => {
    const singles: Array<{ item: OrderItem; index: number }> = [];
    const groups = new Map<string, QuantityOfferGroup>();

    items.forEach((item, index) => {
      const quantityOffer = getQuantityOfferSummary(item);

      if (isEditing || !quantityOffer?.groupId) {
        singles.push({ item, index });
        return;
      }

      const existingGroup = groups.get(quantityOffer.groupId);
      const nextGroup =
        existingGroup ||
        {
          groupId: quantityOffer.groupId,
          offerLabel: quantityOffer.offerLabel,
          offerQuantity: quantityOffer.offerQuantity,
          freeShipping: quantityOffer.freeShipping,
          total: 0,
          selectedPieces: 0,
          items: [],
        };

      nextGroup.offerLabel = quantityOffer.offerLabel || nextGroup.offerLabel;
      nextGroup.offerQuantity = Math.max(
        nextGroup.offerQuantity,
        quantityOffer.offerQuantity,
      );
      nextGroup.freeShipping =
        nextGroup.freeShipping || quantityOffer.freeShipping;
      nextGroup.total += Number(item.price || 0) * Number(item.quantity || 0);
      nextGroup.selectedPieces += Math.max(0, Number(item.quantity || 0));
      nextGroup.items.push({
        item,
        index,
        slotIndex: quantityOffer.slotIndex,
      });

      if (!existingGroup) {
        groups.set(quantityOffer.groupId, nextGroup);
      }
    });

    return {
      singles,
      groups: Array.from(groups.values()).map((group) => ({
        ...group,
        total: Number(group.total.toFixed(2)),
        items: [...group.items].sort((left, right) => {
          const leftSlot = left.slotIndex ?? Number.MAX_SAFE_INTEGER;
          const rightSlot = right.slotIndex ?? Number.MAX_SAFE_INTEGER;
          return leftSlot === rightSlot ? left.index - right.index : leftSlot - rightSlot;
        }),
      })),
    };
  }, [isEditing, items]);

  const displayEntryCount = isEditing
    ? items.length
    : groupedQuantityOffers.groups.length + groupedQuantityOffers.singles.length;

  const renderVariantBadges = (
    item: OrderItem,
    itemMetadata: OrderItemMetadata,
  ) => {
    const variantValues = normalizeVariantBadges(item, itemMetadata);

    return variantValues.color || variantValues.size ? (
      <div className="flex items-center gap-2 flex-wrap">
        {variantValues.color && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm font-semibold border border-blue-200 dark:border-blue-800">
            🎨 {variantValues.color}
          </span>
        )}
        {variantValues.size && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-sm font-semibold border border-purple-200 dark:border-purple-800">
            📏 {variantValues.size}
          </span>
        )}
      </div>
    ) : null;
  };

  const renderSingleItem = (item: OrderItem, index: number) => {
    const itemMetadata = getOrderItemMetadata(item);
    const productImage = getProductImage(item);
    const stockInfo = getStockInfo(item);
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    const hasQuantityError = validationErrors[`quantity_${index}`];
    const hasPriceError = validationErrors[`price_${index}`];
    const quantityOfferSummary = getQuantityOfferSummary(item);

    return (
      <div
        key={`${item.id || item.productId || "item"}-${index}`}
        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              {productImage ? (
                <img
                  src={productImage}
                  alt={item.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {item.productName}
                </h4>

                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {typeof itemMetadata.sku === "string" && itemMetadata.sku.trim() && (
                    <span className="font-mono">
                      SKU: {itemMetadata.sku}
                    </span>
                  )}
                  {stockInfo.stock > 0 && (
                    <>
                      <span>•</span>
                      <span
                        className={`font-semibold ${
                          stockInfo.status === "available"
                            ? "text-green-600 dark:text-green-400"
                            : stockInfo.status === "low"
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {stockInfo.status === "available"
                          ? "🟢 متوفر"
                          : stockInfo.status === "low"
                            ? `🟡 متبقي ${stockInfo.stock}`
                            : "🔴 نفذ"}
                      </span>
                    </>
                  )}
                </div>

                {quantityOfferSummary ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                      عرض كميات
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {quantityOfferSummary.offerLabel}
                    </span>
                    {quantityOfferSummary.freeShipping ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                        شحن مجاني
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {renderVariantBadges(item, itemMetadata)}
              </div>

              {isEditing && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuIndex(openMenuIndex === index ? null : index)
                    }
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>

                  {openMenuIndex === index && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuIndex(null)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                        <button
                          onClick={() => handleDeleteClick(index, item)}
                          className="w-full px-4 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>حذف المنتج</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  💰 السعر
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="number"
                      value={item.price || 0}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold dark:bg-gray-700 dark:text-gray-100 ${
                        hasPriceError
                          ? "border-red-500 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      }`}
                    />
                    {hasPriceError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-3 h-3" />
                        {hasPriceError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(item.price || 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  📦 الكمية
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          decrementQuantity(index, item.quantity || 1)
                        }
                        disabled={item.quantity <= 1}
                        className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <MinusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          handleQuantityChange(
                            index,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        min="1"
                        max="9999"
                        className={`w-16 px-2 py-2 border rounded-lg text-center text-sm font-bold dark:bg-gray-700 dark:text-gray-100 ${
                          hasQuantityError
                            ? "border-red-500 dark:border-red-400"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      <button
                        onClick={() =>
                          incrementQuantity(index, item.quantity || 1)
                        }
                        className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <PlusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </button>
                    </div>
                    {hasQuantityError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-3 h-3" />
                        {hasQuantityError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {item.quantity || 1}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  💵 الإجمالي
                </label>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatPrice(itemTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t("orderDetails.products")}
            </h3>
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-full">
              {displayEntryCount}
            </span>
          </div>
          {!isEditing && groupedQuantityOffers.groups.length > 0 ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {groupedQuantityOffers.groups.length} عروض كميات مجمعة
            </span>
          ) : null}
          {isEditing && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>إضافة منتج</span>
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <PhotoIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              لا توجد منتجات في هذا الطلب
            </p>
          </div>
        ) : (
          <>
            {groupedQuantityOffers.groups.map((group) => (
              <div
                key={group.groupId}
                className="p-6 bg-amber-50/70 dark:bg-amber-950/10"
              >
                <div className="rounded-2xl border border-amber-200 bg-white/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-gray-900/40">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 text-right">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                          عرض كميات
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {group.offerLabel}
                        </span>
                        {group.freeShipping ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                            شحن مجاني
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">
                          {group.selectedPieces}/{group.offerQuantity || group.selectedPieces} قطع مختارة
                        </span>
                        <span>•</span>
                        <span>
                          إجمالي العرض:{" "}
                          <span className="font-bold text-amber-700 dark:text-amber-300">
                            {formatPrice(group.total)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-900/40 dark:bg-amber-900/20">
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        عدد القطع
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">
                        {group.offerQuantity || group.selectedPieces}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.items.map(({ item, index, slotIndex }, itemPosition) => {
                      const itemMetadata = getOrderItemMetadata(item);
                      const productImage = getProductImage(item);
                      const lineTotal =
                        Number(item.price || 0) * Number(item.quantity || 1);

                      return (
                        <div
                          key={`${group.groupId}-${item.id || item.productId || index}-${slotIndex || index}`}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
                        >
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                {productImage ? (
                                  <img
                                    src={productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <PhotoIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                      {item.productName}
                                    </h4>
                                    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                      القطعة {slotIndex || itemPosition + 1}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    {renderVariantBadges(item, itemMetadata)}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    الإجمالي
                                  </div>
                                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {formatPrice(lineTotal)}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    الكمية: {item.quantity || 1}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {groupedQuantityOffers.singles.map(({ item, index }) =>
              renderSingleItem(item, index),
            )}
          </>
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2 max-w-sm mr-auto">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                المجموع الفرعي:
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatPrice(totals.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600 dark:text-gray-400">الشحن:</span>
              {isEditing && onShippingChange ? (
                <input
                  type="number"
                  value={isNaN(totals.shipping) ? 0 : totals.shipping}
                  onChange={(e) =>
                    onShippingChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-24 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              ) : (
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatPrice(totals.shipping)}
                </span>
              )}
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600 dark:text-gray-400">الضريبة:</span>
              {isEditing && onTaxChange ? (
                <input
                  type="number"
                  value={isNaN(totals.tax) ? 0 : totals.tax}
                  onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              ) : (
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatPrice(totals.tax)}
                </span>
              )}
            </div>
            <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
              <div className="flex justify-between">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                  الإجمالي:
                </span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatPrice(totals.total)}
                </span>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>
                الإجمالي يتم حسابه تلقائياً بناءً على المنتجات والشحن والضرائب
              </span>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteItemConfirmModal
        isOpen={deleteModal.isOpen}
        itemName={deleteModal.itemName}
        itemDetails={deleteModal.itemDetails}
        onConfirm={handleConfirmDelete}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            index: -1,
            itemName: "",
            itemDetails: "",
          })
        }
      />
    </div>
  );
};

export default OrderItemsCard;
