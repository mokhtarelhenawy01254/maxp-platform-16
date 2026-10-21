import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import { formatCurrency } from "@/utils/currency";
import {
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { CustomerDetailsData } from "./types";

interface CustomerActivityTabProps {
  activities: CustomerDetailsData["activities"];
}

export const CustomerActivityTab: React.FC<CustomerActivityTabProps> = ({
  activities,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  if (!activities || activities.length === 0) {
    return (
      <p className="text-center text-xs sm:text-sm text-zinc-500 py-8">
        {t("customers.noActivity", "لا يوجد نشاط لهذا العميل")}
      </p>
    );
  }

  return (
    <div>
      <ol className="relative space-y-6 border-r-2 border-zinc-200 dark:border-zinc-800 pr-6 mr-3">
        {activities.map((act, index) => (
          <li key={act.id || index} className="relative">
            <span
              className={`absolute -right-[31px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-zinc-900 ${
                act.type === "order"
                  ? "bg-indigo-500"
                  : act.type === "conversation"
                    ? "bg-teal-500"
                    : "bg-amber-500"
              }`}
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {act.type === "order" ? (
                  <ShoppingBagIcon className="h-4 w-4 text-indigo-500" />
                ) : act.type === "conversation" ? (
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-teal-500" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  {act.title}
                </span>
                {act.status && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700">
                    {act.status}
                  </span>
                )}
                {typeof act.value === "number" && (
                  <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(act.value)}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400 font-mono tabular-nums">
                {formatDate(act.timestamp)}
              </span>
            </div>
            {act.content && (
              <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {act.content}
                {act.author ? ` — ${act.author}` : ""}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
