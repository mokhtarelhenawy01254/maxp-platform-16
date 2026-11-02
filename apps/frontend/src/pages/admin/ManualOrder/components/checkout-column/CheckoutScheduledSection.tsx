import React from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { DateInput } from '../../../../../components/ui/DateInput';

interface CheckoutScheduledSectionProps {
  isScheduledOrder: boolean;
  setIsScheduledOrder: (val: boolean) => void;
  scheduledDeliveryDate: string;
  setScheduledDeliveryDate: (val: string) => void;
  scheduledDeliveryTime: string;
  setScheduledDeliveryTime: (val: string) => void;
  scheduledNotes: string;
  setScheduledNotes: (val: string) => void;
  t: (key: string) => string;
}

export const CheckoutScheduledSection: React.FC<CheckoutScheduledSectionProps> = ({
  isScheduledOrder,
  setIsScheduledOrder,
  scheduledDeliveryDate,
  setScheduledDeliveryDate,
  scheduledDeliveryTime,
  setScheduledDeliveryTime,
  scheduledNotes,
  setScheduledNotes,
  t,
}) => {
  return (
    <div className="space-y-3">
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isScheduledOrder}
            onChange={(e) => setIsScheduledOrder(e.target.checked)}
            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <CalendarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t("manualOrder.k_113")}
          </span>
        </label>

        {isScheduledOrder && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("manualOrder.k_114")} <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={scheduledDeliveryDate}
                  onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                  min={
                    new Date(Date.now() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("manualOrder.k_115")}
                </label>
                <input
                  type="time"
                  value={scheduledDeliveryTime}
                  onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("manualOrder.k_116")}
              </label>
              <textarea
                value={scheduledNotes}
                onChange={(e) => setScheduledNotes(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={2}
                placeholder={t("manualOrder.k_11")}
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
              <CalendarIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{t("manualOrder.k_117")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
