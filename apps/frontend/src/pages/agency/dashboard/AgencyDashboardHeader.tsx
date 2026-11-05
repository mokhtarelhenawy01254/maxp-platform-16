import React from "react";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

interface AgencyDashboardHeaderProps {
  appInactiveNotice: string | null;
  loading: boolean;
  activeTab: string;
  clientsCount: number;
  approvalsCount: number;
  unpaidInvoicesCount: number;
  proposalsCount?: number;
  onRefresh: () => void;
  onOpenNewClient: () => void;
  onTabChange: (tab: string) => void;
  onNavigateToMarketplace: () => void;
}

export const AgencyDashboardHeader: React.FC<AgencyDashboardHeaderProps> = ({
  appInactiveNotice,
  loading,
  activeTab,
  clientsCount,
  approvalsCount,
  unpaidInvoicesCount,
  onRefresh,
  onOpenNewClient,
  onTabChange,
  onNavigateToMarketplace,
}) => {
  return (
    <div className="space-y-3">
      {/* App Inactive Alert Banner */}
      {appInactiveNotice && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">{appInactiveNotice}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                يمكنك تفعيل تطبيق &ldquo;وكالة التسويق (Agency OS)&rdquo; من متجر التطبيقات للبدء في استخدام كافة الميزات.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-9 text-xs w-full sm:w-auto"
            onClick={onNavigateToMarketplace}
          >
            تفعيل التطبيق من المتجر
          </Button>
        </div>
      )}

      {/* 2026 Sleek Integrated Header & Sub-Navigation */}
      <div className="border-b border-border/60 pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-xs shrink-0">
              <Briefcase className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">إدارة الوكالة</h1>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20"
                >
                  محرك الوكالات الاحترافي 2026
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                متابعة العملاء، احتساب الأرباح ونماذج التسعير، وإدارة اعتمادات المحتوى
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-10 sm:h-9 font-bold px-3 shrink-0"
              title="تحديث البيانات"
            >
              <RefreshCw className={`size-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
              <span className="inline">تحديث</span>
            </Button>
            <Button
              onClick={onOpenNewClient}
              className="h-10 sm:h-9 font-bold shadow-md shadow-primary/20 flex-1 sm:flex-initial px-4 text-xs sm:text-sm"
            >
              <Plus className="size-4 ml-1.5" />
              إضافة عميل جديد
            </Button>
          </div>
        </div>

        {/* Minimal 2026 Integrated Tabs (Pill Bar with Horizontal Scroll & HIG >= 44px) */}
        <div className="relative -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => onTabChange("overview")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <BarChart3 className="size-4" />
              <span>نظرة عامة</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("proposals")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "proposals"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <FileText className="size-4" />
              <span>عروض وخطط النمو</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("clients")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "clients"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Users className="size-4" />
              <span>العملاء والأسعار</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "clients"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {clientsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("invoices")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "invoices"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Receipt className="size-4" />
              <span>الفواتير والأرباح</span>
              {unpaidInvoicesCount > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onTabChange("approvals")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "approvals"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>الموافقات</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === "approvals"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {approvalsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("suite")}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "suite"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
              }`}
            >
              <Briefcase className="size-4" />
              <span>الأدوات المتكاملة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
