import React from "react";
import { AlertTriangle, Building2, CheckCircle2, Globe, Shield, XCircle } from "lucide-react";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../hooks/useAuthSimple";

export const CompanyInfo: React.FC = () => {
  const { company, companyId, isCompanyLoading } = useCompany();
  const { user } = useAuth();

  const parseSettings = (settings: any) => {
    if (!settings) return null;
    if (typeof settings === "object") return settings;
    try {
      return JSON.parse(settings);
    } catch {
      return null;
    }
  };

  const parsedSettings = parseSettings(company?.settings);

  if (isCompanyLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="size-10 bg-muted rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded-md w-1/3" />
            <div className="h-3 bg-muted rounded-md w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-foreground">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">لا توجد شركة</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              لم يتم العثور على بيانات الشركة المرتبطة بهذا الحساب
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs text-foreground space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-base shadow-2xs">
            {company.name ? company.name.charAt(0) : <Building2 className="size-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{company.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{company.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border font-mono tabular-nums ${
                  company.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {company.isActive ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    <span>نشط</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-3" />
                    <span>غير نشط</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {user?.role === "SUPER_ADMIN" && (
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums text-end shrink-0 space-y-0.5">
            <p>ID: {companyId}</p>
            <p>العملة: {company.currency}</p>
          </div>
        )}
      </div>

      {/* Company Settings */}
      {parsedSettings && (
        <div className="pt-3 border-t border-border/60">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Globe className="size-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">المنطقة الزمنية:</span>
              <span className="font-medium font-mono tabular-nums text-foreground">
                {parsedSettings.timezone || "غير محدد"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">اللغة:</span>
              <span className="font-medium text-foreground">
                {parsedSettings.language === "ar" ? "العربية" : "English"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Role Info */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Shield className="size-3.5 text-muted-foreground" />
          <span>دورك في الشركة:</span>
        </div>
        <span className="font-semibold text-primary">
          {user?.role === "COMPANY_ADMIN"
            ? "مدير الشركة"
            : user?.role === "MANAGER"
              ? "مدير"
              : user?.role === "AGENT"
                ? "موظف"
                : user?.role === "AFFILIATE"
                  ? "مسوق بالعمولة"
                  : user?.role === "SUPER_ADMIN"
                    ? "مدير النظام"
                    : user?.role}
        </span>
      </div>
    </div>
  );
};

export default CompanyInfo;
