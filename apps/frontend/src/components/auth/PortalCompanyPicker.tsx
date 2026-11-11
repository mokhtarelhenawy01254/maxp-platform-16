import React, { useState } from "react";
import { ArrowRight, Building2, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { envConfig } from "../../config/environment";
import type { PortalCompanyOption } from "../../utils/portalSessionManager";

export interface PortalCompanyPickerProps {
  companies: PortalCompanyOption[];
  selectedCompanyId?: string | null;
  onSelect: (companyId: string) => void;
  onBack?: () => void;
  loading?: boolean;
  variant?: "auth-surface" | "card";
}

function resolveLogoSrc(logo?: string | null): string | null {
  if (!logo || !logo.trim()) return null;
  const trimmed = logo.trim();
  if (/^(https?:\/\/|data:)/i.test(trimmed)) return trimmed;
  return `${envConfig.backendUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export const PortalCompanyPicker: React.FC<PortalCompanyPickerProps> = ({
  companies,
  selectedCompanyId,
  onSelect,
  onBack,
  loading = false,
  variant = "card",
}) => {
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const isAuthDark = variant === "auth-surface";

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="space-y-1">
        <h3
          className={cn(
            "text-sm font-bold text-balance",
            isAuthDark ? "text-[var(--auth-text-main,#f5f0f0)]" : "text-foreground",
          )}
        >
          اختر الجهة التي تريد المتابعة إليها
        </h3>
        <p
          className={cn(
            "text-xs text-pretty",
            isAuthDark
              ? "text-[var(--auth-text-muted,#a09090)]"
              : "text-muted-foreground",
          )}
        >
          حسابك مرتبط بأكثر من جهة، اختر الجهة المطلوبة لإتمام تسجيل الدخول.
        </p>
      </div>

      <div className="space-y-2" role="list" aria-label="الجهات المرتبطة بالحساب">
        {companies.map((company) => {
          const isSelected = selectedCompanyId === company.companyId;
          const logoUrl = !failedLogos[company.companyId]
            ? resolveLogoSrc(company.companyLogo)
            : null;
          const initial = (company.companyName || "").trim().charAt(0);

          return (
            <button
              key={company.companyId}
              type="button"
              role="listitem"
              disabled={loading}
              aria-pressed={isSelected}
              onClick={() => onSelect(company.companyId)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-all duration-150 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
                isAuthDark
                  ? cn(
                      "border-[var(--auth-input-border,rgba(255,255,255,0.14))] bg-[var(--auth-input-bg,rgba(255,255,255,0.04))] text-[var(--auth-text-main,#f5f0f0)] hover:border-[var(--auth-accent,#b81a1a)] hover:bg-white/[0.08]",
                      isSelected &&
                        "border-[var(--auth-accent,#b81a1a)] bg-white/[0.1]",
                    )
                  : cn(
                      "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50",
                      isSelected && "border-primary bg-primary/5",
                    ),
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border",
                  isAuthDark
                    ? "border-white/10 bg-white/[0.06] text-[var(--auth-text-main,#f5f0f0)]"
                    : "border-border bg-muted text-foreground",
                )}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={company.companyName}
                    className="size-full object-cover"
                    onError={() =>
                      setFailedLogos((prev) => ({
                        ...prev,
                        [company.companyId]: true,
                      }))
                    }
                  />
                ) : initial ? (
                  <span className="text-sm font-bold">{initial}</span>
                ) : (
                  <Building2 className="size-4 opacity-80" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {company.companyName}
                </p>
                {company.label ? (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      isAuthDark
                        ? "text-[var(--auth-text-muted,#a09090)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {company.label}
                  </p>
                ) : null}
              </div>

              {loading && isSelected ? (
                <Loader2 className="size-4 shrink-0 animate-spin opacity-80" />
              ) : (
                <ChevronLeft
                  className={cn(
                    "size-4 shrink-0 transition-transform group-hover:-translate-x-0.5",
                    isAuthDark
                      ? "text-[var(--auth-text-muted,#a09090)]"
                      : "text-muted-foreground",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {onBack ? (
        <button
          type="button"
          disabled={loading}
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50",
            isAuthDark
              ? "text-[var(--auth-text-muted,#a09090)] hover:text-[var(--auth-text-main,#f5f0f0)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowRight className="size-3.5" />
          <span>رجوع وتعديل البيانات</span>
        </button>
      ) : null}
    </div>
  );
};

export default PortalCompanyPicker;
