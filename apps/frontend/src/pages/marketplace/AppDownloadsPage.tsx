import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Monitor,
  Laptop,
  Smartphone,
  Apple,
  Search,
  Store,
  Grid3x3,
  Copy,
  Check,
  Download,
  Key,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IosInstallModal } from "@/components/common/IosInstallModal";
import { DOWNLOAD_PACKAGES, DownloadPackage } from "./downloads/downloadsData";
import { DownloadAppTile } from "./downloads/DownloadAppTile";
import { AppDetailsDrawer } from "./downloads/AppDetailsDrawer";
import { usePlatformDetect } from "./downloads/usePlatformDetect";

/**
 * MaxP Downloads & Client Applications Cockpit
 * Unified single-surface chassis matching /my-apps and /marketplace
 */
export const AppDownloadsPage: React.FC = () => {
  const { user } = useAuth();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "desktop" | "mobile" | "android" | "ios">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDrawerPkg, setSelectedDrawerPkg] = useState<DownloadPackage | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);

  const { os, osLabel, isStandalone } = usePlatformDetect();

  const companyToken = (user?.company as any)?.id || (user as any)?.companyId || "";
  const companyName = (user?.company as any)?.name || "منشأتك";

  const handleCopyDeploymentPack = () => {
    const text = `دليل روابط وتطبيقات MaxP لمنشأة: ${companyName}

1. برنامج مراقبة وإنتاجية فريق العمل لسطح المكتب (Windows Setup .exe):
https://maxp.online/download/MaxP-Workspace-Setup.exe
النسخة المحمولة بدون تثبيت (Portable .zip):
https://maxp.online/downloads/MaxP-Monitor-Portable.zip

2. تطبيق الموبايل للأندرويد (Android APK):
https://maxp.online/downloads/maxp.apk

3. تطبيق الموبايل للآيفون ونظام iOS:
https://maxp.online (تثبيت فوري عبر متصفح Safari - إضافة إلى الشاشة الرئيسية)

معرّف المنشأة المرجعي لربط الأجهزة: ${companyToken || "تواصل مع مدير الحساب"}`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("تم نسخ دليل الروابط المجمع لمشاركته مع الفريق");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyTokenOnly = () => {
    if (!companyToken) {
      toast.info("سجل الدخول لإظهار معرّف المنشأة المرجعي");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة بنجاح");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleHeroInstall = () => {
    if (os === "android") {
      window.location.href = "https://maxp.online/downloads/maxp.apk";
      return;
    }
    if (os === "ios") {
      setShowIosModal(true);
      return;
    }
    if (os === "windows") {
      window.location.href = "https://maxp.online/download/MaxP-Workspace-Setup.exe";
      return;
    }
    toast.info("اختر الحزمة المتوافقة مع احتياجاتك من القائمة أدناه");
  };

  // Filter packages based on active category and live search
  const filteredPackages = useMemo(() => {
    return DOWNLOAD_PACKAGES.filter((pkg) => {
      // Category / Platform Filter
      if (activeTab === "desktop" && pkg.category !== "desktop") {
        return false;
      }
      if (activeTab === "mobile" && pkg.category !== "mobile") {
        return false;
      }
      if (activeTab === "android" && !pkg.id.includes("android")) {
        return false;
      }
      if (activeTab === "ios" && !pkg.id.includes("ios")) {
        return false;
      }

      // Search Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const haystack = [
        pkg.name,
        pkg.nameEn,
        pkg.platform,
        pkg.summary,
        pkg.version,
        ...pkg.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: DOWNLOAD_PACKAGES.length,
      desktop: DOWNLOAD_PACKAGES.filter((p) => p.category === "desktop").length,
      mobile: DOWNLOAD_PACKAGES.filter((p) => p.category === "mobile").length,
      android: DOWNLOAD_PACKAGES.filter((p) => p.id.includes("android")).length,
      ios: DOWNLOAD_PACKAGES.filter((p) => p.id.includes("ios")).length,
    };
  }, []);

  return (
    <div className="min-h-full bg-background" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* 1. Unified Ecosystem Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          {/* Section Switcher Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold shrink-0 overflow-x-auto scrollbar-none">
            <Link
              to="/marketplace"
              className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Store className="size-3.5" />
              <span>متجر التطبيقات</span>
            </Link>

            <Link
              to="/my-apps"
              className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Grid3x3 className="size-3.5" />
              <span>تطبيقاتي المفعلة</span>
            </Link>

            <div className="px-3.5 py-1.5 rounded-lg bg-background text-foreground shadow-sm font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Laptop className="size-3.5 text-primary" />
              <span>تطبيقات الأجهزة والموبايل</span>
              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0 rounded-full bg-primary/10 text-primary font-semibold">
                {DOWNLOAD_PACKAGES.length}
              </span>
            </div>
          </div>

          {/* Quick Action: Copy All Links for Team */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDeploymentPack}
              className="h-9 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted active:scale-[0.97] transition-transform duration-160 ease-out"
            >
              {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">نسخ دليل الروابط للفريق</span>
              <span className="sm:hidden">نسخ الروابط</span>
            </Button>
          </div>
        </div>

        {/* 2. Unified Single-Surface Telemetry Strip (Linear / Cursor Style) */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-x-reverse divide-border/40 shadow-sm">
          {/* Telemetry 1: Auto-Detected Device */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleHeroInstall}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleHeroInstall();
            }}
            className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
            aria-label="جهازك المكتشف حالياً"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">جهازك المكتشف</span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors text-balance">
                {osLabel}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                متوافق 100%
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Download className="size-3 text-primary" />
              <span>{isStandalone ? "التطبيق مثبت لديك" : "تحميل مباشر لجهازك"}</span>
            </span>
          </div>

          {/* Telemetry 2: Desktop Workstations */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("desktop")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveTab("desktop");
            }}
            className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
            aria-label="برامج سطح المكتب ويندوز"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">سطح المكتب</span>
              <Laptop className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Windows 64-bit
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums block" dir="ltr">
              84.1&nbsp;MB (.exe) + 114.8&nbsp;MB (.zip)
            </span>
          </div>

          {/* Telemetry 3: Mobile Companions */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("mobile")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveTab("mobile");
            }}
            className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
            aria-label="تطبيقات الموبايل والميدان"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">الموبايل والميدان</span>
              <Smartphone className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Android &amp; iOS
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums block" dir="ltr">
              155.7&nbsp;MB (APK) + Safari PWA
            </span>
          </div>

          {/* Telemetry 4: Company Pairing Token */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleCopyTokenOnly}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCopyTokenOnly();
            }}
            className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
            aria-label="معرف المنشأة لربط الأجهزة"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">معرّف ربط الأجهزة</span>
              <Key className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-mono font-bold text-foreground truncate" dir="ltr">
                {companyToken ? `${companyToken.slice(0, 14)}…` : "سجل الدخول"}
              </span>
            </div>
            <span className="text-[11px] text-primary mt-0.5 flex items-center gap-1 group-hover:underline">
              {copiedToken ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedToken ? "تم نسخ الرمز" : "انقر لنسخ المعرّف"}</span>
            </span>
          </div>
        </div>

        {/* 3. Search, Segmented Platform Filter, and View Mode Switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن التطبيقات، الامتدادات (.exe, .apk)…"
              className="h-10 pr-10 pl-10 rounded-xl bg-card border-border/40 text-xs sm:text-sm focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Platform Filter Pills with Smooth Scroll */}
          <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/40 overflow-x-auto scrollbar-none text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل ({tabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
                activeTab === "desktop"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Laptop className="size-3.5" />
              <span>سطح المكتب ({tabCounts.desktop})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
                activeTab === "android"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="size-3.5" />
              <span>أندرويد ({tabCounts.android})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
                activeTab === "ios"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Apple className="size-3.5" />
              <span>آبل iOS ({tabCounts.ios})</span>
            </button>
          </div>

          {/* View Mode Toggle: Grid vs List (Matching MyApps & Marketplace) */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/40 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all active:scale-[0.97] duration-160 ease-out",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض شبكي (Bento Grid)"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all active:scale-[0.97] duration-160 ease-out",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض قائمة تفصيلية (Dense List)"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* 4. Applications Matrix (Pure Action-First Cockpit - No Explanatory Clutter) */}
        {filteredPackages.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {filteredPackages.map((pkg) => (
                <DownloadAppTile
                  key={pkg.id}
                  pkg={pkg}
                  viewMode="grid"
                  onOpenDetails={(p) => setSelectedDrawerPkg(p)}
                  onOpenIosModal={() => setShowIosModal(true)}
                  companyToken={companyToken}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPackages.map((pkg) => (
                <DownloadAppTile
                  key={pkg.id}
                  pkg={pkg}
                  viewMode="list"
                  onOpenDetails={(p) => setSelectedDrawerPkg(p)}
                  onOpenIosModal={() => setShowIosModal(true)}
                  companyToken={companyToken}
                />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
            <Monitor className="size-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground text-balance">لم يتم العثور على حزم مطابقة</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto text-pretty">
              جرب تغيير عبارة البحث أو اختر "الكل" لإظهار كافة تطبيقات الأجهزة والموبايل.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl text-xs font-semibold active:scale-[0.97] duration-160 ease-out"
            >
              عرض جميع التطبيقات
            </Button>
          </div>
        )}

        {/* 5. Slide-Over Technical Details Drawer (Zero Clutter on Main View) */}
        <AppDetailsDrawer
          pkg={selectedDrawerPkg}
          isOpen={Boolean(selectedDrawerPkg)}
          onClose={() => setSelectedDrawerPkg(null)}
          companyToken={companyToken}
        />

        {/* 6. Dedicated iOS Installation Modal */}
        <IosInstallModal
          isOpen={showIosModal}
          onClose={() => setShowIosModal(false)}
        />
      </div>
    </div>
  );
};

export default AppDownloadsPage;
