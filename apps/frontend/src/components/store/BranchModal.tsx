import React from "react";
import { useTranslation } from "react-i18next";
import { X, Building2, MapPin, Phone, Mail, Clock, Check } from "lucide-react";
import { Branch } from "../../services/storeSettingsService";

interface BranchModalProps {
  branch: Partial<Branch>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (branch: Partial<Branch>) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  branch,
  isEditing,
  onClose,
  onSave,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 text-card-foreground shadow-2xl rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {isEditing
                  ? t("storeBranches.modalEditTitle")
                  : t("storeBranches.modalAddTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                إدارة معلومات الفرع ونقاط الاستلام والتسليم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Branch Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("storeBranches.branchName")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={branch.name || ""}
              onChange={(e) => onChange({ ...branch, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
              placeholder={t("storeBranches.branchNamePlaceholder")}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("storeBranches.address")}
            </label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={branch.address || ""}
                onChange={(e) =>
                  onChange({ ...branch, address: e.target.value })
                }
                className="w-full pr-9 pl-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
                placeholder={t("storeBranches.addressPlaceholder")}
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("storeBranches.city")}
            </label>
            <input
              type="text"
              value={branch.city || ""}
              onChange={(e) => onChange({ ...branch, city: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
              placeholder={t("storeBranches.cityPlaceholder")}
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                {t("storeBranches.phone")} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  value={branch.phone || ""}
                  onChange={(e) =>
                    onChange({ ...branch, phone: e.target.value })
                  }
                  dir="ltr"
                  className="w-full pr-9 pl-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-right font-mono tabular-nums"
                  placeholder={t("storeBranches.phonePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                {t("storeBranches.email")}
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="email"
                  value={branch.email || ""}
                  onChange={(e) =>
                    onChange({ ...branch, email: e.target.value })
                  }
                  dir="ltr"
                  className="w-full pr-9 pl-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-right"
                  placeholder="branch@example.com"
                />
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              {t("storeBranches.workingHours")}
            </label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={branch.workingHours || ""}
                onChange={(e) =>
                  onChange({ ...branch, workingHours: e.target.value })
                }
                className="w-full pr-9 pl-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono tabular-nums"
                placeholder={t("storeBranches.workingHoursPlaceholder")}
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="branchActive"
              checked={branch.isActive !== false}
              onChange={(e) =>
                onChange({ ...branch, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
            />
            <label
              htmlFor="branchActive"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              {t("storeBranches.branchActive")}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl transition-colors"
          >
            {t("storeBranches.cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!branch.name?.trim()}
            className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {isEditing ? t("storeBranches.save") : t("storeBranches.addBranch")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchModal;
