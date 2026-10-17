import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ShoppingBag, AlertTriangle, Minus, Plus } from "lucide-react";
import OrderModal from "../../../components/common/OrderModal";
import { useCurrency } from "../../../hooks/useCurrency";

interface PartialDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveredItems: any[], returnedItems: any[]) => Promise<void>;
  order: any;
  loading?: boolean;
}

const PartialDeliveryModal: React.FC<PartialDeliveryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  order,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [deliveredQuantities, setDeliveredQuantities] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    if (isOpen && order?.items) {
      const initialQuantities: Record<number, number> = {};
      order.items.forEach((item: any, index: number) => {
        initialQuantities[index] = item.quantity || 1;
      });
      setDeliveredQuantities(initialQuantities);
    }
  }, [isOpen, order]);

  const handleQuantityChange = (
    index: number,
    value: number,
    maxQuantity: number,
  ) => {
    let newQty = value;
    if (newQty < 0) newQty = 0;
    if (newQty > maxQuantity) newQty = maxQuantity;
    setDeliveredQuantities((prev) => ({ ...prev, [index]: newQty }));
  };

  const hasAnyReturn = order?.items?.some((_: any, index: number) => {
    const maxQty = order.items[index].quantity || 1;
    const deliveredQty = deliveredQuantities[index] ?? maxQty;
    return deliveredQty < maxQty;
  });

  const totalDeliveredItems = order?.items?.reduce(
    (sum: number, _: any, index: number) => {
      return sum + (deliveredQuantities[index] || 0);
    },
    0,
  );

  const handleConfirm = async () => {
    if (!order?.items) return;

    const deliveredItems: any[] = [];
    const returnedItems: any[] = [];

    order.items.forEach((item: any, index: number) => {
      const deliveredQty = deliveredQuantities[index] || 0;
      const totalQty = item.quantity || 1;
      const returnedQty = totalQty - deliveredQty;

      if (deliveredQty > 0) {
        deliveredItems.push({
          ...item,
          quantity: deliveredQty,
          total: (parseFloat(item.price) || 0) * deliveredQty,
        });
      }

      if (returnedQty > 0) {
        returnedItems.push({
          ...item,
          quantity: returnedQty,
          total: (parseFloat(item.price) || 0) * returnedQty,
        });
      }
    });

    await onConfirm(deliveredItems, returnedItems);
  };

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("orders.partialDeliveryTitle")}
      description={t("orders.partialDeliveryDescription")}
      icon={CheckCircle2}
      tone="primary"
      size="xl"
      busy={loading}
      primaryAction={{
        label: loading
          ? t("orders.partialDeliveryProcessing")
          : t("orders.partialDeliveryAction"),
        onClick: handleConfirm,
        disabled: loading || totalDeliveredItems === 0,
        loading,
      }}
    >
      <div className="space-y-2">
        {order?.items?.map((item: any, index: number) => {
          const maxQty = item.quantity || 1;
          const deliveredQty = deliveredQuantities[index] ?? maxQty;
          const returnedQty = maxQty - deliveredQty;
          const itemName =
            item.name ||
            item.productName ||
            item.product?.name ||
            t("orders.productNotSpecified");
          const itemImage =
            item.image ||
            item.product?.image ||
            item.metadata?.image ||
            null;

          return (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:p-3"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-card">
                {itemImage ? (
                  <img
                    src={itemImage}
                    alt={itemName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs sm:text-sm font-semibold text-foreground">
                  {itemName}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground font-mono tabular-nums">
                  {formatPrice(
                    parseFloat(item.price) || 0,
                    order?.currency || "EGP",
                  )}{" "}
                  × {maxQty} {t("orders.partialDeliveryPieces")}
                </p>
                {(item.productColor || item.productSize) && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.productColor && (
                      <span>
                        {t("orders.partialDeliveryColor")}: {item.productColor}
                      </span>
                    )}
                    {item.productColor && item.productSize && (
                      <span className="mx-1">·</span>
                    )}
                    {item.productSize && (
                      <span>
                        {t("orders.partialDeliverySize")}: {item.productSize}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-center gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("orders.partialDeliveryDelivered")}
                </label>
                <div className="flex items-center overflow-hidden rounded-md border border-border/70 bg-background">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(index, deliveredQty - 1, maxQty)
                    }
                    className="flex h-7 w-7 items-center justify-center bg-muted/40 text-foreground transition hover:bg-muted active:scale-[0.97]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={maxQty}
                    value={deliveredQty}
                    onChange={(e) =>
                      handleQuantityChange(
                        index,
                        parseInt(e.target.value) || 0,
                        maxQty,
                      )
                    }
                    className="w-10 border-x border-border/70 bg-transparent px-1 py-1 text-center text-xs font-bold font-mono tabular-nums text-foreground focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(index, deliveredQty + 1, maxQty)
                    }
                    className="flex h-7 w-7 items-center justify-center bg-muted/40 text-foreground transition hover:bg-muted active:scale-[0.97]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {returnedQty > 0 ? (
                  <span className="text-[11px] font-medium font-mono tabular-nums text-destructive">
                    {t("orders.partialDeliveryReturned", { count: returnedQty })}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {t("orders.partialDeliveryComplete")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasAnyReturn && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {t("orders.partialDeliveryWarning")}
          </p>
        </div>
      )}
    </OrderModal>
  );
};

export default PartialDeliveryModal;
