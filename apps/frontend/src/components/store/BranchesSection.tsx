import React from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Clock,
} from "lucide-react";
import { Branch } from "../../services/storeSettingsService";

interface BranchesSectionProps {
  branches: Branch[];
  onAdd: () => void;
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
}

export const BranchesSection: React.FC<BranchesSectionProps> = ({
  branches = [],
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {t("storeBranches.branches")}
          </h2>
          <p className="text-xs text-muted-foreground">
            فروع المتجر ونقاط التسليم والاستلام المتاحة للعملاء
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("storeBranches.addBranch")}</span>
        </button>
      </div>

      {/* Empty State or Grid */}
      {branches.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2.5" />
          <p className="text-xs font-medium text-foreground">
            {t("storeBranches.noBranches")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            لم يتم إنشاء أي فروع للمتجر بعد
          </p>
          <button
            onClick={onAdd}
            className="mt-3 text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>{t("storeBranches.addBranch")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-card border border-border/70 rounded-xl p-4 shadow-sm hover:border-border transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground">
                      {branch.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                      branch.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {branch.isActive
                      ? t("storeBranches.active")
                      : t("storeBranches.inactive")}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {branch.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70 mt-0.5" />
                      <span className="line-clamp-1">
                        {branch.address}
                        {branch.city ? `، ${branch.city}` : ""}
                      </span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="font-mono tabular-nums" dir="ltr">
                        {branch.phone}
                      </span>
                    </div>
                  )}
                  {branch.workingHours && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="font-mono tabular-nums">
                        {branch.workingHours}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => onEdit(branch)}
                  className="flex-1 py-1.5 px-2 text-xs font-medium border border-border/70 rounded-lg text-foreground hover:bg-muted/50 flex items-center justify-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                  <span>{t("storeBranches.edit")}</span>
                </button>
                <button
                  onClick={() => onDelete(branch.id)}
                  className="py-1.5 px-2.5 text-xs font-medium border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors"
                  title={t("storeBranches.delete")}
                  aria-label={t("storeBranches.delete")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchesSection;
