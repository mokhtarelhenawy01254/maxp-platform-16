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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatformDetect } from "./usePlatformDetect";

export const MobileCompanionCard: React.FC = () => {
  const [copiedApkLink, setCopiedApkLink] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const { canInstallPwa, installPwa, isStandalone, isIosSafari } = usePlatformDetect();

  // Verified working APK endpoint hosted directly on maxp.online
  const apkUrl = "https://maxp.online/downloads/maxp.apk";
  const webPwaUrl = "https://maxp.online";
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    webPwaUrl
  )}&bgcolor=ffffff&color=09090b&margin=6`;

  const handleCopyApk = () => {
    navigator.clipboard.writeText(apkUrl);
    setCopiedApkLink(true);
    toast.success("تم نسخ رابط حزمة أندرويد (APK) لمشاركته");
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
      toast.info("للتثبيت السريع: افتح قائمة المتصفح (⋮) واختر 'تثبيت التطبيق' أو 'إضافة للشاشة الرئيسية'");
    }
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:bg-accent/[0.01] transition-all duration-200">
      {/* Top Header & Title */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-12 sm:size-14 rounded-2xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-foreground transition-transform duration-150">
              <Smartphone className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  تطبيق الموبايل للموظفين والعمليات الميدانية
                </h3>
                <Badge variant="outline" className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  APK متاح الآن
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                MaxP Mobile Companion for Android (APK) &amp; iOS PWA
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground shrink-0">
            أندرويد وآيفون
          </span>
        </div>

        {/* Telemetry Matrix Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">الأنظمة المدعومة</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">Android 8+ / iOS 14+</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">حجم حزمة أندرويد</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block tabular-nums">155.7 MB (APK)</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">نسخة PWA الفورية</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">Zero Download</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">الصلاحيات</span>
            <span className="text-xs font-semibold text-foreground mt-0.5 block">البصمة / الإشعارات</span>
          </div>
        </div>

        {/* Content with Features and Optional QR */}
        <div className="space-y-2.5 mb-5 text-xs text-muted-foreground">
          <div className="flex items-start gap-2.5">
            <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              تسجيل الحضور والانصراف بالبصمة الحيوية مع ربط النطاق الجغرافي الدقيق لفروع المنشأة ومستودعاتها.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <BellRing className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              تنبيهات فورية بالمهام المستجدة، تحديثات حالات الطلبات، وإشعارات المبيعات اللحظية للمناديب.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <DownloadCloud className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              تثبيت فوري كـ Progressive Web App على جميع الهواتف مع دعم التخزين المؤقت في المناطق ضعيفة الشبكة.
            </span>
          </div>
        </div>

        {/* Collapsible QR Code Panel */}
        {showQrCode && (
          <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-center animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="size-28 sm:size-32 rounded-xl bg-white p-2 border border-border/60 shadow-sm flex items-center justify-center">
                <img
                  src={qrImgUrl}
                  alt="Scan to open mobile app"
                  className="size-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="text-start space-y-1">
                <p className="text-xs font-bold text-foreground">امسح الرمز بكاميرا الهاتف المحمول</p>
                <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                  يفتح التطبيق فوراً في متصفح الهاتف مع إمكانية التثبيت على الشاشة الرئيسية بنقرة واحدة.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* iOS Quick Helper */}
        {showIosGuide && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5 text-xs text-foreground animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold mb-2">
              <Share2 className="size-4 text-primary" />
              <span>طريقة تثبيت التطبيق على هواتف آيفون (iOS Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px] pr-1 leading-relaxed">
              <li>افتح موقع <span className="font-mono text-foreground font-semibold">maxp.online</span> في متصفح سفاري Safari.</li>
              <li>اضغط على زر المشاركة <span className="font-semibold text-foreground">(أيقونة السهم لأعلى)</span> أسفل شاشة الهاتف.</li>
              <li>اختر <span className="font-bold text-primary">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</span>.</li>
              <li>سيعمل تطبيق MaxP كـ تطبيق مستقل سريع على الشاشة الرئيسية وبدون متجر تطبيقات.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Action Footer & Downloads */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={apkUrl}
            download="MaxP.apk"
            className="w-full"
          >
            <Button
              className="w-full h-10 rounded-xl text-xs font-bold gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              <ArrowDownToLine className="size-4" />
              <span>تحميل تطبيق أندرويد (APK 155 MB)</span>
            </Button>
          </a>

          <Button
            type="button"
            variant="outline"
            onClick={handleInstallPwa}
            className="w-full h-10 rounded-xl text-xs font-bold gap-2 border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
          >
            <DownloadCloud className="size-4 text-primary" />
            <span>{isStandalone ? "التطبيق مثبت على جهازك" : "تثبيت فوري كـ PWA"}</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyApk}
            className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
          >
            {copiedApkLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>نسخ رابط تحميل حزمة الـ APK للموظفين</span>
          </Button>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQrCode(!showQrCode)}
              className="h-8 px-2 text-xs font-medium text-primary hover:bg-primary/10 gap-1"
            >
              <QrCode className="size-3.5" />
              <span>{showQrCode ? "إخفاء الـ QR" : "مسح QR"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowIosGuide(!showIosGuide)}
              className="h-8 px-2 text-xs font-medium text-primary hover:bg-primary/10 gap-1"
            >
              <Info className="size-3.5" />
              <span>دليل آيفون</span>
              {showIosGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCompanionCard;

