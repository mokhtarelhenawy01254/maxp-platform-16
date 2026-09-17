import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Monitor,
  Download,
  Laptop,
  Check,
  Copy,
  Info,
  ShieldCheck,
  Smartphone,
  DownloadCloud,
  Printer,
  Store,
  Grid3x3,
  Search,
  Building,
  Key,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DesktopMonitorCard } from "./downloads/DesktopMonitorCard";
import { MobileCompanionCard } from "./downloads/MobileCompanionCard";
import { MerchantStudioCard } from "./downloads/MerchantStudioCard";
import { EnterpriseSpecsBanner } from "./downloads/EnterpriseSpecsBanner";
import { usePlatformDetect } from "./downloads/usePlatformDetect";

export const AppDownloadsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "desktop" | "mobile" | "pos" | "enterprise">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { os, osLabel, isStandalone } = usePlatformDetect();

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

3. وصول سحابي مباشر عبر الويب (Web Cloud):
https://maxp.online

معرّف المنشأة المرجعي لربط الأجهزة: ${companyToken || "تواصل مع مدير الحساب"}`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("تم نسخ دليل الروابط الكامل لمشاركته مع الفريق");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleHeroInstall = () => {
    if (os === "android") {
      window.location.href = "https://maxp.online/downloads/maxp.apk";
      return;
    }
    if (os === "windows") {
      window.location.href = "https://maxp.online/downloads/MaxP-Monitor-Setup.exe";
      return;
    }
    window.open("https://maxp.online", "_blank");
  };

  // Filter cards based on tab and search
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  const showDesktop =
    (activeTab === "all" || activeTab === "desktop") &&
    matchesSearch("ويندوز سطح المكتب مراقبة موظفين windows exe zip sqlite monitor");
  const showMobile =
    (activeTab === "all" || activeTab === "mobile") &&
    matchesSearch("أندرويد موبايل آيفون بصمة apk pwa android ios phone companion");
  const showPos =
    (activeTab === "all" || activeTab === "pos") &&
    matchesSearch("كاشير طابعة فواتير باركود pos esc receipt thermal printer");
  const showEnterprise =
    (activeTab === "all" || activeTab === "enterprise") &&
    matchesSearch("نشر شركات مؤسسي رمز منشأة mdm enterprise deployment policy");

  return (
    <div className="min-h-full bg-background" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* 1. Unified Header Section (Matching MyApps & MarketplaceV2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Monitor className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  تطبيقات الأجهزة والموبايل
                </h1>
                <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full">
                  5 حزم رسمية
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                تثبيت وتوزيع برامج مراقبة وإنتاجية فريق العمل، تطبيقات الميدان للأندرويد والآيفون، ومحطات الكاشير المهيأة لمنشأتك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDeploymentPack}
              className="h-10 rounded-xl px-3.5 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
            >
              {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copiedAll ? "تم نسخ الدليل" : "نسخ دليل الروابط للفريق"}</span>
            </Button>

            <Link to="/my-apps" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3.5 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
              >
                <Grid3x3 className="size-3.5 text-primary" />
                <span>تطبيقاتي المفعلة</span>
              </Button>
            </Link>

            <Link to="/marketplace">
              <Button size="sm" className="h-10 rounded-xl px-4 text-xs font-bold gap-2 shadow-sm">
                <Store className="size-4" />
                <span>متجر التطبيقات</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Interactive KPI Telemetry Bar (Matching MyApps 4-card structure) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Auto-Detected Device */}
          <div
            onClick={handleHeroInstall}
            className="rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/40 hover:bg-accent/[0.02] cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">جهازك المكتشف حالياً</span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {osLabel}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                متوافق 100%
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <DownloadCloud className="size-3 text-primary" />
              <span>{isStandalone ? "التطبيق مثبت على هذا الجهاز" : "اضغط للتحميل المباشر لجهازك"}</span>
            </span>
          </div>

          {/* Card 2: Desktop Workstation Apps */}
          <div
            onClick={() => setActiveTab("desktop")}
            className="rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/40 hover:bg-accent/[0.02] cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">برامج سطح المكتب</span>
              <Laptop className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                2 حزم رسمية
              </span>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">Windows 64-bit</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block font-mono tabular-nums">
              84.1 MB (.exe) + 114.8 MB (.zip)
            </span>
          </div>

          {/* Card 3: Mobile Field Apps */}
          <div
            onClick={() => setActiveTab("mobile")}
            className="rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/40 hover:bg-accent/[0.02] cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">تطبيقات الموبايل والميدان</span>
              <Smartphone className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                Android &amp; iOS
              </span>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">APK + PWA</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              بصمة حيوية + نطاق جغرافي + تنبيهات
            </span>
          </div>

          {/* Card 4: Company Integration Key */}
          <div
            onClick={() => {
              if (companyToken) {
                navigator.clipboard.writeText(companyToken);
                toast.success("تم نسخ معرّف المنشأة بنجاح");
              }
            }}
            className="rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/40 hover:bg-accent/[0.02] cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">معرّف المنشأة لربط الأجهزة</span>
              <Key className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-mono font-bold text-foreground truncate max-w-[180px]">
                {companyToken ? `${companyToken.slice(0, 14)}...` : "تواصل مع الإدارة"}
              </span>
            </div>
            <span className="text-[11px] text-primary mt-1 flex items-center gap-1 group-hover:underline">
              <Copy className="size-3" />
              <span>انقر لنسخ المعرّف لجهاز الموظف</span>
            </span>
          </div>
        </div>

        {/* 3. Omni Filter Bar & Live Search (Matching MarketplaceV2 & MyApps) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
          {/* Platform Segmented Filter Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/40 overflow-x-auto scrollbar-none text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap",
                activeTab === "all" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              جميع المنصات (5)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "desktop" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Laptop className="size-3.5" />
              <span>سطح المكتب (2)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mobile")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "mobile" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="size-3.5" />
              <span>الموبايل والميدان (2)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "pos" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Printer className="size-3.5" />
              <span>الكاشير والطباعة (1)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("enterprise")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "enterprise" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-3.5" />
              <span>دليل التوزيع (1)</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن التطبيقات، الامتدادات (.exe, .apk)..."
              className="h-9 ps-9 pe-3 rounded-xl text-xs bg-card border-border/40 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* 4. Primary Applications Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {showDesktop && <DesktopMonitorCard companyToken={companyToken} />}
          {showMobile && <MobileCompanionCard />}
          {showPos && <MerchantStudioCard />}

          {/* Corporate IT Deployment Guide Card */}
          {showEnterprise && (
            <div className="relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:bg-accent/[0.01] transition-all duration-200">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="size-12 sm:size-14 rounded-2xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-foreground transition-transform duration-150">
                      <ShieldCheck className="size-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                          إرشادات النشر والتوزيع لمدراء الشركات (IT Kit)
                        </h3>
                        <Badge variant="outline" className="text-[11px] font-mono font-semibold text-primary border-primary/30 bg-primary/10">
                          Enterprise
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Corporate Deployment, Automated Pairing &amp; Multi-Branch Policy
                      </p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground shrink-0">
                    دليل المسؤول
                  </span>
                </div>

                {/* Steps */}
                <div className="space-y-3 text-xs text-muted-foreground mb-5">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <span className="font-bold text-foreground block mb-1">
                      1. توزيع تطبيق الأندرويد الميداني المباشر:
                    </span>
                    أرسل رابط الحزمة المباشرة (<code className="rounded bg-background border border-border/60 px-1.5 py-0.2 font-mono text-foreground">maxp.online/downloads/maxp.apk</code>) لفريق العمل والمندوبين للتثبيت الفوري دون وسيط أو حاجة لمتجر التطبيقات.
                  </div>

                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <span className="font-bold text-foreground block mb-1">
                      2. التثبيت السريع عبر المتصفح (Zero Installation PWA):
                    </span>
                    لا تتطلب أجهزة الكمبيوتر والمحطات صلاحيات مسؤول معقدة؛ يعمل تطبيق الويب المستقل بكامل سرعته مع دعم العمل المحلي دون انقطاع.
                  </div>

                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <span className="font-bold text-foreground block mb-1">
                      3. ربط أجهزة العمل برمز المنشأة المركزي:
                    </span>
                    زود الموظفين بمعرّف المنشأة <code className="rounded bg-background border border-border/60 px-1.5 py-0.2 font-mono font-bold text-foreground">{companyToken ? companyToken.slice(0, 12) + "..." : "المعين لمنشأتك"}</code> ليتم مزامنة إعدادات الفرع وساعات الدوام تلقائياً.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-primary shrink-0" />
                  <span className="text-[11px]">
                    للمساعدة في الربط الجماعي أو تخصيص حزم خاصة، يمكنك التواصل مع الدعم الفني.
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDeploymentPack}
                  className="h-8 rounded-lg px-3 text-xs font-semibold gap-1.5 shrink-0 border-border/60 hover:bg-muted"
                >
                  <Copy className="size-3" />
                  <span>نسخ الحزمة كاملة</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Empty state if search finds nothing */}
        {!showDesktop && !showMobile && !showPos && !showEnterprise && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
            <Monitor className="size-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">لم يتم العثور على حزم مطابقة</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              جرب تغيير عبارة البحث أو اختر "جميع المنصات" لإظهار كافة تطبيقات الأجهزة والموبايل.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setActiveTab("all"); setSearchQuery(""); }}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              عرض جميع التطبيقات
            </Button>
          </div>
        )}

        {/* 5. Technical Architecture & Security Guarantees Banner */}
        <div className="pt-2">
          <EnterpriseSpecsBanner />
        </div>
      </div>
    </div>
  );
};

export default AppDownloadsPage;

