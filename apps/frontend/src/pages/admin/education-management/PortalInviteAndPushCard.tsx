import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { BellRing, Check, Copy, ExternalLink, Link2 } from "lucide-react";

export interface PortalInviteAndPushCardProps {
  portal?: string;
  title?: string;
  companySlug?: string | null;
  publicCode?: string | null;
  customDomain?: string | null;
  pushFirstSaveWhatsApp: boolean;
  onTogglePushFirst: (next: boolean) => void;
  savingPushFirst?: boolean;
  isEn?: boolean;
}

const PORTAL_TITLES: Record<string, { ar: string; en: string }> = {
  parent: { ar: "رابط دعوة ولي الأمر وإشعارات البوابة", en: "Parent Portal Invite & Notifications" },
  dental: { ar: "رابط دعوة طبيب الأسنان وإشعارات المعمل", en: "Dentist Portal Invite & Notifications" },
  patient: { ar: "رابط بوابة وحجز المريض وإشعارات العيادة", en: "Patient Portal & Notifications" },
  doctor: { ar: "رابط بوابة الطبيب وإشعارات المواعيد", en: "Doctor Portal & Notifications" },
  courier: { ar: "رابط تطبيق ومحطة المندوب", en: "Courier Portal & App Link" },
  customer: { ar: "رابط حساب العميل ومتابعة الطلبات", en: "Customer Portal & Tracking Link" },
};

export function buildParentPortalInviteUrl(
  companySlug?: string | null,
  customDomain?: string | null,
  portal: string = "parent",
): string {
  const cleanDomain = customDomain?.trim() || "";
  const origin = cleanDomain
    ? `https://${cleanDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
    : typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://maxp.online";

  const cleanSlug = companySlug?.trim() || "";
  const cleanPortal = portal?.trim().toLowerCase() || "parent";
  return cleanSlug
    ? `${origin}/i/${cleanSlug}?portal=${encodeURIComponent(cleanPortal)}`
    : `${origin}/portal-connect`;
}

export const PortalInviteAndPushCard: React.FC<PortalInviteAndPushCardProps> = ({
  portal = "parent",
  title,
  companySlug,
  publicCode,
  customDomain,
  pushFirstSaveWhatsApp,
  onTogglePushFirst,
  savingPushFirst = false,
  isEn = false,
}) => {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inviteUrl = useMemo(
    () => buildParentPortalInviteUrl(companySlug, customDomain, portal),
    [companySlug, customDomain, portal],
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard_unavailable");
      }
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), 2000);
      toast.success(isEn ? "Invite link copied" : "تم نسخ رابط الدعوة");
    } catch {
      toast.error(isEn ? "Unable to copy invite link automatically" : "تعذر نسخ الرابط تلقائياً");
    }
  };

  const cleanCode = publicCode?.trim() || "";
  const cardTitle =
    title?.trim() ||
    (isEn
      ? PORTAL_TITLES[portal]?.en || PORTAL_TITLES.parent.en
      : PORTAL_TITLES[portal]?.ar || PORTAL_TITLES.parent.ar);
  const switchLabel = isEn
    ? "Portal Push-First (Save WhatsApp)"
    : "إشعارات البوابة أولاً (توفير رسائل واتساب)";

  return (
    <section
      aria-label={cardTitle}
      className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <h3 className="text-xs font-bold text-foreground truncate">
            {cardTitle}
          </h3>
        </div>
        {cleanCode ? (
          <span
            dir="ltr"
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono tabular-nums bg-primary/10 text-primary border border-primary/20 shrink-0"
          >
            {cleanCode}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="shrink-0 self-start sm:self-center rounded-xl bg-white p-2 border border-border/60">
          <QRCodeSVG value={inviteUrl} size={88} />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div
            dir="ltr"
            title={inviteUrl}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground font-mono tabular-nums truncate select-all"
          >
            {inviteUrl}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{copied ? (isEn ? "Copied" : "تم النسخ") : (isEn ? "Copy Invite Link" : "نسخ رابط الدعوة")}</span>
            </button>

            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isEn ? "Open invite link" : "فتح رابط الدعوة"}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-foreground text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{isEn ? "Open" : "فتح الرابط"}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span id="push-first-switch-label" className="text-xs font-semibold text-foreground truncate">
            {switchLabel}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={pushFirstSaveWhatsApp}
          aria-labelledby="push-first-switch-label"
          disabled={savingPushFirst}
          onClick={() => onTogglePushFirst(!pushFirstSaveWhatsApp)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 cursor-pointer ${
            pushFirstSaveWhatsApp
              ? "bg-primary border-primary"
              : "bg-muted border-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
              pushFirstSaveWhatsApp
                ? isEn
                  ? "translate-x-5"
                  : "-translate-x-5"
                : isEn
                  ? "translate-x-1"
                  : "-translate-x-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
};

export default PortalInviteAndPushCard;
