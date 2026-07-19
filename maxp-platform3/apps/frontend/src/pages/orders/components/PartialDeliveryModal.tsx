import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ShoppingBagIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative inline-flex flex-col align-middle bg-white dark:bg-gray-800 rounded-2xl p-6 text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-xl sm:w-full border border-gray-100 dark:border-gray-700"
          style={{ maxHeight: "90vh" }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex-shrink-0">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <CheckCircleIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                تسليم جزئي للطلب
              </h3>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                حدد الكمية المسلمة لكل منتج. المتبقي سيُحوّل إلى مرتجع ويُنشأ
                له طلب جديد تلقائياً.
              </p>
            </div>
          </div>

          {/* Items list */}
          <div className="mt-5 flex-1 overflow-y-auto space-y-3 pl-1 pr-1">
            {order?.items?.map((item: any, index: number) => {
              const maxQty = item.quantity || 1;
              const deliveredQty = deliveredQuantities[index] ?? maxQty;
              const returnedQty = maxQty - deliveredQty;
              const itemName =
                item.name ||
                item.productName ||
                item.product?.name ||
                "منتج غير محدد";
              const itemImage =
                item.image ||
                item.product?.image ||
                item.metadata?.image ||
                null;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  {/* Image */}
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={itemName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBagIcon className="h-7 w-7 text-gray-400" />
                    )}
                  </div>

                  {/* Name & meta */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {itemName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatPrice(
                        parseFloat(item.price) || 0,
                        order?.currency || "EGP",
                      )}{" "}
                      × {maxQty} قطعة
                    </p>
                    {(item.productColor || item.productSize) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {item.productColor && (
                          <span>اللون: {item.productColor}</span>
                        )}
                        {item.productColor && item.productSize && (
                          <span className="mx-1">·</span>
                        )}
                        {item.productSize && (
                          <span>المقاس: {item.productSize}</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Quantity control */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      مسلّم
                    </label>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            index,
                            deliveredQty - 1,
                            maxQty,
                          )
                        }
                        className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold text-base leading-none transition-colors"
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
                        className="w-12 px-1 py-1.5 text-center text-sm font-medium border-x border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            index,
                            deliveredQty + 1,
                            maxQty,
                          )
                        }
                        className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold text-base leading-none transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {returnedQty > 0 && (
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">
                        مرتجع: {returnedQty}
                      </span>
                    )}
                    {returnedQty === 0 && (
                      <span className="text-xs font-medium text-green-500 dark:text-green-400">
                        ✓ مكتمل
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning when there are returns */}
          {hasAnyReturn && (
            <div className="mt-4 flex-shrink-0 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                سيتم إنشاء طلب جديد تلقائياً بالمنتجات المرتجعة ومشاركته مع
                فريق العمل.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex-shrink-0 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="inline-flex justify-center items-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={loading || totalDeliveredItems === 0}
            >
              <CheckCircleIcon className="h-4 w-4" />
              {loading ? "جاري التنفيذ..." : "تأكيد التسليم الجزئي"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartialDeliveryModal;
