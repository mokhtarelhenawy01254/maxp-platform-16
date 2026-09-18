import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface GovernoratePerformance {
  name: string;
  totalShipped: number;
  delivered: number;
  returned: number;
  inTransit: number;
  deliveryRate: number;
  returnRate: number;
  codCollected: number;
}

interface Props {
  governorates: GovernoratePerformance[];
  search: string;
}

export const DeliveryReturnsGovTable: React.FC<Props> = ({ governorates, search }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const filtered = governorates.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase().trim()),
  );

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
        <MapPin className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-medium">{t("deliveryReturnsReport.noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="py-3 px-4 font-semibold">{t("deliveryReturnsReport.governorateName")}</th>
              <th className="py-3 px-3 font-semibold">{t("deliveryReturnsReport.shipped")}</th>
              <th className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{t("deliveryReturnsReport.delivered")}</th>
              <th className="py-3 px-3 font-semibold text-amber-600 dark:text-amber-400">{t("deliveryReturnsReport.returned")}</th>
              <th className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">{t("deliveryReturnsReport.inTransit")}</th>
              <th className="py-3 px-3 font-semibold cursor-help" title={t("deliveryReturnsReport.closedRateTooltip")}>
                {t("deliveryReturnsReport.closedRate")}
              </th>
              <th className="py-3 px-3 font-semibold cursor-help" title={t("deliveryReturnsReport.returnRateTooltip")}>
                {t("deliveryReturnsReport.returnRate")}
              </th>
              <th className="py-3 px-4 font-semibold">{t("deliveryReturnsReport.codDeliveredRevenue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((gov) => {
              const isHighDelivery = gov.deliveryRate >= 70;
              const isMidDelivery = gov.deliveryRate >= 45 && gov.deliveryRate < 70;
              const closedCount = gov.delivered + gov.returned;

              return (
                <tr
                  key={gov.name}
                  className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>{gov.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                    {gov.totalShipped.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {gov.delivered.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    {gov.returned.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {gov.inTransit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold tabular-nums">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                        isHighDelivery
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                          : isMidDelivery
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40"
                      }`}
                      title={`${gov.delivered} مسلّم ÷ ${closedCount} محسوم`}
                    >
                      {gov.deliveryRate}%
                    </span>
                  </td>
                  <td
                    className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300 tabular-nums"
                    title={`${gov.returned} مرتجع ÷ ${gov.totalShipped} مشحون`}
                  >
                    {gov.returnRate}%
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                    {formatPrice(gov.codCollected)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-2.5 bg-slate-50/60 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
        {t("deliveryReturnsReport.tableMetricsLegend")}
      </div>
    </div>
  );
};
