import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, Lightbulb, LogOut, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "../../hooks/useAuthSimple";
import ThemeToggle from "../ui/theme-toggle";
import AppUpdateIndicator from "../common/AppUpdateIndicator";
import GlobalTimer from "../common/GlobalTimer";
import GlobalSearch from "./GlobalSearch";
import { cn } from "@/lib/utils";

type SuperAdminHeaderUser = { firstName?: string | null } | null;

interface SuperAdminHeaderProps {
  currentDrawerWidth: number;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  onMobileMenuOpen: () => void;
  activeUsersCount: number;
  onShowActiveUsers: () => void;
  user: SuperAdminHeaderUser;
  title: string;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  currentDrawerWidth,
  onCollapseToggle,
  onMobileMenuOpen,
  activeUsersCount,
  onShowActiveUsers,
  user,
  title,
}) => {
  const { t, i18n } = useTranslation();
  const { logout, user: authUser, switchCompany } = useAuth();
  const navigate = useNavigate();

  const handleGoToHQ = async () => {
    const targetHqCompanyId = "cmopgxu3a07i4jujj6f1oh32h";
    if (authUser?.company?.id !== targetHqCompanyId) {
      try {
        await switchCompany(targetHqCompanyId);
      } catch {
        // Fallback to direct navigation if switch fails
      }
    }
    navigate("/company-dashboard");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center border-b backdrop-blur-xl bg-background/75 border-border/50 shrink-0 transition-all duration-300",
      )}
    >
      <div className="flex w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onMobileMenuOpen} className="sm:hidden"><Menu className="size-5 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon" onClick={onCollapseToggle} className="hidden sm:flex" aria-label={t("superAdmin.toggleSidebar")}><Menu className="size-5 text-muted-foreground" /></Button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold tracking-tight truncate max-w-[140px] lg:max-w-[220px] text-foreground">{title}</h1>
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>الإنتاج v6.4 • نشط</span>
            </div>
          </div>
          <div className="hidden md:block"><GlobalTimer /></div>
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleGoToHQ()}
            className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-sm"
            title="التبديل إلى كوكبيت الشركة التشغيلية (الطلبات، المنتجات، الميديا باير، المحادثات)"
          >
            <Building2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">كوكبيت الشركة (HQ)</span>
            <span className="sm:hidden">الشركة</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onShowActiveUsers}
                  aria-label={t("superAdmin.activeUsers")}
                  className={cn("relative", activeUsersCount > 0 ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-muted-foreground")}
                >
                  <Lightbulb className={cn("size-5", activeUsersCount > 0 && "animate-pulse")} />
                  {activeUsersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[0.6rem] font-bold text-white shadow-sm">{activeUsersCount}</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("superAdmin.activeUsers")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AppUpdateIndicator />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="relative border border-transparent p-0.5 hover:border-primary/40 rounded-full cursor-pointer transition-all" aria-label={t("superAdmin.profileMenu")}>
              <Avatar className="size-8 bg-primary font-bold shadow-sm"><AvatarFallback>{user?.firstName?.charAt(0) || "M"}</AvatarFallback></Avatar>
              <span className="absolute bottom-0 inset-inline-end-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[190px]">
              <DropdownMenuItem onClick={() => void handleGoToHQ()} className="font-semibold text-foreground cursor-pointer">
                <Building2 className="ml-2 size-4 text-indigo-600 dark:text-indigo-400" />
                كوكبيت عمليات الشركة (HQ)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { logout(); navigate("/auth/login"); }} className="font-semibold text-destructive cursor-pointer">
                <LogOut className="ml-2 size-4" />
                {t("superAdmin.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
