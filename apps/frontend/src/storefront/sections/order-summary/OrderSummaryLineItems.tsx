import React from "react";
import StorefrontProductImage from "../../components/StorefrontProductImage";
import QuantitySelector from "../../components/QuantitySelector";
import { formatStorefrontCurrency } from "../../utils/currency";
import { getCartItemImageCandidates } from "../../utils/productImages";
import { getCartItemPricing } from "../../utils/cartQuantityOffers";
import type { CartItem as StoreCartItem } from "../../store/useCartStore";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  attributes?: Record<string, string>;
  volumeDiscounts?: any;
  quantityOffer?: { groupId?: string };
  [key: string]: any;
}

export interface OrderSummaryLineItemsProps {
  showLineItems: boolean;
  lineItemsEditable: boolean;
  lineItemsTitle: string;
  items: CartItem[];
  currency: string;
  prefersArabicCopy: boolean;
  isFittingRoomSummary: boolean;
  isKhemetLuxe: boolean;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export const OrderSummaryLineItems: React.FC<OrderSummaryLineItemsProps> = ({
  showLineItems,
  lineItemsEditable,
  lineItemsTitle,
  items,
  currency,
  prefersArabicCopy,
  isFittingRoomSummary,
  isKhemetLuxe,
  onUpdateQuantity,
}) => {
  if (!showLineItems) return null;

  const showLineItemsHeading =
    !isFittingRoomSummary && Boolean(lineItemsTitle);

  const lineItemsCardClassName = isKhemetLuxe
    ? "space-y-4 bg-transparent p-0 shadow-none"
    : isFittingRoomSummary
      ? "space-y-3"
      : "space-y-3 rounded-[1.2rem] border border-border bg-white/95 p-4";

  const lineItemRowClassName = isKhemetLuxe
    ? "flex items-start gap-3 bg-transparent py-2"
    : isFittingRoomSummary
      ? "flex items-center gap-3 rounded-[1.25rem] bg-white p-1.5"
      : "flex items-start gap-3 rounded-[1rem] border border-border/70 bg-background p-3";

  const lineItemMetaClassName = isKhemetLuxe
    ? "text-[11px] leading-5 text-[#7b6d58]"
    : isFittingRoomSummary
      ? "text-[11px] leading-5 text-[#a39a92]"
      : "text-[11px] leading-5 text-muted-foreground";

  return (
    <div className={lineItemsCardClassName}>
      {showLineItemsHeading ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground">
            {lineItemsTitle}
          </h3>
          <span className={lineItemMetaClassName}>
            {prefersArabicCopy
              ? `${items.length} قطعة`
              : `${items.length} items`}
          </span>
        </div>
      ) : null}
      <div className="space-y-3">
        {items.map((item) => {
          const pricing = getCartItemPricing(
            item as unknown as StoreCartItem,
            items as unknown as StoreCartItem[],
          );
          const attributeSummary = Object.entries(item.attributes || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(" • ");
          const canEditQuantity =
            lineItemsEditable && !item.quantityOffer?.groupId;

          return (
            <div
              key={item.id}
              className={`${lineItemRowClassName} ${
                isFittingRoomSummary
                  ? "justify-between"
                  : isKhemetLuxe
                    ? "flex flex-col gap-3 sm:flex-row sm:items-center"
                    : "flex items-start gap-3"
              }`}
              dir={isKhemetLuxe ? "ltr" : undefined}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={`relative shrink-0 overflow-hidden border border-[#eadfcf] ${
                    isFittingRoomSummary
                      ? "h-16 w-16 rounded-[1rem] bg-[#f6f3ef] p-1"
                      : isKhemetLuxe
                        ? "h-[4.5rem] w-[4.5rem] rounded-[0.9rem] bg-[#fbf5ed] p-1"
                        : "h-16 w-16 rounded-[0.85rem] bg-white"
                  }`}
                >
                  <StorefrontProductImage
                    candidates={getCartItemImageCandidates(item)}
                    alt={item.name}
                    width="64"
                    height="64"
                    requestedWidth={isKhemetLuxe ? 120 : 72}
                    className={`h-full w-full ${
                      isFittingRoomSummary || isKhemetLuxe
                        ? "object-contain"
                        : "object-cover"
                    }`}
                  />
                  {isFittingRoomSummary ? null : (
                    <span className="absolute -end-2 -top-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-[#d9c8ad] bg-[#2c241b] px-1.5 text-[10px] font-black text-white tabular-nums">
                      {item.quantity}
                    </span>
                  )}
                </div>
                <div
                  className={`min-w-0 flex-1 ${
                    isFittingRoomSummary ? "space-y-1" : "space-y-2"
                  }`}
                >
                  <div
                    className={`gap-3 ${
                      isFittingRoomSummary
                        ? "flex items-start justify-between"
                        : isKhemetLuxe
                          ? "flex flex-col items-start sm:flex-row sm:items-start sm:justify-between"
                          : "flex items-start justify-between"
                    }`}
                  >
                    <div
                      className={`min-w-0 space-y-1 ${
                        isKhemetLuxe || isFittingRoomSummary ? "text-left" : ""
                      }`}
                    >
                      <p
                        className={`line-clamp-2 font-semibold text-foreground ${
                          isFittingRoomSummary
                            ? "text-[0.82rem] leading-5"
                            : isKhemetLuxe
                              ? "text-[0.95rem] leading-6"
                              : "text-sm"
                        }`}
                      >
                        {item.name}
                      </p>
                      {attributeSummary ? (
                        <p className={lineItemMetaClassName}>
                          {attributeSummary}
                        </p>
                      ) : null}
                    </div>
                    {isKhemetLuxe ? (
                      <span className="shrink-0 whitespace-nowrap text-[0.98rem] font-bold text-foreground sm:hidden tabular-nums">
                        {formatStorefrontCurrency(
                          pricing.lineSubtotal,
                          currency,
                        )}
                      </span>
                    ) : null}
                  </div>
                  {canEditQuantity ? (
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(value) => onUpdateQuantity(item.id, value)}
                      size={
                        isKhemetLuxe || isFittingRoomSummary
                          ? "compact"
                          : "default"
                      }
                      className={
                        isFittingRoomSummary
                          ? "border-none bg-transparent shadow-none"
                          : isKhemetLuxe
                            ? "border-[#e2d4c0] bg-[#fffdf8]"
                            : undefined
                      }
                      buttonClassName={
                        isFittingRoomSummary
                          ? "text-[#77706a] hover:text-[#242220]"
                          : isKhemetLuxe
                            ? "text-[#725523]"
                            : undefined
                      }
                      valueClassName={
                        isFittingRoomSummary
                          ? "border-none bg-transparent text-[#242220]"
                          : isKhemetLuxe
                            ? "border-[#e2d4c0] bg-[#fffdf8] text-[#2c241b]"
                            : undefined
                      }
                    />
                  ) : (
                    <p className={lineItemMetaClassName}>
                      {prefersArabicCopy
                        ? `الكمية: ${item.quantity}`
                        : `Qty: ${item.quantity}`}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap font-bold text-foreground tabular-nums ${
                  isFittingRoomSummary
                    ? "text-[0.82rem]"
                    : isKhemetLuxe
                      ? "hidden text-[0.98rem] sm:block"
                      : "text-sm"
                }`}
              >
                {formatStorefrontCurrency(pricing.lineSubtotal, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderSummaryLineItems;
