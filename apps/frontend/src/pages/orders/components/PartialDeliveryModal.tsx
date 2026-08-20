import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, ShoppingBagIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
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
      icon={CheckCircleIcon}
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
      <div className="space-y-2.5">
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
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                {itemImage ? (
                  <img
                    src={itemImage}
                    alt={itemName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBagIcon className="h-7 w-7 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-foreground">
                  {itemName}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatPrice(
                    parseFloat(item.price) || 0,
                    order?.currency || "EGP",
                  )}{" "}
                  × {maxQty} {t("orders.partialDeliveryPieces")}
                </p>
                {(item.productColor || item.productSize) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
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

              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("orders.partialDeliveryDelivered")}
                </label>
                <div className="flex items-center overflow-hidden rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(index, deliveredQty - 1, maxQty)
                    }
                    className="bg-muted px-2.5 py-1.5 text-base font-bold leading-none text-foreground transition hover:bg-muted/70"
                  >
                    −
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
                    className="w-12 border-x border-border bg-card px-1 py-1.5 text-center text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(index, deliveredQty + 1, maxQty)
                    }
                    className="bg-muted px-2.5 py-1.5 text-base font-bold leading-none text-foreground transition hover:bg-muted/70"
                  >
                    +
                  </button>
                </div>
                {returnedQty > 0 ? (
                  <span className="text-xs font-medium text-destructive">
                    {t("orders.partialDeliveryReturned", { count: returnedQty })}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-success">
                    {t("orders.partialDeliveryComplete")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasAnyReturn && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-foreground/80">
            {t("orders.partialDeliveryWarning")}
          </p>
        </div>
      )}
    </OrderModal>
  );
};

export default PartialDeliveryModal;
