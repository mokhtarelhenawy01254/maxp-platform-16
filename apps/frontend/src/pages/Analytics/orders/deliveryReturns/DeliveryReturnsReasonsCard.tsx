import React from "react";
import { useTranslation } from "react-i18next";
import { PackageCheck, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface ReturnReasonStat {
  reason: string;
  count: number;
  percentage: number;
  lostValue: number;
}

export interface RestockStatus {
  restockedCount: number;
  pendingWithCarrierCount: number;
  restockedValue: number;
  pendingCarrierValue: number;
  stockRecoveryRate: number;
}

interface Props {
  reasons: ReturnReasonStat[];
  restock: RestockStatus;
}

export const DeliveryReturnsReasonsCard: React.FC<Props> = ({ reasons, restock }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Restock & Warehouse Recovery Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PackageCheck className="h-4 w-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("deliveryReturnsReport.stockRecoveryRate")}
            </h4>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            موقف استرداد القطع المرتجعة إلى المخزن الفعلي
          </p>

          <div className="space-y-3">
            {/* Restocked to warehouse */}
            <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("deliveryReturnsReport.restockedToWarehouse")}
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {restock.restockedCount.toLocaleString()} طلب
                </span>
              </div>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono tabular-nums">
                القيمة المستردة: {formatPrice(restock.restockedValue)}
              </p>
            </div>

            {/* Pending with carrier */}
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t("deliveryReturnsReport.pendingWithCarrier")}
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {restock.pendingWithCarrierCount.toLocaleString()} طلب
                </span>
              </div>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono tabular-nums">
                قيمة بضاعة معلقة: {formatPrice(restock.pendingCarrierValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">نسبة الاسترداد للمخزن:</span>
          <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums">
            {restock.stockRecoveryRate}%
          </span>
        </div>
      </div>

      {/* Return Reasons Breakdown */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("deliveryReturnsReport.reasonsTab")}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              أسباب عدم استلام الشحنات المرتجعة من واقع المناديب وخدمة العملاء
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 tabular-nums">
            {reasons.length} أسباب مسجلة
          </span>
        </div>

        {reasons.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-xs">
            لا توجد أسباب مرتجعات مسجلة في هذه الفترة
          </div>
        ) : (
          <div className="space-y-2.5">
            {reasons.slice(0, 7).map((item) => (
              <div key={item.reason} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[260px]" title={item.reason}>
                    {item.reason}
                  </span>
                  <div className="flex items-center gap-3 font-mono text-gray-500 dark:text-gray-400 tabular-nums">
                    <span>{item.count} حالة ({item.percentage}%)</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatPrice(item.lostValue)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
