import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Download,
  Laptop,
  Check,
  Copy,
  Info,
  ShieldCheck,
  Smartphone,
  Sparkles,
  DownloadCloud,
  Layers,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import { DesktopMonitorCard } from "./downloads/DesktopMonitorCard";
import { MobileCompanionCard } from "./downloads/MobileCompanionCard";
import { MerchantStudioCard } from "./downloads/MerchantStudioCard";
import { EnterpriseSpecsBanner } from "./downloads/EnterpriseSpecsBanner";
import { usePlatformDetect } from "./downloads/usePlatformDetect";

export const AppDownloadsPage: React.FC = () => {
  const { user } = useAuth();
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mobile" | "desktop" | "pos">("all");
  const { os, osLabel, isMobile, canInstallPwa, installPwa, isStandalone } = usePlatformDetect();

  const companyToken = (user?.company as any)?.id || (user as any)?.companyId || "";
  const companyName = (user?.company as any)?.name || "مؤسستك";

  const handleCopyDeploymentPack = () => {
    const text = `دليل روابط وتطبيقات MaxP لمنشأة: ${companyName}

1. برنامج مراقبة وإنتاجية فريق العمل لسطح المكتب (Windows Setup .exe):
https://maxp.online/downloads/MaxP-Monitor-Setup.exe
النسخة المحمولة بدون تثبيت (Portable .zip):
https://maxp.online/downloads/MaxP-Monitor-Portable.zip

2. تطبيق الموبايل الميداني للأندرويد (Android APK - 155 MB):
https://maxp.online/downloads/maxp.apk

3. تطبيق الويب والموبايل السريع (PWA):
https://maxp.online

معرّف المنشأة المرجعي لربط الأجهزة: ${companyToken || "تواصل مع مدير الحساب"}`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("تم نسخ دليل الروابط الكامل لمشاركته مع الفريق");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleHeroInstall = async () => {
    if (os === "android") {
      window.location.href = "https://maxp.online/downloads/maxp.apk";
      return;
    }
    if (os === "windows") {
      window.location.href = "https://maxp.online/downloads/MaxP-Monitor-Setup.exe";
      return;
    }
    if (canInstallPwa) {
      const ok = await installPwa();
      if (ok) {
        toast.success("جاري تثبيت تطبيق MaxP...");
      }
    } else {
      toast.info("للتثبيت السريع: استخدم خيار 'تثبيت التطبيق' من قائمة المتصفح");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar (Single Surface Chassis) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="العودة لمتجر التطبيقات"
            >
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">مركز تحميل وتثبيت تطبيقات المنظومة</h1>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  MaxP Apps Hub
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                برامج مراقبة الموظفين، تطبيقات الميدان، ومحطات الكاشير المهيأة لمنشأتك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyDeploymentPack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>نسخ دليل الروابط لمشاركته مع الفريق</span>
            </button>
          </div>
        </div>

        {/* Smart Device Detection Spotlight (Hero Recommendation) */}
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-l from-primary/10 via-card to-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-primary">تم التعرف على جهازك تلقائياً</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
                  {osLabel}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {os === "windows"
                  ? "برنامج مراقبة وإنتاجية فريق العمل لويندوز متاح للتحميل المباشر"
                  : os === "android"
                  ? "تطبيق أندرويد الميداني الرسمي جاهز للتنزيل والتثبيت"
                  : os === "ios"
                  ? "تطبيق آيفون (iOS) متاح للتثبيت الفوري كـ Progressive Web App"
                  : "تطبيقات سطح المكتب والموبايل متاحة للتثبيت المباشر"}
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {os === "windows"
                  ? "حمّل مثبت ويندوز الرسمي (.exe 84 MB) لتتبع نشاط العمل واحتساب الساعات الفعلية وربط محطات الموظفين بلوحةSwan مباشرة."
                  : os === "android"
                  ? "قم بتحميل حزمة الـ APK المباشرة (155 MB) أو ثبت نسخة الويب للشاشة الرئيسية لربط البصمة وإشعارات العمل."
                  : os === "ios"
                  ? "يمكنك تثبيت المنظومة مباشرة على شاشة الآيفون الرئيسية بدون متجر تطبيقات مع دعم كامل لكافة وظائف العمل."
                  : "اختر الحزمة المناسبة لجهازك للتحميل المباشر أو التثبيت الفوري."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {os === "windows" ? (
                <>
                  <a
                    href="https://maxp.online/downloads/MaxP-Monitor-Setup.exe"
                    download="MaxP-Monitor-Setup.exe"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Download className="size-4" />
                    <span>تحميل برنامج المراقبة (Setup .exe 84 MB)</span>
                  </a>
                  <a
                    href="https://maxp.online/downloads/MaxP-Monitor-Portable.zip"
                    download="MaxP-Monitor-Portable.zip"
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.98]"
                  >
                    <span>النسخة المحمولة (.zip)</span>
                  </a>
                </>
              ) : os === "android" ? (
                <>
                  <a
                    href="https://maxp.online/downloads/maxp.apk"
                    download="MaxP.apk"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Download className="size-4" />
                    <span>تحميل تطبيق أندرويد (APK 155 MB)</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleHeroInstall}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.98]"
                  >
                    <DownloadCloud className="size-4 text-primary" />
                    <span>{isStandalone ? "التطبيق مثبت" : "تثبيت فوري كـ PWA"}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleHeroInstall}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  <DownloadCloud className="size-4" />
                  <span>{isStandalone ? "التطبيق مثبت بالفعل على جهازك" : "تثبيت التطبيق على هذا الجهاز الآن"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Unified Category Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border/40 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            جميع التطبيقات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "mobile"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>الموبايل (Android &amp; iOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("desktop")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "desktop"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Laptop className="size-3.5" />
            <span>سطح المكتب (Windows &amp; Mac)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "pos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Printer className="size-3.5" />
            <span>الكاشير ونقاط البيع</span>
          </button>
        </div>

        {/* Primary Applications Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(activeTab === "all" || activeTab === "mobile") && <MobileCompanionCard />}
          {(activeTab === "all" || activeTab === "desktop") && (
            <DesktopMonitorCard companyToken={companyToken} />
          )}
          {(activeTab === "all" || activeTab === "pos") && <MerchantStudioCard />}

          {/* Corporate Deployment & MDM Guide Card */}
          {(activeTab === "all" || activeTab === "desktop") && (
            <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">إرشادات النشر وتهيئة حسابات الموظفين</h3>
                    <span className="text-[11px] text-muted-foreground">خيارات التوزيع السريع لمدراء الشركات</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      1. توزيع تطبيق الأندرويد الداخلي:
                    </span>
                    يمكنك إرسال رابط حزمة الـ APK المباشرة (<code className="rounded bg-muted px-1 font-mono text-foreground">maxp.online/downloads/maxp.apk</code>) لفريق العمل والمندوبين للتثبيت المباشر دون وسيط.
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      2. التثبيت السريع عبر المتصفح (Zero Installation):
                    </span>
                    لا تتطلب محطات العمل أي برامج تثبيت معقدة أو صلاحيات مسؤول، حيث يعمل تطبيق الويب المستقل بكامل خصائصه المتقدمة.
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      3. ربط أجهزة العمل برمز المنشأة:
                    </span>
                    استخدم معرّف المنشأة المرجعي <code className="rounded bg-muted px-1 font-mono text-foreground">{companyToken ? companyToken.slice(0, 8) + "..." : "المعين لحسابك"}</code> لمزامنة إعدادات الفريق والفرع فور تسجيل الدخول.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>
                  للحصول على مساعدة في الربط الجماعي أو تخصيص حزم خاصة، تواصل مع الدعم الفني للمنصة.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Technical Architecture Guarantees Banner */}
        <div className="pt-2">
          <EnterpriseSpecsBanner />
        </div>
      </div>
    </div>
  );
};

export default AppDownloadsPage;

