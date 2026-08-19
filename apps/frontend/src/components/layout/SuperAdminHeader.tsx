import { useTranslation } from 'react-i18next';
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lightbulb, LogOut, Menu, Star } from 'lucide-react';

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
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "fixed top-0 z-40 flex h-16 items-center border-b backdrop-blur-lg transition-all duration-300 bg-background/80 border-border",
      )}
      style={i18n.dir() === "rtl" ? { left: 0, width: `calc(100% - ${currentDrawerWidth}px)` } : { right: 0, width: `calc(100% - ${currentDrawerWidth}px)` }}
    >
      <div className="flex w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onMobileMenuOpen} className="sm:hidden"><Menu className="size-5 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon" onClick={onCollapseToggle} className="hidden sm:flex" aria-label={t("superAdmin.toggleSidebar")}><Menu className="size-5 text-muted-foreground" /></Button>
          <h1 className="text-base font-bold tracking-tight truncate max-w-[120px] lg:max-w-[200px]">{title}</h1>
          <div className="hidden md:block"><GlobalTimer /></div>
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
                  <Lightbulb className={cn("size-6", activeUsersCount > 0 && "animate-pulse")} />
                  {activeUsersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[0.6rem] font-bold text-white">{activeUsersCount}</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("superAdmin.activeUsers")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="border-2 border-transparent p-0.5 hover:border-primary" aria-label={t("superAdmin.profileMenu")}>
                <Avatar className="size-8 bg-primary font-bold"><AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => { logout(); navigate("/auth/login"); }} className="font-semibold text-destructive"><LogOut className="ml-2 size-4" />{t("superAdmin.logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
