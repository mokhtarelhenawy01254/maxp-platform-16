import React, { useState } from "react";
import {
  Smartphone,
  QrCode,
  ArrowDownToLine,
  Check,
  Copy,
  MapPin,
  BellRing,
  DownloadCloud,
  Share2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { usePlatformDetect } from "./usePlatformDetect";

export const MobileCompanionCard: React.FC = () => {
  const [copiedApkLink, setCopiedApkLink] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const { canInstallPwa, installPwa, isStandalone, isIosSafari } = usePlatformDetect();

  // The verified working APK endpoint hosted directly on maxp.online
  const apkUrl = "https://maxp.online/downloads/maxp.apk";
  const webPwaUrl = "https://maxp.online";
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    webPwaUrl
  )}&bgcolor=ffffff&color=09090b&margin=6`;

  const handleCopyApk = () => {
    navigator.clipboard.writeText(apkUrl);
    setCopiedApkLink(true);
    toast.success("تم نسخ رابط تحميل تطبيق الأندرويد المباشر (APK)");
    setTimeout(() => setCopiedApkLink(false), 2500);
  };

  const handleInstallPwa = async () => {
    if (isIosSafari) {
      setShowIosGuide(true);
      return;
    }
    if (canInstallPwa) {
      const installed = await installPwa();
      if (installed) {
        toast.success("جاري تثبيت تطبيق MaxP على جهازك...");
      }
    } else {
      toast.info("للتثبيت الفوري: افتح قائمة المتصفح (⋮) واختر 'تثبيت التطبيق' أو 'إضافة للشاشة الرئيسية'");
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all hover:border-border">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground shrink-0">
              <Smartphone className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                  تطبيق الموبايل للموظفين والميدان
                </h3>
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  APK متاح
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                MaxP Mobile Companion for Android &amp; iOS PWA
              </p>
            </div>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
            تثبيت فوري
          </span>
        </div>

        {/* Telemetry Strip - Single Surface */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-muted/40 border border-border/40 mb-4 text-center">
          <div>
            <span className="text-[10px] text-muted-foreground block">الأنظمة المدعومة</span>
            <span className="text-xs font-semibold text-foreground font-mono">Android &amp; iOS</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">حجم الحزمة (APK)</span>
            <span className="text-xs font-semibold text-foreground font-mono tabular-nums">155.7 MB</span>
          </div>
          <div className="border-r border-border/30 pr-2 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground block">نوع التثبيت</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">تنزيل مباشر / PWA</span>
          </div>
        </div>

        {/* Content with QR on desktop / Hidden on mobile */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-5">
          {/* QR Code Container - Desktop/Tablet only */}
          <div className="hidden sm:flex flex-col items-center justify-center p-2.5 rounded-xl border border-border/60 bg-white shrink-0 shadow-sm">
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
            <div className="flex items-start gap-2">
              <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-pretty">تسجيل حضور وانصراف بالبصمة الحيوية وربط النطاق الجغرافي للمقر أو الفرع.</span>
            </div>
            <div className="flex items-start gap-2">
              <BellRing className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-pretty">إشعارات لحظية بالمهام وتنبيهات الطلبات الجديدة والمبيعات والمحادثات.</span>
            </div>
            <div className="flex items-start gap-2">
              <DownloadCloud className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-pretty">دعم التثبيت الفوري كـ Progressive Web App على هواتف آيفون وأندرويد.</span>
            </div>
          </div>
        </div>

        {/* iOS Quick Helper if toggled */}
        {showIosGuide && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <Share2 className="size-4 text-primary" />
              <span>طريقة تثبيت التطبيق على آيفون (iOS Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] pr-1">
              <li>افتح الرابط <span className="font-mono text-foreground font-medium">maxp.online</span> في متصفح سفاري Safari.</li>
              <li>اضغط على زر المشاركة <span className="font-medium text-foreground">(أيقونة السهم لأعلى)</span> أسفل الشاشة.</li>
              <li>اختر <span className="font-semibold text-primary">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</span>.</li>
              <li>سيظهر تطبيق MaxP على شاشتك الرئيسية فوراً كأنه تطبيق من App Store!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-3 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Working APK download link with download attribute */}
          <a
            href={apkUrl}
            download="MaxP.apk"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <ArrowDownToLine className="size-4" />
            <span>تحميل أندرويد (APK 155 MB)</span>
          </a>

          {/* Instant PWA Install Trigger */}
          <button
            type="button"
            onClick={handleInstallPwa}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-3 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.98]"
          >
            <DownloadCloud className="size-4 text-primary" />
            <span>{isStandalone ? "التطبيق مثبت على جهازك" : "تثبيت فوري (PWA Web)"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyApk}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {copiedApkLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>نسخ رابط الـ APK لمشاركته</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIosGuide(!showIosGuide)}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Info className="size-3" />
            <span>مستخدمي آيفون (iOS)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileCompanionCard;

