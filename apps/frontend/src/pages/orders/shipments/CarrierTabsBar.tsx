import React from "react";
import { TruckIcon } from "@heroicons/react/24/outline";

export interface ShippingCompanyRef {
  id: string;
  name: string;
  slug?: string;
  providerKey?: string;
  integrationMode?: string;
  phone?: string;
  website?: string;
}

interface CarrierTabsBarProps {
  companies: ShippingCompanyRef[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  totalShipmentsCount?: number;
}

export const CarrierTabsBar: React.FC<CarrierTabsBarProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  totalShipmentsCount = 0,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar border-b border-border/70">
      {/* All Companies Tab */}
      <button
        type="button"
        onClick={() => onSelectCompany("ALL")}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
          selectedCompanyId === "ALL"
            ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
        }`}
      >
        <TruckIcon className="h-3.5 w-3.5" />
        <span>جميع شركات الشحن</span>
        {totalShipmentsCount > 0 && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
              selectedCompanyId === "ALL"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {totalShipmentsCount}
          </span>
        )}
      </button>

      {/* Dynamic Companies Tabs */}
      {companies.map((c) => {
        const isSelected = selectedCompanyId === c.id;
        const isLive = c.integrationMode === "LIVE" || c.providerKey === "TURBO" || c.providerKey === "BOSTA";
        const providerName = c.providerKey || "MANUAL";

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCompany(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <span>{c.name}</span>

            {/* Integration mode pill */}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                isSelected
                  ? "bg-white/20 text-white"
                  : isLive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {isLive ? "ربط مباشر" : "شحن يدوي"}
            </span>
          </button>
        );
      })}
    </div>
  );
};
