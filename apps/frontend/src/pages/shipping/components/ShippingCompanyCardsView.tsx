import React from "react";
import {
  TruckIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import type { ShippingCompany } from "../types";

export interface ShippingCompanyCardsViewProps {
  displayedCompanies: ShippingCompany[];
  togglingId: string | null;
  testingConnection: boolean;
  handleToggleActive: (company: ShippingCompany, e: React.MouseEvent) => Promise<void>;
  handleOpenSettings: (company: ShippingCompany, autoActivate?: boolean) => void;
  handleTestConnection: (companyId: string) => Promise<void>;
  handleDelete: (company: ShippingCompany, e: React.MouseEvent) => Promise<void>;
}

export const ShippingCompanyCardsView: React.FC<ShippingCompanyCardsViewProps> = ({
  displayedCompanies,
  togglingId,
  testingConnection,
  handleToggleActive,
  handleOpenSettings,
  handleTestConnection,
  handleDelete,
}) => {
  return (
    <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {displayedCompanies.map((company) => {
        const hasApiKey = Boolean(company.apiKey);
        const isLive = company.integrationMode === "LIVE";
        const isDemo = company.integrationMode === "DEMO";

        return (
          <div
            key={company.id}
            className="rounded-xl border border-border/80 dark:border-border/60 bg-card/60 backdrop-blur-xs p-4 flex flex-col justify-between hover:border-border transition-colors shadow-2xs"
          >
            <div className="space-y-3">
              {/* Top Row: Name, Slug & Active Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg border border-border/80 bg-muted/40 text-foreground flex items-center justify-center shrink-0">
                    <TruckIcon className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {company.name}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      /{company.slug || company.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Micro-LED Active Toggle */}
                <button
                  type="button"
                  onClick={(e) => handleToggleActive(company, e)}
                  disabled={togglingId === company.id}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    company.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                  title={company.isActive ? "إيقاف العمل بالشركة" : "تفعيل العمل بالشركة"}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-2xs transition duration-200 ${
                      company.isActive ? "translate-x-0" : "-translate-x-4"
                    }`}
                  />
                </button>
              </div>

              {/* Telemetry Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  isLive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : isDemo
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                    : "bg-muted text-muted-foreground border-border/60"
                }`}>
                  <span className={`size-1.5 rounded-full ${isLive ? "bg-emerald-500" : isDemo ? "bg-amber-500" : "bg-muted-foreground"}`} />
                  <span>{company.integrationMode || "MANUAL"}</span>
                </span>

                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground">
                  {company.providerKey || "MANUAL"}
                </span>

                {/* Connection status */}
                {isLive && (
                  <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    hasApiKey
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  }`}>
                    {hasApiKey ? "API: Configured" : "API: Missing Key"}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row Actions */}
            <div className="pt-3 mt-3 border-t border-border/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenSettings(company, !company.isActive)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
              >
                <PencilIcon className="size-3.5 text-muted-foreground" />
                <span>{company.isActive ? "إعدادات الربط والـ API" : "تفعيل وإعدادات الربط"}</span>
              </button>

              {isLive && company.isActive && (
                <button
                  type="button"
                  onClick={() => handleTestConnection(company.id)}
                  disabled={testingConnection}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
                  title="فحص واختبار الاتصال"
                >
                  <ArrowPathIcon className={`size-3 text-muted-foreground ${testingConnection ? "animate-spin" : ""}`} />
                  <span>فحص</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => handleDelete(company, e)}
                className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition active:scale-[0.98]"
                title="حذف الشركة"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
