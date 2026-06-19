import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, BarChart3, Settings, Shield, DollarSign, Wallet, Brain,
  History, Globe, Headphones, Ticket, ChevronUp, ChevronDown, Briefcase, Tag, TrendingUp,
  Wrench, Activity, Sliders, Facebook, Trophy, GitBranch, Users, Clock, HardDrive,
  MessageSquare, Key, Play, Download, Code2, Rocket, Palette, LogOut, Database,
} from "lucide-react";
import i18n from "../../i18n";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

interface SuperAdminSidebarProps {
  mobileOpen: boolean; setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean; setIsCollapsed: (collapsed: boolean) => void;
  user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  isDark: boolean;
  handleProfileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

export const menuGroups = [
  { title: i18n.t("superAdmin.sidebar.home"), icon: <LayoutDashboard className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.dashboard"), icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dashboard" },
    { text: i18n.t("superAdmin.sidebar.changelog"), icon: <History className="size-5" />, path: "/super-admin/changelog" },
  ]},
  { title: i18n.t("superAdmin.sidebar.companies"), icon: <Building2 className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.companies"), icon: <Building2 className="size-5" />, path: "/super-admin/companies" },
    { text: i18n.t("superAdmin.sidebar.companiesV2"), icon: <Building2 className="size-5" />, path: "/super-admin/companies-v2" },
    { text: i18n.t("superAdmin.sidebar.companyReports"), icon: <BarChart3 className="size-5" />, path: "/super-admin/companies-reports" },
  ]},
  { title: i18n.t("superAdmin.sidebar.whatsappPlatform"), icon: <MessageSquare className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.whatsappOverview"), icon: <MessageSquare className="size-5" />, path: "/super-admin/whatsapp" },
    { text: i18n.t("superAdmin.sidebar.whatsappCompanies"), icon: <Building2 className="size-5" />, path: "/super-admin/whatsapp/companies" },
    { text: i18n.t("superAdmin.sidebar.whatsappAutomations"), icon: <Sliders className="size-5" />, path: "/super-admin/whatsapp/automations" },
    { text: i18n.t("superAdmin.sidebar.whatsappLogs"), icon: <History className="size-5" />, path: "/super-admin/whatsapp/logs" },
  ]},
  { title: i18n.t("superAdmin.sidebar.subscriptionsBilling"), icon: <Briefcase className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.walletManagement"), icon: <Wallet className="size-5" />, path: "/super-admin/wallet-management" },
    { text: i18n.t("superAdmin.sidebar.pendingReceipts"), icon: <BarChart3 className="size-5" />, path: "/super-admin/pending-receipts" },
    { text: i18n.t("superAdmin.sidebar.marketplaceManagement"), icon: <Globe className="size-5" />, path: "/super-admin/marketplace-management" },
    { text: i18n.t("superAdmin.sidebar.marketplaceCoverage"), icon: <Shield className="size-5" />, path: "/super-admin/marketplace-coverage" },
    { text: i18n.t("superAdmin.sidebar.storefrontThemes"), icon: <Palette className="size-5" />, path: "/super-admin/storefront-themes" },
    { text: i18n.t("superAdmin.sidebar.appPricingSheet"), icon: <DollarSign className="size-5" />, path: "/super-admin/app-pricing" },
    { text: i18n.t("superAdmin.sidebar.customerSubscriptions"), icon: <Tag className="size-5" />, path: "/super-admin/subscriptions" },
    { text: i18n.t("superAdmin.sidebar.customerInvoices"), icon: <BarChart3 className="size-5" />, path: "/super-admin/invoices" },
    { text: i18n.t("superAdmin.sidebar.customerPayments"), icon: <DollarSign className="size-5" />, path: "/super-admin/payments" },
    { text: i18n.t("superAdmin.sidebar.revenueAnalytics"), icon: <BarChart3 className="size-5" />, path: "/super-admin/billing-overview" },
    { text: i18n.t("superAdmin.sidebar.signupCoupons"), icon: <Tag className="size-5" />, path: "/super-admin/platform-signup-coupons" },
  ]},
  { title: i18n.t("superAdmin.sidebar.reportsAnalytics"), icon: <TrendingUp className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.reportsAnalytics"), icon: <BarChart3 className="size-5" />, path: "/super-admin/reports" },
  ]},
  { title: i18n.t("superAdmin.evaluation.aiModels"), icon: <Brain className="size-5" />, items: [
    { text: i18n.t("superAdmin.evaluation.aiProviders"), icon: <Brain className="size-5" />, path: "/super-admin/ai-providers" },
    { text: "AI Playground", icon: <Play className="size-4" />, path: "/super-admin/ai-playground" },
    { text: i18n.t("superAdmin.evaluation.ceoAgentSettings"), icon: <Sliders className="size-5" />, path: "/super-admin/agent-config" },
    { text: i18n.t("superAdmin.evaluation.providerLogs"), icon: <History className="size-5" />, path: "/super-admin/ai-providers/logs" },
    { text: "تضمينات المنتجات", icon: <Database className="size-4" />, path: "/super-admin/product-embeddings" },
  ]},
  { title: i18n.t("superAdmin.sidebar.monitoring"), icon: <Activity className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.queueMonitor"), icon: <Activity className="size-5" />, path: "/super-admin/queue-monitor" },
    { text: i18n.t("superAdmin.sidebar.serverUsage"), icon: <HardDrive className="size-5" />, path: "/super-admin/server-usage" },
  ]},
  { title: i18n.t("superAdmin.sidebar.systemAdmin"), icon: <Sliders className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.systemSettings"), icon: <Settings className="size-5" />, path: "/super-admin/system-management" },
    { text: i18n.t("superAdmin.sidebar.appExplanations"), icon: <Globe className="size-5" />, path: "/super-admin/app-explanations" },
    { text: i18n.t("superAdmin.sidebar.facebookOAuth"), icon: <Facebook className="size-5" />, path: "/super-admin/facebook-oauth" },
    { text: i18n.t("superAdmin.sidebar.metaPixel"), icon: <Facebook className="size-5" />, path: "/super-admin/platform-site-meta-pixel" },
    { text: i18n.t("superAdmin.sidebar.homepageTemplates"), icon: <Globe className="size-5" />, path: "/super-admin/homepage-templates" },
    { text: "صفحات اللاندينغ /lp", icon: <Globe className="size-5" />, path: "/super-admin/landing-pages" },
    { text: i18n.t("superAdmin.sidebar.productDesigns"), icon: <Palette className="size-5" />, path: "/super-admin/product-designs" },
    { text: i18n.t("superAdmin.sidebar.staffAccess"), icon: <Briefcase className="size-5" />, path: "/super-admin/staff-access" },
    { text: i18n.t("superAdmin.sidebar.superAdminUsers"), icon: <Shield className="size-5" />, path: "/super-admin/users" },
    { text: i18n.t("superAdmin.sidebar.partners"), icon: <Users className="size-5" />, path: "/super-admin/partner-management" },
  ]},
  { title: i18n.t("superAdmin.sidebar.marketingLinks"), icon: <Tag className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.marketingLinksCenter"), icon: <Globe className="size-5" />, path: "/super-admin/marketing-links" },
  ]},
  { title: i18n.t("superAdmin.sidebar.support"), icon: <Headphones className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.supportManagement"), icon: <Headphones className="size-5" />, path: "/admin/support" },
    { text: i18n.t("superAdmin.sidebar.allTickets"), icon: <Ticket className="size-5" />, path: "/admin/support" },
  ]},
  { title: i18n.t("superAdmin.sidebar.devManagement"), icon: <Wrench className="size-5" />, items: [
    { text: i18n.t("superAdmin.sidebar.okrs"), icon: <Trophy className="size-5" />, path: "/super-admin/dev-goals" },
    { text: i18n.t("superAdmin.sidebar.goalAlignment"), icon: <GitBranch className="size-5" />, path: "/super-admin/dev-goals/alignment" },
    { text: i18n.t("superAdmin.sidebar.leaderboard"), icon: <Trophy className="size-5" />, path: "/super-admin/dev-leaderboard" },
    { text: i18n.t("superAdmin.evaluation.sidebar"), icon: <BarChart3 className="size-5" />, path: "/super-admin/dev-evaluations" },
    { text: i18n.t("superAdmin.sidebar.projectMap"), icon: <GitBranch className="size-5" />, path: "/super-admin/project-map" },
    { text: i18n.t("superAdmin.sidebar.dataImport"), icon: <Download className="size-5" />, path: "/super-admin/db-migration" },
    { text: i18n.t("superAdmin.sidebar.devDashboard"), icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dev-dashboard" },
    { text: i18n.t("superAdmin.sidebar.tasks"), icon: <BarChart3 className="size-5" />, path: "/super-admin/dev-tasks" },
    { text: "Kanban Board", icon: <LayoutDashboard className="size-5" />, path: "/super-admin/dev-kanban" },
    { text: i18n.t("superAdmin.sidebar.activeTimers"), icon: <Clock className="size-5" />, path: "/super-admin/active-timers" },
    { text: i18n.t("superAdmin.sidebar.timerDashboard"), icon: <Play className="size-5" />, path: "/super-admin/timer-dashboard" },
    { text: i18n.t("superAdmin.sidebar.timeTracking"), icon: <History className="size-5" />, path: "/super-admin/time-tracking" },
    { text: i18n.t("superAdmin.sidebar.systemMonitoring"), icon: <Activity className="size-5" />, path: "/super-admin/system-monitoring" },
    { text: i18n.t("superAdmin.sidebar.devProjects"), icon: <Code2 className="size-5" />, path: "/super-admin/dev-projects" },
    { text: i18n.t("superAdmin.sidebar.devTeam"), icon: <Users className="size-5" />, path: "/super-admin/dev/team" },
    { text: i18n.t("superAdmin.sidebar.releases"), icon: <Rocket className="size-5" />, path: "/super-admin/dev-releases" },
    { text: i18n.t("superAdmin.sidebar.escalations"), icon: <Clock className="size-5" />, path: "/super-admin/dev/escalations" },
    { text: i18n.t("superAdmin.sidebar.taskSettings"), icon: <Settings className="size-5" />, path: "/super-admin/dev-settings" },
    { text: i18n.t("superAdmin.sidebar.taskApiKeys"), icon: <Key className="size-5" />, path: "/super-admin/dev-task-integrations" },
  ]},
];

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ mobileOpen, setMobileOpen, isCollapsed, setIsCollapsed, user, isDark, handleProfileMenuOpen }) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({ [i18n.t("superAdmin.sidebar.home")]: true });

  const handleGroupToggle = (groupTitle: string) => { if (isCollapsed) setIsCollapsed(false); setOpenGroups((p) => ({ ...p, [groupTitle]: !p[groupTitle] })); };

  const s = { bg: isDark ? "#0f172a" : "#fff", text: isDark ? "#f1f5f9" : "#1e293b", border: isDark ? "rgba(236,238,242,0.1)" : "#e2e8f0", groupActive: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.05)", groupText: "#3b82f6", itemText: isDark ? "#94a3b8" : "#64748b", itemHover: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)", footerBg: isDark ? "rgba(30,41,59,0.5)" : "#f8fafc" };

  const content = (
    <div className={cn("flex h-full flex-col overflow-x-hidden transition-all duration-300", isDark ? "text-[#f1f5f9]" : "text-[#1e293b]")} style={{ backgroundColor: s.bg, direction: "rtl" }}>
      <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: s.border }}>
        <div className="flex size-10 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}><Shield className="size-5 text-white" /></div>
        {!isCollapsed && <div><p className="text-sm font-black leading-tight tracking-tight">{i18n.t("superAdmin.sidebar.brandName")}</p><span className="text-xs font-medium" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{i18n.t("superAdmin.sidebar.brandSubtitle")}</span></div>}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {menuGroups.map((g) => { const isOpen = openGroups[g.title]; const active = g.items.some((i) => matchesSuperAdminNavigationPath(location.pathname, i.path)); return (
          <div key={g.title}>
            <button onClick={() => handleGroupToggle(g.title)} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all", isCollapsed && "justify-center px-2", active && !isOpen ? "font-bold" : "font-medium")}
              style={{ backgroundColor: active && !isOpen ? s.groupActive : "transparent", color: active ? s.groupText : s.itemText }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = s.itemHover; e.currentTarget.style.color = isDark ? "#f8fafc" : "#1e293b"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = s.itemText; } }}>
              <span className={cn("shrink-0", isCollapsed && "mx-auto")}>{g.icon}</span>
              {!isCollapsed && <><span className="flex-1 text-right">{g.title}</span>{isOpen ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}</>}
            </button>
            {isOpen && !isCollapsed && <div className="mr-3 mt-1 space-y-0.5">{g.items.map((item) => { const sel = matchesSuperAdminNavigationPath(location.pathname, item.path); return (
              <Link key={item.text} to={item.path} onClick={() => mobileOpen && setMobileOpen(false)}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-all", sel ? "font-semibold text-white shadow-lg" : "hover:-translate-x-0.5")}
                style={{ color: sel ? "#fff" : s.itemText, backgroundColor: sel ? "#3b82f6 !important" : "transparent", boxShadow: sel ? "0 4px 12px rgba(59,130,246,0.4)" : "none" }}
                onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = s.itemHover; e.currentTarget.style.color = isDark ? "#f8fafc" : "#1e293b"; } }}
                onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = s.itemText; } }}>
                <span className="shrink-0">{item.icon}</span><span>{item.text}</span>
              </Link>); })}</div>}
          </div>); })}
      </div>
      <div className="mt-auto border-t p-3" style={{ borderColor: s.border, backgroundColor: s.footerBg }}>
        <button onClick={handleProfileMenuOpen} className={cn("flex w-full items-center gap-2 rounded-xl p-2 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-black/5")}>
          <Avatar className="size-9 bg-[#3b82f6] text-sm font-bold"><AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback></Avatar>
          {!isCollapsed && <><div className="min-w-0 flex-1 text-right"><p className="truncate text-sm font-semibold" style={{ color: isDark ? "#f8fafc" : "#1e293b" }}>{user?.firstName} {user?.lastName}</p><span className="block truncate text-xs" style={{ color: s.itemText }}>{user?.email}</span></div><Settings className="size-4 shrink-0" style={{ color: isDark ? "#475569" : "#94a3b8" }} /></>}
        </button>
      </div>
    </div>
  );

  const w = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  return (<>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-[280px] p-0">{content}</SheetContent></Sheet>
    <div className="hidden shrink-0 overflow-hidden sm:block" style={{ width: w, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>{content}</div>
  </>);
};

export default SuperAdminSidebar;
