import React from "react";
import { useTranslation } from "react-i18next";
import { Package, AlertCircle } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface TopReturnedProduct {
  productId: string | null;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  shippedQuantity: number;
  returnedQuantity: number;
  returnRate: number;
  lostRevenue: number;
}

interface Props {
  products: TopReturnedProduct[];
  search: string;
}

export const DeliveryReturnsProductsTable: React.FC<Props> = ({ products, search }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const filtered = products.filter(
    (p) =>
      p.productName.toLowerCase().includes(search.toLowerCase().trim()) ||
      (p.productSku || "").toLowerCase().includes(search.toLowerCase().trim()),
  );

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        <Package className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-medium">{t("deliveryReturnsReport.noData")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs">
        <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400">
          <tr>
            <th className="py-3 px-4 font-semibold">{t("deliveryReturnsReport.product")}</th>
            <th className="py-3 px-3 font-semibold">{t("deliveryReturnsReport.shipped")} (قطع)</th>
            <th className="py-3 px-3 font-semibold text-amber-600 dark:text-amber-400">{t("deliveryReturnsReport.returned")} (قطع)</th>
            <th className="py-3 px-3 font-semibold">{t("deliveryReturnsReport.returnRate")}</th>
            <th className="py-3 px-4 font-semibold">{t("deliveryReturnsReport.revenue")} المفقود</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((item) => (
            <tr
              key={item.productId || item.productName}
              className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5 max-w-[280px]">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-8 w-8 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.productName}
                    </p>
                    {item.productSku && (
                      <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {item.productSku}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 font-mono font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                {item.shippedQuantity.toLocaleString()}
              </td>
              <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                {item.returnedQuantity.toLocaleString()}
              </td>
              <td className="py-3 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {item.returnRate}%
              </td>
              <td className="py-3 px-4 font-mono font-medium text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                {formatPrice(item.lostRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
