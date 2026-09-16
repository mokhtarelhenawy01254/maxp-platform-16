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
  DownloadCloud,
  Printer,
  FileArchive,
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
  const [activeTab, setActiveTab] = useState<"all" | "desktop" | "mobile" | "pos">("all");
  const { os, osLabel, canInstallPwa, installPwa, isStandalone } = usePlatformDetect();

  const companyToken = (user?.company as any)?.id || (user as any)?.companyId || "";
  const companyName = (user?.company as any)?.name || "مؤسستك";

  const handleCopyDeploymentPack = () => {
    const text = `دليل روابط وتطبيقات MaxP الرسمية لمنشأة: ${companyName}

1. برنامج مراقبة وإنتاجية فريق العمل لسطح المكتب (Windows Setup .exe):
https://maxp.online/downloads/MaxP-Monitor-Setup.exe
النسخة المحمولة بدون تثبيت (Portable .zip):
https://maxp.online/downloads/MaxP-Monitor-Portable.zip

2. تطبيق الموبايل الميداني للأندرويد (Android APK - 155 MB):
https://maxp.online/downloads/maxp.apk

3. تطبيق الويب والموبايل الفوري (PWA):
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
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Top Control Bar (Single Surface Chassis) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/marketplace"
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="العودة لمتجر التطبيقات"
            >
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">
                  مركز تحميل التطبيقات والبرامج
                </h1>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary font-mono shrink-0">
                  Official Downloads
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                تطبيقات المراقبة الميدانية، برامج سطح المكتب، ومحطات الكاشير لمنشأة <span className="font-semibold text-foreground">{companyName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyDeploymentPack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>نسخ دليل التثبيت الكامل للفريق</span>
            </button>
          </div>
        </div>

        {/* Smart Device Detection Spotlight (Hero Recommendation) */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-foreground">النظام المكتشف بجهازك:</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
                  {osLabel}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {os === "windows"
                  ? "برنامج مراقبة وإنتاجية فريق العمل لويندوز جاهز للتنزيل المباشر"
                  : os === "android"
                  ? "تطبيق أندرويد الميداني الرسمي جاهز للتنزيل والتثبيت"
                  : os === "ios"
                  ? "تطبيق آيفون (iOS) متاح للتثبيت الفوري كـ Progressive Web App"
                  : "تطبيقات سطح المكتب والموبايل متاحة للتثبيت المباشر"}
              </h2>
              <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed text-pretty">
                {os === "windows"
                  ? `حمّل مثبت ويندوز الرسمي (.exe 84.1 MB) لرصد البرامج النشطة وحساب ساعات العمل الفعلية وربط أجهزة الموظفين بلوحة ${companyName} مباشرة.`
                  : os === "android"
                  ? "قم بتحميل حزمة الـ APK المباشرة (155 MB) لتسجيل الحضور بالبصمة الحيوية واستلام إشعارات المهام والطلبات."
                  : os === "ios"
                  ? "يمكنك تثبيت المنظومة مباشرة على شاشة الآيفون الرئيسية بدون متجر تطبيقات مع دعم كامل لكافة وظائف العمل."
                  : "اختر الحزمة المتوافقة مع أجهزة فريقك للتحميل المباشر والتثبيت الفوري."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-3.5 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.98]"
                  >
                    <FileArchive className="size-4 text-muted-foreground" />
                    <span>النسخة المحمولة (.zip 114 MB)</span>
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
                    <span>تحميل حزمة أندرويد (APK 155 MB)</span>
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
                  <span>{isStandalone ? "التطبيق مثبت بالفعل على جهازك" : "تثبيت التطبيق على هذا الجهاز"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Unified Category Filter Tabs (Horizontal Scroll with No-Wrap) */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            جميع البرامج والتطبيقات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("desktop")}
            className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "desktop"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Laptop className="size-3.5" />
            <span>برنامج مراقبة الفريق (Windows)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "mobile"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>تطبيق الموبايل (Android &amp; iOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "pos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Printer className="size-3.5" />
            <span>نقاط البيع والكاشير (POS)</span>
          </button>
        </div>

        {/* Primary Applications Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Desktop Team Monitor */}
          {(activeTab === "all" || activeTab === "desktop") && (
            <DesktopMonitorCard companyToken={companyToken} />
          )}

          {/* Card 2: Mobile Companion */}
          {(activeTab === "all" || activeTab === "mobile") && <MobileCompanionCard />}

          {/* Card 3: POS Studio */}
          {(activeTab === "all" || activeTab === "pos") && <MerchantStudioCard />}

          {/* Corporate Deployment & Guide Card */}
          {(activeTab === "all" || activeTab === "desktop") && (
            <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground shrink-0">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      إرشادات النشر وربط أجهزة المنشأة
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      Enterprise Deployment &amp; Device Pairing
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      1. تثبيت برنامج المراقبة على أجهزة الموظفين:
                    </span>
                    حمّل ملف <code className="rounded bg-background border border-border/60 px-1 py-0.5 font-mono text-foreground">Setup .exe</code> أو فك ضغط النسخة المحمولة <code className="rounded bg-background border border-border/60 px-1 py-0.5 font-mono text-foreground">Portable .zip</code> على جهاز الكمبيوتر المستهدف.
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      2. إدخال معرّف الشركة لربط الجهاز:
                    </span>
                    عند تشغيل العميل لأول مرة، أدخل رمز المنشأة المرجعي: <code className="rounded bg-background border border-border/60 px-1.5 py-0.5 font-mono text-foreground">{companyToken || "المعين لمنشأتك"}</code> ليتم مزامنة تقارير النشاط مباشرة بلوحتك.
                  </div>

                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <span className="font-semibold text-foreground block mb-1">
                      3. توزيع تطبيق الأندرويد المباشر:
                    </span>
                    أرسل رابط ملف الـ APK المباشر <code className="rounded bg-background border border-border/60 px-1 py-0.5 font-mono text-foreground">maxp.online/downloads/maxp.apk</code> إلى مناديب الميدان للتثبيت دون الحاجة لمتجر Google Play.
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>
                  لأي استفسار بخصوص النشر الجماعي (Active Directory / MDM) تواصل مع الدعم الفني للمنصة.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Technical Architecture Specs Strip */}
        <div className="pt-1">
          <EnterpriseSpecsBanner />
        </div>
      </div>
    </div>
  );
};

export default AppDownloadsPage;

