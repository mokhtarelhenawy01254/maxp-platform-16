import React, { useState } from "react";
import i18n from "../../i18n";
import {
  Box,
  Drawer,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Collapse,
  alpha,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  AttachMoney as PlansIcon,
  AccountBalanceWallet as WalletIcon,
  Psychology as ModelsIcon,
  Timeline as TimelineIcon,
  Web as WebIcon,
  SupportAgent as SupportIcon,
  ConfirmationNumber as TicketIcon,
  ExpandLess,
  ExpandMore,
  BusinessCenter as BusinessCenterIcon,
  LocalOffer as LocalOfferIcon,
  Analytics as AnalyticsIcon,
  Build as BuildIcon,
  MonitorHeart as MonitorHeartIcon,
  SettingsApplications as SettingsApplicationsIcon,
  HeadsetMic as HeadsetMicIcon,
  Facebook as FacebookIcon,
  EmojiEvents as TrophyIcon,
  AccountTree as AccountTreeIcon,
  Group as GroupIcon,
  AccessTime as ClockIcon,
  Storage as HardDriveIcon,
  Chat as ChatIcon,
  Shield as ShieldIcon,
  VpnKey as KeyIcon,
  PlayArrow as PlayArrowIcon,
} from "@mui/icons-material";
import {
  ArrowDownTrayIcon,
  UserGroupIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

interface SuperAdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  isDark: boolean;
  handleProfileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

export const menuGroups = [
  {
    title: "الرئيسية",
    icon: <DashboardIcon />,
    items: [
      {
        text: "لوحة التحكم",
        icon: <DashboardIcon />,
        path: "/super-admin/dashboard",
      },
      {
        text: "بوابة الفريق",
        icon: <GroupIcon />,
        path: "/super-admin/team-portal",
      },
      {
        text: "سجل التغييرات",
        icon: <TimelineIcon />,
        path: "/super-admin/changelog",
      },
    ],
  },
  {
    title: "إدارة الشركات",
    icon: <BusinessIcon />,
    items: [
      {
        text: "إدارة الشركات",
        icon: <BusinessIcon />,
        path: "/super-admin/companies",
      },
      {
        text: "إدارة الشركات V2",
        icon: <BusinessIcon />,
        path: "/super-admin/companies-v2",
      },
      {
        text: "تقارير الشركات",
        icon: <AssessmentIcon />,
        path: "/super-admin/companies-reports",
      },
    ],
  },
  {
    title: "واتساب المنصة",
    icon: <ChatIcon />,
    items: [
      {
        text: "نظرة عامة",
        icon: <ChatIcon />,
        path: "/super-admin/whatsapp",
      },
      {
        text: "شركات واتساب",
        icon: <BusinessIcon />,
        path: "/super-admin/whatsapp/companies",
      },
      {
        text: "أتمتة واتساب",
        icon: <SettingsApplicationsIcon />,
        path: "/super-admin/whatsapp/automations",
      },
      {
        text: "السجلات المركزية",
        icon: <TimelineIcon />,
        path: "/super-admin/whatsapp/logs",
      },
    ],
  },
  {
    title: "💰 إدارة الاشتراكات والفوترة",
    icon: <BusinessCenterIcon />,
    items: [
      {
        text: "إدارة المحافظ",
        icon: <WalletIcon />,
        path: "/super-admin/wallet-management",
      },
      {
        text: "مراجعة الإيصالات",
        icon: <AssessmentIcon />,
        path: "/super-admin/pending-receipts",
      },
      {
        text: "مركز إدارة الاشتراكات",
        icon: <PlansIcon />,
        path: "/super-admin/plans",
      },
      {
        text: "إدارة الماركت بليس",
        icon: <WebIcon />,
        path: "/super-admin/marketplace-management",
      },
      {
        text: "تغطية تطبيقات الشركات",
        icon: <ShieldIcon />,
        path: "/super-admin/marketplace-coverage",
      },
      {
        text: "تسعير قوالب المتجر",
        icon: <SwatchIcon style={{ width: 20, height: 20 }} />,
        path: "/super-admin/storefront-themes",
      },
      {
        text: "اشتراكات العملاء",
        icon: <LocalOfferIcon />,
        path: "/super-admin/subscriptions",
      },
      {
        text: "فواتير العملاء",
        icon: <AssessmentIcon />,
        path: "/super-admin/invoices",
      },
      {
        text: "مدفوعات العملاء",
        icon: <PlansIcon />,
        path: "/super-admin/payments",
      },
      {
        text: "إيرادات المنصة والتحليلات",
        icon: <AssessmentIcon />,
        path: "/super-admin/billing-overview",
      },
      {
        text: "كوبونات التسجيل",
        icon: <LocalOfferIcon />,
        path: "/super-admin/platform-signup-coupons",
      },
      {
        text: "التسجيل والتخصصات",
        icon: <SettingsApplicationsIcon />,
        path: "/super-admin/platform-onboarding",
      },
    ],
  },
  {
    title: "التقارير والتحليلات",
    icon: <AnalyticsIcon />,
    items: [
      {
        text: "التقارير والتحليلات",
        icon: <AssessmentIcon />,
        path: "/super-admin/reports",
      },
    ],
  },
  {
    title: "المتابعة والمراقبة",
    icon: <MonitorHeartIcon />,
    items: [
      {
        text: "مراقبة النظام (BullMQ)",
        icon: <MonitorHeartIcon />,
        path: "/super-admin/queue-monitor",
      },
      {
        text: "لوج المزودين",
        icon: <ModelsIcon />,
        path: "/super-admin/ai-providers/logs",
      },
      {
        text: "استهلاك السيرفر",
        icon: <HardDriveIcon />,
        path: "/super-admin/server-usage",
      },
    ],
  },
  {
    title: "إدارة النظام",
    icon: <SettingsApplicationsIcon />,
    items: [
      {
        text: "إدارة أنظمة النظام",
        icon: <SettingsIcon />,
        path: "/super-admin/system-management",
      },
      {
        text: "إعدادات Facebook OAuth",
        icon: <FacebookIcon />,
        path: "/super-admin/facebook-oauth",
      },
      {
        text: "Meta Pixel للموقع العام",
        icon: <FacebookIcon />,
        path: "/super-admin/platform-site-meta-pixel",
      },
      {
        text: "قوالب اللاندنج الرئيسية",
        icon: <WebIcon />,
        path: "/super-admin/homepage-templates",
      },
      {
        text: "كتالوج تصاميم المنتج",
        icon: <SwatchIcon style={{ width: 20, height: 20 }} />,
        path: "/super-admin/product-designs",
      },
      {
        text: "مفاتيح ومزودي النماذج",
        icon: <ModelsIcon />,
        path: "/super-admin/ai-providers",
      },
      {
        text: "AI Playground",
        icon: <PlayArrowIcon fontSize="small" />,
        path: "/super-admin/ai-playground",
      },
      {
        text: "إعدادات CEO Agent",
        icon: <SettingsApplicationsIcon />,
        path: "/super-admin/agent-config",
      },
      {
        text: "الوصول للشركات (Staff)",
        icon: <BusinessCenterIcon />,
        path: "/super-admin/staff-access",
      },
      {
        text: "إدارة مستخدمي السوبر أدمن",
        icon: <AdminIcon />,
        path: "/super-admin/users",
      },
      {
        text: "الشركاء (Partners)",
        icon: <GroupIcon />,
        path: "/super-admin/partner-management",
      },
    ],
  },
  {
    title: "روابط التسويق",
    icon: <LocalOfferIcon />,
    items: [
      {
        text: "مركز روابط اللاندنج",
        icon: <WebIcon />,
        path: "/super-admin/marketing-links",
      },
    ],
  },
  {
    title: "الدعم الفني",
    icon: <HeadsetMicIcon />,
    items: [
      {
        text: "إدارة الدعم الفني",
        icon: <SupportIcon />,
        path: "/admin/support",
      },
      { text: "جميع التذاكر", icon: <TicketIcon />, path: "/admin/support" },
    ],
  },
  {
    title: "🛠️ إدارة التطوير",
    icon: <BuildIcon />,
    items: [
      {
        text: "الأهداف والنتائج (OKRs)",
        icon: <TrophyIcon />,
        path: "/super-admin/dev-goals",
      },
      {
        text: "شجرة توافق الأهداف",
        icon: <AccountTreeIcon />,
        path: "/super-admin/dev-goals/alignment",
      },
      {
        text: "لوحة الأبطال",
        icon: <TrophyIcon />,
        path: "/super-admin/dev-leaderboard",
      },
      {
        text: i18n.t("superAdmin.evaluation.sidebar"),
        icon: <AssessmentIcon />,
        path: "/super-admin/dev-evaluations",
      },
      {
        text: "خريطة المشروع",
        icon: <AccountTreeIcon />,
        path: "/super-admin/project-map",
      },
      {
        text: "استيراد البيانات",
        icon: <ArrowDownTrayIcon />,
        path: "/super-admin/db-migration",
      },
      {
        text: "لوحة التحكم والتقارير",
        icon: <DashboardIcon />,
        path: "/super-admin/dev-dashboard",
      },
      {
        text: "المهام",
        icon: <AssessmentIcon />,
        path: "/super-admin/dev-tasks",
      },
      {
        text: "Kanban Board",
        icon: <DashboardIcon />,
        path: "/super-admin/dev-kanban",
      },
      {
        text: "المؤقتات النشطة",
        icon: <ClockIcon />,
        path: "/super-admin/active-timers",
      },
      {
        text: "لوحة التحكم - المؤقتات",
        icon: <PlayArrowIcon />,
        path: "/super-admin/timer-dashboard",
      },
      {
        text: "تتبع الوقت والإنتاجية",
        icon: <TimelineIcon />,
        path: "/super-admin/time-tracking",
      },
      {
        text: "مراقبة الموقتات",
        icon: <MonitorHeartIcon />,
        path: "/super-admin/system-monitoring",
      },
      {
        text: "إدارة مشاريع التطوير",
        icon: <CodeBracketIcon />,
        path: "/super-admin/dev-projects",
      },
      {
        text: "فريق التطوير",
        icon: <UserGroupIcon />,
        path: "/super-admin/dev/team",
      },
      {
        text: "إصدارات النظام",
        icon: <RocketLaunchIcon />,
        path: "/super-admin/dev-releases",
      },
      {
        text: "سجل التصعيدات",
        icon: <ClockIcon />,
        path: "/super-admin/dev/escalations",
      },
      {
        text: "إعدادات المهام",
        icon: <SettingsIcon />,
        path: "/super-admin/dev-settings",
      },
      {
        text: "مفاتيح API للمهام",
        icon: <KeyIcon />,
        path: "/super-admin/dev-task-integrations",
      },
    ],
  },
];

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  mobileOpen,
  setMobileOpen,
  isCollapsed,
  setIsCollapsed,
  user,
  isDark,
  handleProfileMenuOpen,
}) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    الرئيسية: true,
  });

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleGroupToggle = (groupTitle: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const sidebarColors = {
    bg: isDark ? "#0f172a" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    border: isDark ? alpha("#eceef2", 0.1) : "#e2e8f0",
    groupBgActive: isDark ? alpha("#3b82f6", 0.1) : alpha("#3b82f6", 0.05),
    groupTextActive: "#3b82f6",
    itemText: isDark ? "#94a3b8" : "#64748b",
    itemHoverBg: isDark ? alpha("#3b82f6", 0.08) : alpha("#3b82f6", 0.04),
    footerBg: isDark ? alpha("#1e293b", 0.5) : "#f8fafc",
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: sidebarColors.bg,
        color: sidebarColors.text,
        overflowX: "hidden",
        direction: "rtl",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        borderLeft: isDark ? "none" : "1px solid",
        borderColor: sidebarColors.border,
      }}
    >
      {/* Brand Section */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid",
          borderColor: sidebarColors.border,
          mb: 2,
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          }}
        >
          <AdminIcon sx={{ fontSize: 24 }} />
        </Avatar>
        {!isCollapsed && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: isDark ? "#f8fafc" : "#1e293b",
              }}
            >
              التحكم الذكي
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: isDark ? "#64748b" : "#94a3b8", fontWeight: 500 }}
            >
              السوبر أدمن
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation List */}
      <List
        sx={{
          flexGrow: 1,
          px: 1.5,
          "& .MuiListItem-root": { py: 0.5 },
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(isDark ? "#fff" : "#000", 0.1),
            borderRadius: "4px",
          },
        }}
      >
        {menuGroups.map((group) => {
          const isOpen = openGroups[group.title];
          const hasActiveItem = group.items.some(
            (item) => matchesSuperAdminNavigationPath(location.pathname, item.path),
          );

          return (
            <React.Fragment key={group.title}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleGroupToggle(group.title)}
                  sx={{
                    py: 1.2,
                    px: isCollapsed ? 2 : 2,
                    mb: 0.5,
                    borderRadius: "12px",
                    justifyContent: isCollapsed ? "center" : "initial",
                    bgcolor:
                      hasActiveItem && !isOpen
                        ? sidebarColors.groupBgActive
                        : "transparent",
                    color: hasActiveItem
                      ? sidebarColors.groupTextActive
                      : sidebarColors.itemText,
                    "&:hover": {
                      bgcolor: sidebarColors.itemHoverBg,
                      color: isDark ? "#f8fafc" : "#1e293b",
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isCollapsed ? 0 : 36,
                      color: hasActiveItem
                        ? sidebarColors.groupTextActive
                        : "inherit",
                    }}
                  >
                    {group.icon}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText
                        primary={group.title}
                        primaryTypographyProps={{
                          variant: "body2",
                          sx: {
                            fontWeight: hasActiveItem ? 700 : 500,
                            fontSize: "0.875rem",
                          },
                        }}
                      />
                      {isOpen ? (
                        <ExpandLess sx={{ fontSize: 18 }} />
                      ) : (
                        <ExpandMore sx={{ fontSize: 18 }} />
                      )}
                    </>
                  )}
                </ListItemButton>
              </ListItem>

              <Collapse
                in={!!isOpen && !isCollapsed}
                timeout="auto"
                unmountOnExit
              >
                <List component="div" disablePadding sx={{ mt: 0.5, mb: 1 }}>
                  {group.items.map((item) => {
                    const isSelected = matchesSuperAdminNavigationPath(location.pathname, item.path);
                    return (
                      <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
                        <ListItemButton
                          component={Link}
                          to={item.path}
                          onClick={() => mobileOpen && setMobileOpen(false)}
                          selected={isSelected}
                          sx={{
                            borderRadius: "10px",
                            py: 0.8,
                            pl: 4.5,
                            pr: 2,
                            mb: 0.25,
                            color: isSelected ? "#fff" : sidebarColors.itemText,
                            bgcolor: isSelected
                              ? "#3b82f6 !important"
                              : "transparent",
                            boxShadow: isSelected
                              ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                              : "none",
                            "&:hover": {
                              bgcolor: isSelected
                                ? "#2563eb !important"
                                : sidebarColors.itemHoverBg,
                              color: isSelected ? "#fff" : isDark ? "#f8fafc" : "#1e293b",
                              transform: "translateX(-4px)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              variant: "body2",
                              sx: {
                                fontSize: "0.8125rem",
                                fontWeight: isSelected ? 600 : 400,
                              },
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer Profile */}
      <Box
        sx={{
          p: 2,
          mt: "auto",
          borderTop: "1px solid",
          borderColor: sidebarColors.border,
          bgcolor: sidebarColors.footerBg,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            p: 1,
            borderRadius: "12px",
            "&:hover": { bgcolor: alpha(isDark ? "#fff" : "#000", 0.05) },
          }}
          onClick={handleProfileMenuOpen}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "#3b82f6",
              fontSize: "0.875rem",
              fontWeight: 700,
            }}
          >
            {user?.firstName?.charAt(0)}
          </Avatar>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, color: isDark ? "#f8fafc" : "#1e293b" }}
              >
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: sidebarColors.itemText, display: "block" }}
              >
                {user?.email}
              </Typography>
            </Box>
          )}
          {!isCollapsed && (
            <SettingsIcon
              sx={{ fontSize: 16, color: isDark ? "#475569" : "#94a3b8" }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  const currentDrawerWidth = isCollapsed ? collapsedDrawerWidth : drawerWidth;

    return (
      <Box
        component="nav"
        sx={{
        width: { xs: 0, sm: currentDrawerWidth },
          flexShrink: { sm: 0 },
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: currentDrawerWidth,
            border: "none",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflowX: "hidden",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default SuperAdminSidebar;
