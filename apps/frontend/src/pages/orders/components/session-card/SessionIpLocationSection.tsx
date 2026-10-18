import React, { useState } from "react";
import { MapPin, Copy, Check } from "lucide-react";

export interface SessionIpLocationSectionProps {
  ip: string | null | undefined;
  rawIp?: string | null;
  isLocalIp: boolean;
  isManualOrder: boolean;
  finalLocationDisplay: string;
  hasValidIpLocation: boolean;
  country?: string | null;
  isLocationFromShipping: boolean;
}

export const SessionIpLocationSection: React.FC<SessionIpLocationSectionProps> = ({
  ip,
  rawIp,
  isLocalIp,
  isManualOrder,
  finalLocationDisplay,
  hasValidIpLocation,
  country,
  isLocationFromShipping,
}) => {
  const [copiedIp, setCopiedIp] = useState(false);

  const handleCopyIp = () => {
    const copyTarget = ip || rawIp;
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>عنوان الـ IP والموقع الجغرافي</span>
        </div>
        {(ip || isLocalIp) && (
          <button
            type="button"
            onClick={handleCopyIp}
            className="inline-flex items-center gap-1 rounded border border-border/60 bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground cursor-pointer"
            title="نسخ عنوان IP"
          >
            {copiedIp ? (
              <>
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>نسخ IP</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <span className="text-[11px] text-muted-foreground">IP العميل:</span>
          <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-foreground dir-ltr text-right">
            {ip ? (
              ip
            ) : isLocalIp ? (
              <span className="text-muted-foreground font-normal">شبكة داخلية / محلي</span>
            ) : isManualOrder ? (
              "طلب يدوي (بدون IP)"
            ) : (
              "غير محدد"
            )}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">
            {isLocationFromShipping ? "الموقع (من عنوان الشحن):" : "الموقع من الـ IP:"}
          </span>
          <div className="mt-0.5 font-semibold text-foreground">
            {finalLocationDisplay ? (
              <span>
                {finalLocationDisplay}
                {hasValidIpLocation && country ? ` (${country})` : ""}
                {isLocationFromShipping ? (
                  <span className="text-[10px] font-normal text-muted-foreground mr-1.5">(من بيانات الشحن)</span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">
                {rawIp ? "جارٍ التحديد / غير متاح" : "غير متاح"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionIpLocationSection;
