import React from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  ArrowLeftRight,
  Copy,
  Check,
  Info,
} from "lucide-react";

interface CustomDomainDnsCardProps {
  cnameTarget: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}

export const CustomDomainDnsCard: React.FC<CustomDomainDnsCardProps> = ({
  cnameTarget,
  copied,
  onCopy,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Requirements Strip */}
      <div className="p-3.5 sm:p-4 rounded-md border border-border/70 bg-card">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono">
            1
          </span>
          {t("customDomain.step1Title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5 p-2 rounded border border-border/50 bg-muted/20">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {t("customDomain.domainRegistered")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("customDomain.domainRegisteredDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded border border-border/50 bg-muted/20">
            <ArrowLeftRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {t("customDomain.dnsAccess")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("customDomain.dnsAccessDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DNS Configuration Strip */}
      <div className="p-3.5 sm:p-4 rounded-md border border-border/70 bg-card space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono">
            2
          </span>
          {t("customDomain.step2Title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("customDomain.dnsStepDesc")}
        </p>

        <div className="p-3 rounded-md border border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                CNAME
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {t("customDomain.dnsHostValue")}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <code
                dir="ltr"
                className="flex-1 truncate px-2.5 py-1 text-xs font-mono rounded border border-border/80 bg-background text-foreground select-all"
              >
                {cnameTarget}
              </code>
              <button
                type="button"
                onClick={() => onCopy(cnameTarget, "cname")}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-[0.97]"
              >
                {copied === "cname" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p>{t("customDomain.dnsNote")}</p>
        </div>
      </div>
    </div>
  );
};
