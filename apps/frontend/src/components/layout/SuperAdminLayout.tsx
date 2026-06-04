import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  alpha,
} from "@mui/material";
import {
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { useTheme } from "../../hooks/useTheme";
import { apiClient } from "../../services/apiClient";
import ActiveUsersMonitor from "../ActiveUsersMonitor";
import SuperAdminSidebar, { menuGroups } from "./SuperAdminSidebar";
import SuperAdminHeader from "./SuperAdminHeader";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

type SuperAdminLayoutUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
} | null;

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  children,
  fullWidth = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const superAdminUser = user as SuperAdminLayoutUser;
  const { actualTheme } = useTheme();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  const isDark = actualTheme === "dark";

  // جلب عدد المستخدمين النشطين
  useEffect(() => {
    const fetchActiveUsersCount = async (): Promise<void> => {
      try {
        const requestConfig = {
          _skipErrorToast: true,
          _skipTransientRetry: true,
        };
        const response = await apiClient.get("/system/active-users", requestConfig);
        if (response.status === 200) {
          setActiveUsersCount(response.data.data?.count || 0);
        } else {
          if (response.status !== 401) {
            console.error("Error fetching active users:", response.status);
          }
          setActiveUsersCount(0);
        }
      } catch (error: unknown) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response === "object"
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (status !== 401) {
          console.error("Failed to fetch active users count", error);
        }
        setActiveUsersCount(0);
      }
    };

    if (superAdminUser?.role === "SUPER_ADMIN" && !isLoading) {
      fetchActiveUsersCount();
      const interval = setInterval(fetchActiveUsersCount, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [superAdminUser?.role, isLoading]);

  // التحقق من صلاحيات السوبر أدمن
  useEffect(() => {
    if (isLoading) return undefined;

    if (!superAdminUser || superAdminUser.role !== "SUPER_ADMIN") {
      const timer = setTimeout(() => {
        navigate("/auth/login");
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [superAdminUser, isLoading, navigate]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: isDark ? "#0f172a" : "#f8fafc" }}
      >
        <Typography sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          جاري التحميل...
        </Typography>
      </Box>
    );
  }

  if (!superAdminUser || superAdminUser.role !== "SUPER_ADMIN") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          bgcolor: isDark ? "#0f172a" : "#f8fafc",
          color: isDark ? "#f1f5f9" : "#1e293b",
          p: 4,
          direction: "rtl"
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ color: "#ef4444", fontWeight: 700 }}>
          ⚠️ غير مصرح
        </Typography>
        <Typography variant="h6" gutterBottom sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          هذه الصفحة مخصصة للسوبر أدمن فقط
        </Typography>
        <Typography variant="body2" sx={{ mt: 3, color: isDark ? "#64748b" : "#94a3b8" }}>
          سيتم تحويلك لصفحة تسجيل الدخول خلال 3 ثواني...
        </Typography>
      </Box>
    );
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
    handleProfileMenuClose();
  };

  const currentDrawerWidth = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  const currentTitle = menuGroups.find((g) =>
    g.items.some(
      (i) => matchesSuperAdminNavigationPath(location.pathname, i.path),
    ),
  )?.title || "لوحة التحكم";

  return (
    <Box
      sx={{
        display: "flex",
        direction: "rtl",
        minHeight: "100vh",
        bgcolor: isDark ? "#0f172a" : "#f8fafc",
        overflowX: "hidden",
      }}
    >
      <SuperAdminHeader
        currentDrawerWidth={currentDrawerWidth}
        isDark={isDark}
        isCollapsed={isCollapsed}
        onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        onMobileMenuOpen={() => setMobileOpen(true)}
        activeUsersCount={activeUsersCount}
        onShowActiveUsers={() => setShowActiveUsers(true)}
        user={superAdminUser}
        handleProfileMenuOpen={handleProfileMenuOpen}
        title={currentTitle}
      />

      <SuperAdminSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={superAdminUser}
        isDark={isDark}
        handleProfileMenuOpen={handleProfileMenuOpen}
      />

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            borderRadius: "12px",
            bgcolor: isDark ? "#1e293b" : "#fff",
            color: isDark ? "#f1f5f9" : "#1e293b",
            boxShadow: isDark
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            border: "1px solid",
            borderColor: isDark ? alpha("#fff", 0.1) : "#e2e8f0",
          },
        }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: "#ef4444", fontWeight: 600 }}>
          <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
          تسجيل الخروج
        </MenuItem>
      </Menu>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: fullWidth ? 0 : { xs: 2, sm: 4 },
          width: { xs: "100%", sm: `calc(100% - ${currentDrawerWidth}px)` },
          minWidth: 0,
          mt: 8,
          overflowX: "hidden",
          transition: "margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: fullWidth ? "none" : "1400px",
            mx: fullWidth ? 0 : "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      {showActiveUsers && (
        <ActiveUsersMonitor
          isOpen={showActiveUsers}
          onClose={() => setShowActiveUsers(false)}
        />
      )}
    </Box>
  );
};

export default SuperAdminLayout;
