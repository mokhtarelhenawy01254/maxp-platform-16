import React from "react";
import { TruckIcon } from "@heroicons/react/24/outline";
import { ShippingCompany } from "./shippingCardTypes";

export interface CustomCourierShipmentCardProps {
  customCompanies: ShippingCompany[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  loading: boolean;
  onCreateShipment: () => void;
}

export const CustomCourierShipmentCard: React.FC<CustomCourierShipmentCardProps> = React.memo(
  ({
    customCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    loading,
    onCreateShipment,
  }) => {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            اختر شركة الشحن
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {customCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.integrationMode ? `(${c.integrationMode})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onCreateShipment}
            disabled={loading || !selectedCompanyId}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
          >
            <TruckIcon className="h-4 w-4" />
            <span>
              {loading ? "جاري إنشاء الشحنة..." : "إنشاء الشحنة وتسليم للشركة"}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

CustomCourierShipmentCard.displayName = "CustomCourierShipmentCard";
