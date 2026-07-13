import React from "react";
import {
  QuantityOffer,
  createEmptyQuantityOffer,
  getDefaultQuantityOfferBuyText,
  getQuantityOfferTotals,
  normalizeQuantityOffers,
} from "../../../../utils/quantityOffers";

interface QuantityOffersTabProps {
  quantityOffers: QuantityOffer[];
  setQuantityOffers: React.Dispatch<React.SetStateAction<QuantityOffer[]>>;
  baseUnitPrice: number;
  currentUnitPrice: number;
  displayCurrency: string;
  hasVariants: boolean;
  productName: string;
}

const getReferenceUnitPrice = (baseUnitPrice: number, currentUnitPrice: number) =>
  Math.max(0, Number(baseUnitPrice || currentUnitPrice || 0));

export const QuantityOffersTab: React.FC<QuantityOffersTabProps> = ({
  quantityOffers,
  setQuantityOffers,
  baseUnitPrice,
  currentUnitPrice,
  displayCurrency,
  hasVariants,
  productName,
}) => {
  const referenceUnitPrice = getReferenceUnitPrice(baseUnitPrice, currentUnitPrice);

  const commitOffers = React.useCallback(
    (offers: QuantityOffer[]) => {
      setQuantityOffers(normalizeQuantityOffers(offers));
    },
    [setQuantityOffers],
  );

  const updateOffer = React.useCallback(
    (offerId: string, updater: (offer: QuantityOffer) => QuantityOffer) => {
      commitOffers(
        quantityOffers.map((offer) =>
          offer.id === offerId ? updater(offer) : offer,
        ),
      );
    },
    [commitOffers, quantityOffers],
  );

  const addOffer = () => {
    const lastQuantity = quantityOffers.reduce(
      (maxQuantity, offer) => Math.max(maxQuantity, offer.quantity),
      1,
    );

    commitOffers([
      ...quantityOffers,
      createEmptyQuantityOffer(lastQuantity + 1, currentUnitPrice),
    ]);
  };

  const removeOffer = (offerId: string) => {
    commitOffers(quantityOffers.filter((offer) => offer.id !== offerId));
  };

  const markAsDefault = (offerId: string) => {
    commitOffers(
      quantityOffers.map((offer) => ({
        ...offer,
        isDefault: offer.id === offerId,
      })),
    );
  };

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-700 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            عروض الكميات
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            أنشئ عروض 2 أو 3 أو 4 قطع لنفس المنتج، مع سعر مخفض لكل قطعة.
            سيظهر العرض على صفحة المنتج، ويمكن للعميل اختيار اللون أو المقاس لكل قطعة من نفس البلوك.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold dark:bg-gray-700 dark:text-gray-200">
              المنتج: {productName || "منتج جديد"}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
              السعر المرجعي: {referenceUnitPrice} {displayCurrency}
            </span>
            {hasVariants ? (
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                يدعم اختيار متغيرات لكل قطعة
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                المنتج بدون variants وسيضاف العرض بضغطة واحدة
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={addOffer}
          className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          إضافة عرض جديد
        </button>
      </div>

      {quantityOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/20">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            لا توجد عروض كميات لهذا المنتج حتى الآن
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            ابدأ بعرض 2 قطعة أو 3 قطع، وسيظهر للعميل كبطاقة شراء مباشرة مثل الصور التي اتفقنا عليها.
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        {quantityOffers.map((offer, index) => {
          const totals = getQuantityOfferTotals(offer, referenceUnitPrice);
          const previewText =
            offer.buyText ||
            getDefaultQuantityOfferBuyText(
              offer,
              referenceUnitPrice,
              displayCurrency,
            );

          return (
            <div
              key={offer.id}
              className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-700 dark:bg-gray-900/20"
            >
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                      عرض {index + 1}
                    </span>
                    {offer.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                        العرض الافتراضي
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        offer.isActive !== false
                          ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {offer.isActive !== false ? "نشط" : "متوقف"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {previewText}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    الإجمالي {totals.offerTotal} {displayCurrency} • التوفير{" "}
                    {totals.savings} {displayCurrency}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAsDefault(offer.id)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                      offer.isDefault
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                    }`}
                  >
                    جعله افتراضي
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffer(offer.id)}
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    إزالة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    عدد القطع
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={offer.quantity}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        quantity: Math.max(1, Number(event.target.value || 1)),
                        sortOrder: Math.max(1, Number(event.target.value || 1)),
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    سعر القطعة داخل العرض
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={offer.unitPrice}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        unitPrice: Math.max(0, Number(event.target.value || 0)),
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    نص الشراء
                  </span>
                  <input
                    type="text"
                    value={offer.buyText}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        buyText: event.target.value,
                      }))
                    }
                    placeholder={previewText}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    نص مساعد
                  </span>
                  <input
                    type="text"
                    value={offer.helperText || ""}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        helperText: event.target.value,
                      }))
                    }
                    placeholder="مثل: الأكثر توفيرًا"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>

                <label className="space-y-1 md:col-span-2 xl:col-span-1">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    وصف مساعد
                  </span>
                  <input
                    type="text"
                    value={offer.helperDescription || ""}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        helperDescription: event.target.value,
                      }))
                    }
                    placeholder="مثل: اختر لون ومقاس كل قطعة مرة واحدة"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={Boolean(offer.hideUnitPrice)}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        hideUnitPrice: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  إخفاء سعر القطعة في storefront
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={Boolean(offer.enableFreeShipping)}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        enableFreeShipping: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  إظهار ميزة الشحن المجاني داخل العرض
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={offer.isActive !== false}
                    onChange={(event) =>
                      updateOffer(offer.id, (current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  تفعيل العرض في صفحة المنتج
                </label>

                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {hasVariants
                    ? "سيظهر داخل العرض اختيار لون/مقاس لكل قطعة، مع زر لنسخ اختيار القطعة الأولى على باقي القطع."
                    : "لأن المنتج بدون variants، سيضيف العرض العدد الكامل مباشرة إلى السلة بسعر العرض."}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuantityOffersTab;
