import React from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { ShippingCompany } from "../types";

export interface ShippingCompanyTableViewProps {
  displayedCompanies: ShippingCompany[];
  togglingId: string | null;
  handleToggleActive: (company: ShippingCompany, e: React.MouseEvent) => Promise<void>;
  handleOpenSettings: (company: ShippingCompany, autoActivate?: boolean) => void;
  handleDelete: (company: ShippingCompany, e: React.MouseEvent) => Promise<void>;
}

export const ShippingCompanyTableView: React.FC<ShippingCompanyTableViewProps> = ({
  displayedCompanies,
  togglingId,
  handleToggleActive,
  handleOpenSettings,
  handleDelete,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border/60 text-right">
        <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">شركة الشحن</th>
            <th className="px-4 py-2.5">طريقة الربط</th>
            <th className="px-4 py-2.5">الحالة</th>
            <th className="px-4 py-2.5">تفعيل / إيقاف</th>
            <th className="px-4 py-2.5 text-center">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {displayedCompanies.map((company) => (
            <tr key={company.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <span>{company.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    /{company.slug || company.id.slice(0, 8)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
                  {company.integrationMode || "MANUAL"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border/60">
                  <span className={`size-1.5 rounded-full ${company.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  <span>{company.isActive ? "مفعلة وتعمل" : "متوقفة"}</span>
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => handleToggleActive(company, e)}
                  disabled={togglingId === company.id}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    company.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-3.5 transform rounded-full bg-white shadow-2xs transition duration-200 ${
                      company.isActive ? "translate-x-0" : "-translate-x-3.5"
                    }`}
                  />
                </button>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenSettings(company, !company.isActive)}
                    className="px-2 py-1 text-xs rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
                  >
                    إعدادات
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(company, e)}
                    className="p-1 text-muted-foreground hover:text-rose-600 rounded hover:bg-rose-500/10 transition"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
