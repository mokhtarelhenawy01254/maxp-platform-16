import { Home as HomeIcon, Circle as UserGroupIcon, Monitor as ComputerDesktopIcon, Settings as Cog6ToothIcon, Circle as ClipboardDocumentListIcon, Tag as TagIcon, Plus as PlusIcon, File as DocumentIcon, File as DocumentTextIcon, Circle as WrenchScrewdriverIcon, Activity as ChartBarIcon, Grid as Squares2X2Icon, ChevronDown as ChevronDownIcon } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { companyAwareApi } from "../../../services/companyAwareApi";
;

import OverviewSection from "./sections/OverviewSection";
import WhyAssetsSection from "./sections/WhyAssetsSection";
import BenefitsSection from "./sections/BenefitsSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import KPIsSection from "./sections/KPIsSection";
import ComplianceSection from "./sections/ComplianceSection";
import DocumentsSection from "./sections/DocumentsSection";
import ReceiptFormSection from "./sections/ReceiptFormSection";
import AssetRequestsSection from "./sections/AssetRequestsSection";
import AssetMaintenanceSection from "./sections/AssetMaintenanceSection";
import AssetList from "./AssetList";
import AssetCategories from "./AssetCategories";
import AssetSuppliers from "./AssetSuppliers";
import CustodyHistory from "./CustodyHistory";
import AssetForm from "./AssetForm";

type SectionId =
  | "overview"
  | "why"
  | "benefits"
  | "how"
  | "kpis"
  | "compliance"
  | "manage"
  | "categories"
  | "suppliers"
  | "custody"
  | "documents"
  | "receipts"
  | "requests"
  | "maintenance"
  | "reports";

interface Section {
  id: SectionId;
  title: string;
  icon: React.ElementType;
  color: string;
}

const AssetsOverviewDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    if (activeSection !== "manage" && showAddModal) {
      setShowAddModal(false);
    }
  }, [activeSection, showAddModal]);

  const handleDownloadReport = async (
    reportType: string,
    format: "excel" | "pdf",
  ) => {
    const reportKey = `${reportType}-${format}`;
    setLoadingReport(reportKey);

    try {
      // Use companyAwareApi for consistency with other requests
      const response = await companyAwareApi.get(
        `/hr/assets/reports/${reportType}`,
        {
          params: { format },
          responseType: "blob", // Critical for binary files
        },
      );

      const blob = new Blob([response.data], {
        type:
          format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const extension = format === "excel" ? "xlsx" : "pdf";
      const fileName = `${reportType}_report_${new Date().toISOString().split("T")[0]}.${extension}`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("حدث خطأ أثناء تحميل التقرير. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoadingReport(null);
    }
  };

  const sections: Section[] = [
    { id: "overview", title: "نظرة عامة", icon: HomeIcon, color: "indigo" },
    {
      id: "manage",
      title: "إدارة الأصول",
      icon: ComputerDesktopIcon,
      color: "teal",
    },
    { id: "categories", title: "التصنيفات", icon: TagIcon, color: "cyan" },
    {
      id: "suppliers",
      title: "الموردون",
      icon: UserGroupIcon,
      color: "emerald",
    },
    {
      id: "custody",
      title: "العهد النشطة",
      icon: ClipboardDocumentListIcon,
      color: "amber",
    },
    {
      id: "documents",
      title: "الوثائق والمرفقات",
      icon: DocumentIcon,
      color: "pink",
    },
    { id: "requests", title: "طلبات العهدة", icon: PlusIcon, color: "emerald" },
    {
      id: "maintenance",
      title: "الصيانة والضمان",
      icon: WrenchScrewdriverIcon,
      color: "rose",
    },
    {
      id: "receipts",
      title: "النماذج الرسمية",
      icon: DocumentTextIcon,
      color: "violet",
    },
    { id: "reports", title: "التقارير", icon: ChartBarIcon, color: "blue" },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "manage":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                سجل الأصول
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5" />
                إضافة أصل جديد
              </button>
            </div>

            {showAddModal && (
              <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    نموذج إضافة أصل
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    إغلاق
                  </button>
                </div>
                <AssetForm
                  usePortal={false}
                  onClose={() => setShowAddModal(false)}
                  onSuccess={() => {
                    setShowAddModal(false);
                    handleRefresh();
                  }}
                />
              </div>
            )}

            <AssetList refreshTrigger={refreshTrigger} />
          </div>
        );
      case "categories":
        return <AssetCategories />;
      case "suppliers":
        return <AssetSuppliers />;
      case "custody":
        return <CustodyHistory />;
      case "documents":
        return <DocumentsSection />;
      case "receipts":
        return <ReceiptFormSection />;
      case "requests":
        return <AssetRequestsSection />;
      case "maintenance":
        return <AssetMaintenanceSection />;
      case "reports":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* تقرير كل الأصول */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    كل الأصول
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  تقرير شامل بكل الأصول مع تفاصيلها الكاملة
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadReport("all-assets", "excel")}
                    disabled={loadingReport === "all-assets-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "all-assets-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() => handleDownloadReport("all-assets", "pdf")}
                    disabled={loadingReport === "all-assets-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "all-assets-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>

              {/* تقرير العهد الحالية */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-amber-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <UserGroupIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    العهد الحالية
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  العهد الحالية لكل موظف مع التفاصيل
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleDownloadReport("current-custody", "excel")
                    }
                    disabled={loadingReport === "current-custody-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "current-custody-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadReport("current-custody", "pdf")
                    }
                    disabled={loadingReport === "current-custody-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "current-custody-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>

              {/* تقرير الأصول المتاحة */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-emerald-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <ComputerDesktopIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    الأصول المتاحة
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  قائمة بالأصول المتاحة للتوزيع
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleDownloadReport("available-assets", "excel")
                    }
                    disabled={loadingReport === "available-assets-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "available-assets-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadReport("available-assets", "pdf")
                    }
                    disabled={loadingReport === "available-assets-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "available-assets-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>

              {/* تقرير الأصول في الصيانة */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-orange-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    في الصيانة
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  الأصول الموجودة حالياً في الصيانة
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleDownloadReport("maintenance-assets", "excel")
                    }
                    disabled={loadingReport === "maintenance-assets-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "maintenance-assets-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadReport("maintenance-assets", "pdf")
                    }
                    disabled={loadingReport === "maintenance-assets-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "maintenance-assets-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>

              {/* تقرير الأصول المفقودة/التالفة */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-red-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <DocumentIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    المفقودة/التالفة
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  الأصول المفقودة أو التالفة
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleDownloadReport("lost-damaged-assets", "excel")
                    }
                    disabled={loadingReport === "lost-damaged-assets-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "lost-damaged-assets-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadReport("lost-damaged-assets", "pdf")
                    }
                    disabled={loadingReport === "lost-damaged-assets-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "lost-damaged-assets-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>

              {/* تقرير القيمة الإجمالية */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-purple-100 dark:border-slate-700 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    القيمة الإجمالية
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  تقرير بالقيمة الإجمالية للأصول
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadReport("total-value", "excel")}
                    disabled={loadingReport === "total-value-excel"}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "total-value-excel"
                      ? "جاري التحميل..."
                      : "Excel"}
                  </button>
                  <button
                    onClick={() => handleDownloadReport("total-value", "pdf")}
                    disabled={loadingReport === "total-value-pdf"}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReport === "total-value-pdf"
                      ? "جاري التحميل..."
                      : "PDF"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "why":
        return <WhyAssetsSection />;
      case "benefits":
        return <BenefitsSection />;
      case "how":
        return <HowItWorksSection />;
      case "kpis":
        return <KPIsSection />;
      case "compliance":
        return <ComplianceSection />;
      default:
        return <OverviewSection />;
    }
  };

  const getColorClasses = (color: string) => {
    const colorStyles: Record<
      string,
      {
        bg: string;
        text: string;
        icon: string;
        hover: string;
        activeBg: string;
      }
    > = {
      indigo: {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        icon: "text-violet-300",
        hover: "hover:bg-indigo-50",
        activeBg: "bg-gradient-to-l from-violet-600 to-indigo-500",
      },
      teal: {
        bg: "bg-teal-50",
        text: "text-teal-700",
        icon: "text-violet-300",
        hover: "hover:bg-teal-50",
        activeBg: "bg-gradient-to-l from-violet-600 to-purple-500",
      },
      cyan: {
        bg: "bg-cyan-50",
        text: "text-cyan-700",
        icon: "text-purple-300",
        hover: "hover:bg-cyan-50",
        activeBg: "bg-gradient-to-l from-indigo-600 to-violet-500",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        icon: "text-violet-300",
        hover: "hover:bg-emerald-50",
        activeBg: "bg-gradient-to-l from-purple-600 to-violet-500",
      },
      amber: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        icon: "text-fuchsia-300",
        hover: "hover:bg-amber-50",
        activeBg: "bg-gradient-to-l from-fuchsia-600 to-purple-500",
      },
      pink: {
        bg: "bg-pink-50",
        text: "text-pink-700",
        icon: "text-pink-300",
        hover: "hover:bg-pink-50",
        activeBg: "bg-gradient-to-l from-purple-600 to-fuchsia-500",
      },
      rose: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        icon: "text-fuchsia-300",
        hover: "hover:bg-rose-50",
        activeBg: "bg-gradient-to-l from-fuchsia-600 to-violet-500",
      },
      violet: {
        bg: "bg-violet-50",
        text: "text-violet-700",
        icon: "text-violet-300",
        hover: "hover:bg-violet-50",
        activeBg: "bg-gradient-to-l from-violet-600 to-violet-500",
      },
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        icon: "text-indigo-300",
        hover: "hover:bg-blue-50",
        activeBg: "bg-gradient-to-l from-indigo-600 to-purple-500",
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: "text-violet-300",
        hover: "hover:bg-green-50",
        activeBg: "bg-gradient-to-l from-violet-600 to-indigo-500",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        icon: "text-purple-300",
        hover: "hover:bg-orange-50",
        activeBg: "bg-gradient-to-l from-purple-600 to-indigo-500",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        icon: "text-purple-300",
        hover: "hover:bg-purple-50",
        activeBg: "bg-gradient-to-l from-purple-600 to-purple-500",
      },
      red: {
        bg: "bg-red-50",
        text: "text-red-700",
        icon: "text-fuchsia-300",
        hover: "hover:bg-red-50",
        activeBg: "bg-gradient-to-l from-fuchsia-600 to-purple-500",
      },
    };
    return colorStyles[color] || colorStyles["indigo"];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-fuchsia-50/20 dark:bg-gradient-to-br dark:from-[#1a1040] dark:via-[#1e1248] dark:to-[#231250] flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-gradient-to-b from-indigo-800 to-violet-900 dark:from-[#2a1860] dark:via-[#1e1248] dark:to-[#160e38] min-h-screen sticky top-0 overflow-y-auto shadow-2xl relative">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400 to-fuchsia-500 rounded-full blur-3xl"></div>
        </div>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-violet-700/30 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
              <ComputerDesktopIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                إدارة الأصول والعهدة
              </h1>
              <p className="text-xs text-violet-300/60">
                نظام شامل لحماية وتتبع أصول الشركة
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2 pb-6 relative z-10">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const isActive = activeSection === section.id;
            const colors = getColorClasses(section.color);

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${isActive
                  ? `${colors?.activeBg || "bg-violet-600"} text-white shadow-lg shadow-violet-500/20`
                  : "text-violet-200/70 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <div
                  className={`p-2 rounded-lg transition-all ${isActive
                    ? "bg-white/20"
                    : `bg-white/5 group-hover:bg-white/10`
                    }`}
                >
                  <SectionIcon
                    className={`h-5 w-5 ${isActive
                      ? "text-white"
                      : `${colors?.icon || "text-slate-400"} group-hover:text-white`
                      }`}
                  />
                </div>
                <span className="flex-1 text-right">{section.title}</span>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-lg shadow-white/50"></div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen relative">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-violet-200/30 dark:bg-violet-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-fuchsia-200/20 dark:bg-fuchsia-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Top Header */}
        <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#1a1040]/90 backdrop-blur-xl shadow-lg border-b border-violet-200/30 dark:border-violet-700/30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-gradient-to-b from-violet-600 to-indigo-500 rounded-full"></div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                {sections.find((s) => s.id === activeSection)?.title || "نظرة عامة"}
              </h2>
            </div>

            {/* Quick Navigation Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-white/5 border border-violet-200/50 dark:border-white/10 rounded-xl hover:bg-violet-50 dark:hover:bg-white/10 transition-all duration-200 shadow-sm group">
                <Squares2X2Icon className="h-5 w-5 text-violet-500 dark:text-violet-400 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:inline">الوصول السريع</span>
                <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2 shadow-2xl shadow-violet-500/10 rounded-2xl">
                <div className="px-3 py-2 border-b border-violet-100/50 dark:border-white/5 mb-1">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">التنقل عبر الأقسام</p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  {sections.map((section) => {
                    const SectionIcon = section.icon;
                    const isCurrentSection = activeSection === section.id;
                    return (
                      <DropdownMenuItem
                        key={section.id}
                        onSelect={() => setActiveSection(section.id)}
                        className={`${
                          isCurrentSection
                            ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 focus:bg-violet-100 dark:focus:bg-violet-500/20"
                            : "text-gray-600 dark:text-gray-300 focus:bg-violet-50 dark:focus:bg-white/10 focus:text-violet-600 dark:focus:text-white"
                        } group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150`}
                      >
                        <div className={`p-2 rounded-lg transition-colors ${
                          isCurrentSection
                            ? "bg-violet-200/60 dark:bg-violet-500/30"
                            : "bg-violet-50/50 dark:bg-white/5"
                        }`}>
                          <SectionIcon className={`h-4 w-4 ${
                            isCurrentSection ? "text-violet-600 dark:text-violet-300" : "text-violet-400"
                          }`} />
                        </div>
                        <span className="flex-1 text-right font-medium">{section.title}</span>
                        {isCurrentSection && (
                          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-6 relative z-10"
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
};

export default AssetsOverviewDashboard;
