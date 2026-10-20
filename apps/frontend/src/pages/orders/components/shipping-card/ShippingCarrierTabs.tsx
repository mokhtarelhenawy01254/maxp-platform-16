import React from "react";
import { TruckIcon, BoltIcon, UserIcon } from "@heroicons/react/24/outline";
import { ShippingCompany, CourierMode } from "./shippingCardTypes";

export interface ShippingCarrierTabsProps {
  courierMode: CourierMode;
  setCourierMode: (mode: CourierMode) => void;
  setIsManualCourier: (isManual: boolean) => void;
  turboCompany?: ShippingCompany;
  qpCompany?: ShippingCompany;
  bostaCompany?: ShippingCompany;
  customCompanies: ShippingCompany[];
}

export const ShippingCarrierTabs: React.FC<ShippingCarrierTabsProps> = React.memo(
  ({
    courierMode,
    setCourierMode,
    setIsManualCourier,
    turboCompany,
    qpCompany,
    bostaCompany,
    customCompanies,
  }) => {
    return (
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-medium">
        {turboCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("turbo");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "turbo"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5 text-blue-500" />
            <span>تربو (Turbo)</span>
          </button>
        )}

        {qpCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("qp");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "qp"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BoltIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>كيو بي (QP Express)</span>
          </button>
        )}

        {bostaCompany && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("bosta");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "bosta"
                ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>بوستا (Bosta)</span>
          </button>
        )}

        {customCompanies.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCourierMode("custom");
              setIsManualCourier(false);
            }}
            className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
              courierMode === "custom"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TruckIcon className="h-3.5 w-3.5" />
            <span>الشركات المفعلة الأخرى</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setCourierMode("manual");
            setIsManualCourier(true);
          }}
          className={`py-2 px-3.5 rounded-md transition flex items-center justify-center gap-1.5 active:scale-97 ${
            courierMode === "manual"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          <span>شحن يدوي / خاص</span>
        </button>
      </div>
    );
  }
);

ShippingCarrierTabs.displayName = "ShippingCarrierTabs";
