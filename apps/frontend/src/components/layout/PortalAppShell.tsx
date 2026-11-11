import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, LogOut, Menu, User, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { resolveBrandingLogoUrl, type CompanyBranding } from "../../hooks/useCompanyBranding";
import { PortalInstallBanner } from "../common/PortalInstallBanner";

export interface PortalNavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  badge?: number | string;
}

export interface PortalAppShellProps {
  portalTitle: string;
  portalSubtitle?: string;
  homePath: string;
  userName?: string;
  userSubtitle?: string;
  navItems: PortalNavItem[];
  branding: CompanyBranding;
  portalType: string;
  logoutLabel?: string;
  onLogout: () => void;
  headerActions?: React.ReactNode;
  footerContent?: React.ReactNode;
  children: React.ReactNode;
}

export const PortalAppShell: React.FC<PortalAppShellProps> = ({
  portalTitle,
  portalSubtitle,
  homePath,
  userName,
  userSubtitle,
  navItems,
  branding,
  portalType,
  logoutLabel = "تسجيل الخروج",
  onLogout,
  headerActions,
  footerContent,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const accentColor = branding.accent?.trim() || "#4f46e5";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;
  const displayBrandName = branding.name?.trim() || portalTitle;
  const displaySubtitle = branding.name?.trim() ? portalTitle : portalSubtitle;
  const monogramChar = displayBrandName.trim().charAt(0) || "P";
  const showMobileBottomNav = navItems.length > 0 && navItems.length <= 5;
  const isNavActive = (itemPath: string) =>
    location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const renderBrandAvatar = (sizeClass = "size-8") =>
    resolvedLogo ? (
      <img
        src={resolvedLogo}
        alt={displayBrandName}
        onError={() => setLogoError(true)}
        className={cn(sizeClass, "shrink-0 rounded-lg border border-border/60 bg-background object-cover")}
      />
    ) : (
      <span
        className={cn(sizeClass, "flex shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-2xs")}
        style={{ backgroundColor: accentColor }}
      >
        {monogramChar}
      </span>
    );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground flex flex-col antialiased font-sans"
      style={{ "--portal-primary": accentColor, "--auth-accent": accentColor } as React.CSSProperties}
    >
      <div className="flex min-w-0 flex-1">
        <aside
          aria-label="التنقل الرئيسي"
          className={cn(
            "fixed inset-y-0 right-0 z-40 flex w-64 shrink-0 flex-col border-l border-border/70 bg-card transition-transform duration-200 ease-out select-none lg:sticky lg:top-0 lg:h-screen",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <div className="border-b border-border/60 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <Link
                to={homePath}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {renderBrandAvatar("size-9")}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold leading-tight">{displayBrandName}</span>
                  {displaySubtitle ? (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">{displaySubtitle}</span>
                  ) : null}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="إغلاق القائمة"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {userName ? (
              <div className="mt-3 flex items-center gap-2.5 border-t border-border/50 pt-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
                >
                  <User className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{userName}</p>
                  {userSubtitle ? (
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground tabular-nums">
                      <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                      <span className="truncate">{userSubtitle}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.path);
              const hasBadge = item.badge !== undefined && item.badge !== null && item.badge !== "" && item.badge !== 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={isActive ? { backgroundColor: `${accentColor}16`, color: accentColor, borderColor: `${accentColor}33` } : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm",
                    isActive ? "font-semibold shadow-2xs" : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {hasBadge ? (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white tabular-nums" style={{ backgroundColor: accentColor }}>
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ChevronLeft className="size-4 shrink-0 opacity-75" aria-hidden="true" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border/60 p-3">
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{logoutLabel}</span>
            </button>
          </div>
        </aside>

        {sidebarOpen ? (
          <div aria-hidden="true" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden" />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={cn("sticky top-0 z-20 border-b border-border/70 bg-card/95 backdrop-blur-md", headerActions ? "block" : "lg:hidden")}>
            <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {sidebarOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                </button>
                <Link to={homePath} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {renderBrandAvatar("size-8")}
                  <span className="min-w-0 truncate text-sm font-bold text-foreground">{displayBrandName}</span>
                </Link>
              </div>

              <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground lg:flex">
                <span className="truncate font-semibold text-foreground">{portalTitle}</span>
                {userName ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{userName}</span>
                  </>
                ) : null}
              </div>

              {headerActions ? (
                <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>
              ) : (
                <div className="w-11 shrink-0 lg:hidden" />
              )}
            </div>
          </header>

          <main className={cn("min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6", showMobileBottomNav && "pb-20 sm:pb-6")}>
            <div className="mx-auto max-w-7xl space-y-4">
              <PortalInstallBanner
                portal={portalType}
                companyId={branding.companyId}
                companyName={displayBrandName}
                companyLogo={branding.logo}
                accentColor={accentColor}
              />
              {children}
            </div>
          </main>

          {footerContent ? (
            <footer className="mt-auto border-t border-border/60 bg-card px-4 py-3 text-center text-xs text-muted-foreground">
              {footerContent}
            </footer>
          ) : null}
        </div>
      </div>

      {showMobileBottomNav ? (
        <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur-md sm:hidden">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={isActive ? { color: accentColor } : undefined}
                  className={cn(
                    "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive ? "font-bold" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
};

export default PortalAppShell;
