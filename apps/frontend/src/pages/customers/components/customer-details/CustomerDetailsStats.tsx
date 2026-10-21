import React from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  StarIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency } from "@/utils/currency";
import { CustomerDetailsData } from "./types";

interface CustomerDetailsStatsProps {
  customer: CustomerDetailsData["customer"];
  stats: CustomerDetailsData["stats"];
  loyaltyPoints: number;
  cashbackAmount: number;
  walletBalance: number;
}

export const CustomerDetailsStats: React.FC<CustomerDetailsStatsProps> = ({
  customer,
  stats,
  loyaltyPoints,
  cashbackAmount,
  walletBalance,
}) => {
  const { t } = useTranslation();

  const deliveryRate =
    Math.round((customer.deliveryRate ?? stats.deliveryRate ?? 0) * 10) / 10;
  const deliveredCount = customer.totalDelivered ?? stats.totalDelivered ?? 0;
  const totalOrders =
    customer.totalOrdersCount ?? stats.totalOrdersCount ?? stats.ordersCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Delivery Reliability Card */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                نسبة الاستلام
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono">
                  {deliveryRate}%
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                  ({deliveredCount} من {totalOrders})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders count */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShoppingBagIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {t("sidebar.orders")}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono mt-0.5">
              {stats.ordersCount}
            </p>
          </div>
        </div>
      </div>

      {/* Conversations count */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {t("sidebar.conversations")}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono mt-0.5">
              {stats.conversationsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Total spent */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <CurrencyDollarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {t("customers.totalSpent")}
            </p>
            <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono mt-0.5">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* Average order */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ChartBarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {t("customers.averageOrder")}
            </p>
            <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono mt-0.5">
              {formatCurrency(stats.averageOrderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Loyalty points */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <StarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              نقاط الولاء
            </p>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono mt-0.5">
              {loyaltyPoints}
            </p>
          </div>
        </div>
      </div>

      {/* Cashback & wallet */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800 sm:col-span-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BanknotesIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              الكاش باك المحقق
            </p>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tabular-nums font-mono">
                {formatCurrency(cashbackAmount)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                رصيد المحفظة: {formatCurrency(walletBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
