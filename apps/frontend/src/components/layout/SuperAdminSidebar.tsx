import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Award, BarChart, BarChart3, Bell, Brain, Briefcase, Brush, Building, ChevronDown, ChevronUp, Clock, Code2, CreditCard, Database, DollarSign, Download, Facebook, Folder, GitBranch, Globe, Grid, HardDrive, Headphones, History, Image, Key, Layers, LayoutDashboard, MessageSquare, Palette, Play, Rocket, Server, Settings, Shield, Sliders, Tag, Ticket, Trophy, Users, Wallet, Wrench, Zap } from 'lucide-react';
import i18n from "../../i18n";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

export const drawerWidth = 280;
export const collapsedDrawerWidth = 88;

interface SuperAdminSidebarProps {
  mobileOpen: boolean; setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean; setIsCollapsed: (collapsed: boolean) => void;
  user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

export const getMenuGroups = (t: (key: string) => string) => [
  { title: t("superAdmin.sidebar.home"), icon: <LayoutDashboard className="size-5" />, items: [
    { text: t("superAdmin.sidebar.dashboard"), icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dashboard" },
  ]},
  { title: t("superAdmin.sidebar.companies"), icon: <Building2 className="size-5" />, items: [
    { text: t("superAdmin.sidebar.companies"), icon: <Building2 className="size-5" />, path: "/super-admin/companies-v2" },
    { text: t("superAdmin.sidebar.companyReports"), icon: <BarChart3 className="size-5" />, path: "/super-admin/companies-reports" },
    { text: t("superAdmin.sidebar.companyActivity"), icon: <Activity className="size-5" />, path: "/super-admin/company-activity" },
    { text: t("superAdmin.sidebar.followUp"), icon: <Bell className="size-5" />, path: "/super-admin/follow-up" },
  ]},
  { title: t("superAdmin.sidebar.whatsappPlatform"), icon: <MessageSquare className="size-5" />, items: [
    { text: t("superAdmin.sidebar.whatsappOverview"), icon: <MessageSquare className="size-5" />, path: "/super-admin/whatsapp" },
    { text: t("superAdmin.sidebar.whatsappCompanies"), icon: <Building2 className="size-5" />, path: "/super-admin/whatsapp/companies" },
    { text: t("superAdmin.sidebar.whatsappAutomations"), icon: <Sliders className="size-5" />, path: "/super-admin/whatsapp/automations" },
    { text: t("superAdmin.sidebar.whatsappLogs"), icon: <History className="size-5" />, path: "/super-admin/whatsapp/logs" },
  ]},
  { title: t("superAdmin.sidebar.subscriptionsBilling"), icon: <Briefcase className="size-5" />, items: [
    { text: t("superAdmin.sidebar.walletManagement"), icon: <Wallet className="size-5" />, path: "/super-admin/wallet-management" },
    { text: t("superAdmin.sidebar.pendingReceipts"), icon: <BarChart3 className="size-5" />, path: "/super-admin/pending-receipts" },
    { text: t("superAdmin.sidebar.marketplaceManagement"), icon: <Globe className="size-5" />, path: "/super-admin/marketplace-management" },
    { text: t("superAdmin.sidebar.marketplaceCoverage"), icon: <Shield className="size-5" />, path: "/super-admin/marketplace-coverage" },
    { text: t("superAdmin.sidebar.storefrontThemes"), icon: <Palette className="size-5" />, path: "/super-admin/storefront-themes" },
    { text: t("superAdmin.sidebar.customerInvoices"), icon: <BarChart3 className="size-5" />, path: "/super-admin/invoices" },
    { text: t("superAdmin.sidebar.customerPayments"), icon: <DollarSign className="size-5" />, path: "/super-admin/payments" },
    { text: t("superAdmin.sidebar.revenueAnalytics"), icon: <BarChart3 className="size-5" />, path: "/super-admin/billing-overview" },
    { text: t("superAdmin.sidebar.signupCoupons"), icon: <Tag className="size-5" />, path: "/super-admin/platform-signup-coupons" },
  ]},
  { title: t("superAdmin.evaluation.aiModels"), icon: <Brain className="size-5" />, items: [
    { text: t("superAdmin.sidebar.aiConsumption"), icon: <BarChart3 className="size-4" />, path: "/super-admin/ai-consumption" },
    { text: t("superAdmin.selfReview.sidebar"), icon: <Activity className="size-4" />, path: "/super-admin/self-review" },
    { text: t("superAdmin.sidebar.aiKeyManager"), icon: <Key className="size-4" />, path: "/super-admin/ai-key-manager" },
    { text: t("superAdmin.sidebar.aiKeyLogs"), icon: <History className="size-4" />, path: "/super-admin/ai-key-logs" },
    { text: t("superAdmin.sidebar.aiPlayground"), icon: <Play className="size-4" />, path: "/super-admin/ai-playground" },
    { text: t("superAdmin.evaluation.aiTemplates"), icon: <Layers className="size-4" />, path: "/super-admin/ai-templates" },
    { text: t("superAdmin.sidebar.productEmbeddings"), icon: <Database className="size-4" />, path: "/super-admin/product-embeddings" },
    { text: t("superAdmin.sidebar.visualSearchLogs"), icon: <Image className="size-4" />, path: "/super-admin/visual-search-logs" },
    { text: t("superAdmin.sidebar.aiHubSkills"), icon: <Sliders className="size-4" />, path: "/admin/ai-hub?tab=skills" },
    { text: t("superAdmin.sidebar.aiHubTools"), icon: <Wrench className="size-4" />, path: "/admin/ai-hub?tab=tools" },
    { text: t("superAdmin.sidebar.aiHubRag"), icon: <Database className="size-4" />, path: "/admin/ai-hub?tab=rag" },
    { text: t("superAdmin.sidebar.aiChat"), icon: <MessageSquare className="size-4" />, path: "/super-admin/ai-chat" },
    { text: t("superAdmin.sidebar.aiImageGenerator"), icon: <Image className="size-4" />, path: "/super-admin/ai-image-generator-settings" },
  ]},
  { title: t("superAdmin.sidebar.monitoring"), icon: <Activity className="size-5" />, items: [
    { text: t("superAdmin.sidebar.queueMonitor"), icon: <Activity className="size-5" />, path: "/super-admin/queue-monitor" },
    { text: t("superAdmin.sidebar.serverUsage"), icon: <HardDrive className="size-5" />, path: "/super-admin/server-usage" },
  ]},
  { title: t("superAdmin.sidebar.systemAdmin"), icon: <Sliders className="size-5" />, items: [
    { text: t("superAdmin.sidebar.systemSettings"), icon: <Settings className="size-5" />, path: "/super-admin/system-management" },
    { text: t("superAdmin.sidebar.appExplanations"), icon: <Globe className="size-5" />, path: "/super-admin/app-explanations" },
    { text: t("superAdmin.sidebar.facebookOAuth"), icon: <Facebook className="size-5" />, path: "/super-admin/facebook-oauth" },
    { text: t("superAdmin.sidebar.metaPixel"), icon: <Facebook className="size-5" />, path: "/super-admin/platform-site-meta-pixel" },
    { text: t("superAdmin.sidebar.homepageTemplates"), icon: <Globe className="size-5" />, path: "/super-admin/homepage-templates" },
    { text: t("superAdmin.sidebar.landingPages"), icon: <Globe className="size-5" />, path: "/super-admin/landing-pages" },
    { text: t("superAdmin.sidebar.productDesigns"), icon: <Palette className="size-5" />, path: "/super-admin/product-designs" },
    { text: t("superAdmin.sidebar.staffAccess"), icon: <Briefcase className="size-5" />, path: "/super-admin/staff-access" },
    { text: t("superAdmin.sidebar.superAdminUsers"), icon: <Shield className="size-5" />, path: "/super-admin/users" },
    { text: t("superAdmin.sidebar.partners"), icon: <Users className="size-5" />, path: "/super-admin/partner-management" },
  ]},
  { title: t("superAdmin.sidebar.marketingLinks"), icon: <Tag className="size-5" />, items: [
    { text: t("superAdmin.sidebar.marketingLinksCenter"), icon: <Globe className="size-5" />, path: "/super-admin/marketing-links" },
  ]},
  { title: t("superAdmin.sidebar.support"), icon: <Headphones className="size-5" />, items: [
    { text: t("superAdmin.sidebar.supportManagement"), icon: <Headphones className="size-5" />, path: "/admin/support" },
    { text: t("superAdmin.sidebar.allTickets"), icon: <Ticket className="size-5" />, path: "/admin/support" },
    { text: t("superAdmin.sidebar.supportSettings"), icon: <Settings className="size-5" />, path: "/super-admin/support-settings" },
  ]},
  { title: t("superAdmin.sidebar.devManagement"), icon: <Wrench className="size-5" />, items: [
    { text: t("superAdmin.sidebar.okrs"), icon: <Trophy className="size-5" />, path: "/super-admin/dev-goals" },
    { text: t("superAdmin.sidebar.goalAlignment"), icon: <GitBranch className="size-5" />, path: "/super-admin/dev-goals/alignment" },
    { text: t("superAdmin.sidebar.leaderboard"), icon: <Trophy className="size-5" />, path: "/super-admin/dev-leaderboard" },
    { text: t("superAdmin.evaluation.sidebar"), icon: <BarChart3 className="size-5" />, path: "/super-admin/dev-evaluations" },
    { text: t("superAdmin.sidebar.projectMap"), icon: <GitBranch className="size-5" />, path: "/super-admin/project-map" },
    { text: t("superAdmin.sidebar.dataImport"), icon: <Download className="size-5" />, path: "/super-admin/db-migration" },
    { text: t("superAdmin.sidebar.devDashboard"), icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dev-dashboard" },
    { text: t("superAdmin.sidebar.tasks"), icon: <BarChart3 className="size-5" />, path: "/super-admin/dev-tasks" },
    { text: t("superAdmin.sidebar.kanbanBoard"), icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dev-kanban" },
    { text: t("superAdmin.sidebar.activeTimers"), icon: <Clock className="size-5" />, path: "/super-admin/active-timers" },
    { text: t("superAdmin.sidebar.timerDashboard"), icon: <Play className="size-5" />, path: "/super-admin/timer-dashboard" },
    { text: t("superAdmin.sidebar.timeTracking"), icon: <History className="size-5" />, path: "/super-admin/time-tracking" },
    { text: t("superAdmin.sidebar.systemMonitoring"), icon: <Activity className="size-5" />, path: "/super-admin/system-monitoring" },
    { text: t("superAdmin.sidebar.devProjects"), icon: <Code2 className="size-5" />, path: "/super-admin/dev-projects" },
    { text: t("superAdmin.sidebar.devTeam"), icon: <Users className="size-5" />, path: "/super-admin/dev/team" },
    { text: t("superAdmin.sidebar.releases"), icon: <Rocket className="size-5" />, path: "/super-admin/dev-releases" },
    { text: t("superAdmin.sidebar.escalations"), icon: <Clock className="size-5" />, path: "/super-admin/dev/escalations" },
    { text: t("superAdmin.sidebar.taskSettings"), icon: <Settings className="size-5" />, path: "/super-admin/dev-settings" },
    { text: t("superAdmin.sidebar.taskApiKeys"), icon: <Key className="size-5" />, path: "/super-admin/dev-task-integrations" },
  ]},
];

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ mobileOpen, setMobileOpen, isCollapsed, setIsCollapsed, user }) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({ [i18n.t("superAdmin.sidebar.home")]: true });

  const handleGroupToggle = (groupTitle: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenGroups((p) => ({ ...p, [groupTitle]: !p[groupTitle] }));
  };

  const content = (
    <nav className="flex h-full flex-col overflow-x-hidden transition-all duration-300 bg-card text-foreground" role="navigation" aria-label={i18n.t("superAdmin.sidebar.brandName")} dir={i18n.dir()}>
      <div className="flex items-center gap-3 border-b border-border p-4">
        <img src="/logo.png" alt="MAX-P" className="size-10 object-contain rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)]" />
        {!isCollapsed && (
          <div>
            <p className="text-sm font-black leading-tight tracking-tight">{i18n.t("superAdmin.sidebar.brandName")}</p>
            <span className="text-xs font-medium text-muted-foreground">{i18n.t("superAdmin.sidebar.brandSubtitle")}</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {getMenuGroups(i18n.t.bind(i18n)).map((g) => {
          const isOpen = openGroups[g.title];
          const active = g.items.some((i) => matchesSuperAdminNavigationPath(location.pathname, i.path, location.search));
          return (
            <div key={g.title}>
              <button
                onClick={() => handleGroupToggle(g.title)}
                aria-expanded={!isCollapsed ? isOpen : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isCollapsed && "justify-center px-2",
                  active && !isOpen && "bg-primary/5 text-primary font-bold",
                  !active && "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className={cn("shrink-0", isCollapsed && "mx-auto")}>{g.icon}</span>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-right">{g.title}</span>
                    {isOpen ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
                  </>
                )}
              </button>
              {isOpen && !isCollapsed && (
                <div className="mr-3 mt-1 space-y-0.5">
                  {g.items.map((item) => {
                    const sel = matchesSuperAdminNavigationPath(location.pathname, item.path, location.search);
                    return (
                      <Link
                        key={item.text}
                        to={item.path}
                        onClick={() => mobileOpen && setMobileOpen(false)}
                        aria-current={sel ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-colors",
                          sel
                            ? "font-semibold bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.text}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border bg-muted/50 p-3">
        <div className={cn("flex w-full items-center gap-2 rounded-xl p-2 transition-colors hover:bg-accent", isCollapsed && "justify-center")}>
          <Avatar className="size-9 bg-primary text-sm font-bold">
            <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
                <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <Settings className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </div>
      </div>
    </nav>
  );

  const w = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[280px] p-0 bg-card">{content}</SheetContent>
      </Sheet>
      <div className="hidden shrink-0 overflow-hidden sm:block" style={{ width: w, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>{content}</div>
    </>
  );
};

export default SuperAdminSidebar;
