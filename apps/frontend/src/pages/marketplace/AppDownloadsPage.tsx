import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import { IosInstallModal } from "@/components/common/IosInstallModal";
import { DOWNLOAD_PACKAGES, type DownloadPackage } from "./downloads/downloadsData";
import { AppDetailsDrawer } from "./downloads/AppDetailsDrawer";
import { usePlatformDetect } from "./downloads/usePlatformDetect";
import { AppDownloadsHeader } from "./components/downloads/AppDownloadsHeader";
import { AppDownloadsTelemetryStrip } from "./components/downloads/AppDownloadsTelemetryStrip";
import {
  AppDownloadsFilterBar,
  type DownloadsPlatformTab,
} from "./components/downloads/AppDownloadsFilterBar";
import { AppDownloadsMatrix } from "./components/downloads/AppDownloadsMatrix";

/**
 * MaxP Downloads & Client Applications Cockpit
 * Unified single-surface chassis matching /my-apps and /marketplace
 */
export const AppDownloadsPage: React.FC = () => {
  const { user } = useAuth();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<DownloadsPlatformTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDrawerPkg, setSelectedDrawerPkg] = useState<DownloadPackage | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);

  const { os, osLabel, isStandalone } = usePlatformDetect();

  const companyToken = (user?.company as any)?.id || (user as any)?.companyId || "";
  const companyName = (user?.company as any)?.name || "المنشأة";

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

  const filteredPackages = useMemo(() => {
    return DOWNLOAD_PACKAGES.filter((pkg) => {
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
        <AppDownloadsHeader
          totalPackagesCount={DOWNLOAD_PACKAGES.length}
          copiedAll={copiedAll}
          onCopyDeploymentPack={handleCopyDeploymentPack}
        />

        <AppDownloadsTelemetryStrip
          osLabel={osLabel}
          isStandalone={isStandalone}
          companyToken={companyToken}
          copiedToken={copiedToken}
          onHeroInstall={handleHeroInstall}
          onSelectTab={setActiveTab}
          onCopyTokenOnly={handleCopyTokenOnly}
        />

        <AppDownloadsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tabCounts={tabCounts}
        />

        <AppDownloadsMatrix
          filteredPackages={filteredPackages}
          viewMode={viewMode}
          companyToken={companyToken}
          onOpenDetails={(pkg) => setSelectedDrawerPkg(pkg)}
          onOpenIosModal={() => setShowIosModal(true)}
          onResetFilters={() => {
            setActiveTab("all");
            setSearchQuery("");
          }}
        />

        <AppDetailsDrawer
          pkg={selectedDrawerPkg}
          isOpen={Boolean(selectedDrawerPkg)}
          onClose={() => setSelectedDrawerPkg(null)}
          companyToken={companyToken}
        />

        <IosInstallModal
          isOpen={showIosModal}
          onClose={() => setShowIosModal(false)}
        />
      </div>
    </div>
  );
};

export default AppDownloadsPage;
