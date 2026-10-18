import React from "react";
import { useTranslation } from "react-i18next";
import { TruckIcon } from "@heroicons/react/24/outline";

export interface StatusFilterOption {
  key: string;
  label: string;
  color: string;
}

interface TurboRecordsStatusPillsProps {
  filterOptions: StatusFilterOption[];
  filterType: string;
  getStatusCount: (key: string) => number;
  onFilterChange: (key: string) => void;
}

export const TurboRecordsStatusPills: React.FC<
  TurboRecordsStatusPillsProps
> = ({ filterOptions, filterType, getStatusCount, onFilterChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TruckIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          {t("orders.k_51")}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filterOptions
            .filter((o) => !["all", "active", "preparing"].includes(o.key))
            .map((item) => (
              <button
                key={item.key}
                onClick={() => onFilterChange(item.key)}
                className={`rounded-xl border-2 ${
                  item.color
                } p-2.5 text-center transition-all cursor-pointer hover:shadow-md ${
                  filterType === item.key
                    ? "ring-2 ring-blue-500 scale-105 font-bold shadow-sm"
                    : "opacity-85 hover:opacity-100"
                }`}
              >
                <div className="text-lg font-extrabold font-mono tabular-nums">
                  {getStatusCount(item.key)}
                </div>
                <div className="text-[11px] font-medium truncate">
                  {item.label}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TurboRecordsStatusPills;
