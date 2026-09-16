import React, { useState } from "react";
import {
  Smartphone,
  QrCode,
  ArrowDownToLine,
  Check,
  Copy,
  MapPin,
  BellRing,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const MobileCompanionCard: React.FC = () => {
  const [copiedApkLink, setCopiedApkLink] = useState(false);

  const apkUrl = "https://maxp.online/downloads/maxp-mobile-latest.apk";
  const webPwaUrl = "https://maxp.online";
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    webPwaUrl
  )}&bgcolor=ffffff&color=09090b&margin=6`;

  const handleCopyApk = () => {
    navigator.clipboard.writeText(apkUrl);
    setCopiedApkLink(true);
    toast.success("تم نسخ رابط تحميل تطبيق الأندرويد المباشر");
    setTimeout(() => setCopiedApkLink(false), 2500);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/30">
      {/* Top Header Badge & Telemetry */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 shrink-0">
              <Smartphone className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">تطبيق الموبايل للموظفين والميدان</h3>
                <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 font-mono">
                  v2.4.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MaxP Mobile Companion for Android &amp; iOS
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400 shrink-0">
            بصمة جغرافية GPS
          </span>
        </div>

        {/* Content with QR and Features side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-5">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/50 bg-white/95 shrink-0 shadow-inner">
            <img
              src={qrImgUrl}
              alt="Scan to open mobile app"
              className="size-28 sm:size-32 object-contain"
              loading="lazy"
            />
            <span className="text-[10px] font-medium text-zinc-800 mt-1 flex items-center gap-1">
              <QrCode className="size-3 text-zinc-600" />
              امسح بكاميرا الهاتف
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2 text-xs text-muted-foreground w-full">
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-purple-400 shrink-0" />
              <span>تسجيل حضور وانصراف بالبصمة الحيوية وربط النطاق الجغرافي للمقر.</span>
            </div>
            <div className="flex items-center gap-2">
              <BellRing className="size-3.5 text-purple-400 shrink-0" />
              <span>إشعارات لحظية بالمهام الموكلة وتنبيهات تأخر البصمة.</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-purple-400 shrink-0" />
              <span>دعم العمل كـ PWA متقدم مع إمكانية التثبيت الفوري للشاشة الرئيسية.</span>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
                <div className="text-[10px] text-muted-foreground">أنظمة التشغيل</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">Android &amp; iOS</div>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
                <div className="text-[10px] text-muted-foreground">حجم التطبيق</div>
                <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">~38 MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-4 border-t border-border/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2.5 text-xs font-semibold text-zinc-100 shadow-sm transition-all active:scale-[0.98] border border-zinc-700"
            )}
          >
            <ArrowDownToLine className="size-4 text-purple-400" />
            <span>تحميل مباشر (Android APK)</span>
          </a>

          <button
            type="button"
            onClick={handleCopyApk}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            {copiedApkLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>نسخ رابط الـ APK</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>Google Play</span>
            <ExternalLink className="size-3" />
          </a>
          <span>•</span>
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>App Store (iOS)</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MobileCompanionCard;
