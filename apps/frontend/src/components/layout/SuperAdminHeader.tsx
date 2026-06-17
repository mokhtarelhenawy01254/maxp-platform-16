import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, Lightbulb, LogOut, Search, X } from "lucide-react";

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
  isDark: boolean;
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
  isDark,
  isCollapsed,
  onCollapseToggle,
  onMobileMenuOpen,
  activeUsersCount,
  onShowActiveUsers,
  user,
  title,
}) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [headerSearch, setHeaderSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isDevTasksPage = location.pathname === "/super-admin/dev-tasks";

  useEffect(() => {
    if (!isDevTasksPage) {
      setHeaderSearch("");
    }
  }, [isDevTasksPage]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleHeaderSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHeaderSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set("search", value);
      else params.delete("search");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      navigate(newUrl, { replace: true });
    }, 300);
  }, [navigate]);

  const handleHeaderSearchClear = useCallback(() => {
    setHeaderSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams(window.location.search);
    params.delete("search");
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    navigate(newUrl, { replace: true });
  }, [navigate]);

  return (
    <header
      className={cn(
        "fixed top-0 z-40 flex h-16 items-center border-b backdrop-blur-lg transition-all duration-300",
        isDark ? "bg-[#0f172a]/80 border-white/10" : "bg-white/80 border-gray-200"
      )}
      style={{ right: 0, width: `calc(100% - ${currentDrawerWidth}px)` }}
    >
      <div className="flex w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onMobileMenuOpen} className="sm:hidden"><Menu className="size-5 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon" onClick={onCollapseToggle} className="hidden sm:flex"><Menu className="size-5 text-muted-foreground" /></Button>
          <h1 className="text-base font-bold tracking-tight truncate max-w-[120px] lg:max-w-[200px]">{title}</h1>
          <div className="hidden md:block"><GlobalTimer /></div>
          {isDevTasksPage && (
            <div className="relative hidden md:block mr-3">
              <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={headerSearch}
                onChange={handleHeaderSearchChange}
                placeholder={t("tasks.searchPlaceholder") || "بحث في المهام..."}
                className={cn(
                  "h-9 w-64 rounded-xl border bg-gray-100 dark:bg-[#1e293b] border-transparent",
                  "focus:border-blue-400 focus:bg-white dark:focus:border-blue-500/50 dark:focus:bg-[#1e293b]",
                  "pl-4 pr-9 text-sm outline-none placeholder:text-muted-foreground",
                  "transition-all duration-200",
                  isDark ? "text-white" : "text-gray-900"
                )}
              />
              {headerSearch && (
                <button
                  onClick={handleHeaderSearchClear}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <GlobalSearch />
        <div className="flex items-center gap-1 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onShowActiveUsers} className={cn("relative", activeUsersCount > 0 ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-muted-foreground")}>
                  <Lightbulb className={cn("size-6", activeUsersCount > 0 && "animate-pulse")} />
                  {activeUsersCount > 0 && <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[0.6rem] font-bold text-white">{activeUsersCount}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("superAdmin.activeUsers")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="border-2 border-transparent p-0.5 hover:border-primary">
                <Avatar className="size-8 bg-primary font-bold"><AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]" style={{ backgroundColor: isDark ? "#1e293b" : "#fff", color: isDark ? "#f1f5f9" : "#1e293b", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0" }}>
              <DropdownMenuItem onClick={() => { logout(); navigate("/auth/login"); }} className="font-semibold text-destructive"><LogOut className="ml-2 size-4" />{t("superAdmin.logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
