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
import { cn } from "@/lib/utils";
import { usePlatformDetect } from "./usePlatformDetect";

export const MobileCompanionCard: React.FC = () => {
  const [copiedApkLink, setCopiedApkLink] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const { os, canInstallPwa, installPwa, isStandalone, isIosSafari } = usePlatformDetect();

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
    <div className="relative flex flex-col justify-between rounded-xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/40">
      {/* Top Header Badge */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
              <Smartphone className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">تطبيق الموبايل للموظفين والميدان</h3>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 font-mono">
                  APK متاح الآن
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MaxP Mobile Companion for Android &amp; iOS PWA
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground shrink-0">
            تثبيت مباشر وسريع
          </span>
        </div>

        {/* Content with QR and Features */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-5">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border/60 bg-white shrink-0 shadow-sm">
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
          <div className="flex-1 space-y-2.5 text-xs text-muted-foreground w-full">
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span>تسجيل حضور وانصراف بالبصمة الحيوية وربط النطاق الجغرافي للمقر.</span>
            </div>
            <div className="flex items-center gap-2">
              <BellRing className="size-3.5 text-primary shrink-0" />
              <span>إشعارات لحظية بالمهام الموكلة وتنبيهات الطلبات الجديدة والمبيعات.</span>
            </div>
            <div className="flex items-center gap-2">
              <DownloadCloud className="size-3.5 text-primary shrink-0" />
              <span>دعم التثبيت الفوري كـ Progressive Web App على جميع الهواتف.</span>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
                <div className="text-[10px] text-muted-foreground">أنظمة التشغيل</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">Android &amp; iOS</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
                <div className="text-[10px] text-muted-foreground">حجم حزمة الـ APK</div>
                <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">155.7 MB</div>
              </div>
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
              <li>افتح موقع <span className="font-mono text-foreground font-medium">maxp.online</span> في متصفح سفاري Safari.</li>
              <li>اضغط على زر المشاركة <span className="font-medium text-foreground">(أيقونة السهم لأعلى)</span> أسفل الشاشة.</li>
              <li>اختر <span className="font-semibold text-primary">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</span>.</li>
              <li>سيظهر تطبيق MaxP على شاشتك الرئيسية فوراً كأنه تطبيق من App Store!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-4 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Working APK download link with download attribute */}
          <a
            href={apkUrl}
            download="MaxP.apk"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            <ArrowDownToLine className="size-4" />
            <span>تحميل أندرويد (APK المباشر)</span>
          </a>

          {/* Instant PWA Install Trigger */}
          <button
            type="button"
            onClick={handleInstallPwa}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-3 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-all active:scale-[0.98]"
          >
            <DownloadCloud className="size-4 text-primary" />
            <span>{isStandalone ? "التطبيق مثبت على جهازك" : "تثبيت فوري (PWA Web)"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <button
            type="button"
            onClick={handleCopyApk}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {copiedApkLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>نسخ رابط ملف الـ APK لمشاركته عبر واتساب</span>
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

