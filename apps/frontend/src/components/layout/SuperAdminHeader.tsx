import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Badge,
  Avatar,
  alpha,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import ThemeToggle from "../ui/theme-toggle";
import GlobalTimer from "../common/GlobalTimer";

type SuperAdminHeaderUser = {
  firstName?: string | null;
} | null;

interface SuperAdminHeaderProps {
  currentDrawerWidth: number;
  isDark: boolean;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  onMobileMenuOpen: () => void;
  activeUsersCount: number;
  onShowActiveUsers: () => void;
  user: SuperAdminHeaderUser;
  handleProfileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  title: string;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  currentDrawerWidth,
  isDark,
  isCollapsed,
  onCollapseToggle,
  onMobileMenuOpen,
  activeUsersCount,
  onShowActiveUsers,
  user,
  handleProfileMenuOpen,
  title,
}) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
        mr: { sm: `${currentDrawerWidth}px` },
        bgcolor: isDark ? alpha("#0f172a", 0.8) : alpha("#fff", 0.8),
        backdropFilter: "blur(12px)",
        color: isDark ? "#f1f5f9" : "#1e293b",
        boxShadow: "none",
        direction: "rtl",
        borderBottom: "1px solid",
        borderColor: isDark ? alpha("#eceef2", 0.1) : "#e2e8f0",
        transition: (theme) =>
          theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={onMobileMenuOpen}
            aria-label="فتح القائمة الجانبية"
            sx={{
              display: { xs: "flex", sm: "none" },
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            onClick={onCollapseToggle}
            aria-label={
              isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"
            }
            sx={{
              display: { xs: "none", sm: "flex" },
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </Typography>
          <Box sx={{ ml: 2, display: { xs: "none", md: "block" } }}>
            <GlobalTimer />
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={onShowActiveUsers}
            aria-label="عرض المستخدمين النشطين"
            sx={{
              color:
                activeUsersCount > 0
                  ? "#10b981"
                  : isDark
                    ? "#94a3b8"
                    : "#64748b",
              position: "relative",
              "&:hover": {
                bgcolor: isDark
                  ? alpha("#10b981", 0.1)
                  : alpha("#10b981", 0.05),
              },
            }}
            title="المستخدمون النشطون"
          >
            <Badge
              badgeContent={activeUsersCount}
              color="success"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.65rem",
                  height: "18px",
                  minWidth: "18px",
                  fontWeight: 700,
                },
              }}
            >
              <LightbulbIcon
                sx={{
                  fontSize: 24,
                  animation:
                    activeUsersCount > 0
                      ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                      : "none",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                }}
              />
            </Badge>
          </IconButton>
          <ThemeToggle />
          <IconButton
            size="large"
            onClick={handleProfileMenuOpen}
            aria-label="فتح قائمة الحساب"
            sx={{
              p: 0.5,
              border: "2px solid transparent",
              "&:hover": { borderColor: "#3b82f6" },
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "#3b82f6",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {user?.firstName?.charAt(0)}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default SuperAdminHeader;
