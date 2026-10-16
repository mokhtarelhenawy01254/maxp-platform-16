import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CornerUpLeft } from 'lucide-react';
import type { SidebarSection } from '../../../types/layout';
import { useAuth } from '../../../hooks/useAuthSimple';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { isSidebarPathActive } from '../sidebar/matchSidebarPath';
import PageExplanations from '../../common/PageExplanations';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  appName: string;
  appIcon: React.ElementType | React.ReactElement;
  appColor: string;
  sections: SidebarSection[];
  onBack: () => void;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  /** اعرض مدخل شروحات الصفحة (يُعطَّل عندما يوفّر هيدر خارجي المدخل نفسه) */
  showPageExplanations?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  teal: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  slate: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20',
  red: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  gray: 'bg-muted text-muted-foreground border border-border/60',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  zinc: 'bg-muted text-muted-foreground border border-border/60',
  neutral: 'bg-muted text-muted-foreground border border-border/60',
};
const DEFAULT_BG_COLOR = 'bg-primary/10 text-primary border border-primary/20';

const AppSidebarInner: React.FC<AppSidebarProps> = ({
  appName,
  appIcon: Icon,
  appColor,
  sections,
  onBack,
  onNavigate,
  isCollapsed = false,
  showPageExplanations = true,
}) => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const isRtl = i18n.language?.startsWith('ar') ?? false;
  const colorBadge = COLOR_MAP[appColor] ?? DEFAULT_BG_COLOR;
  const appIconNode = renderIcon(Icon, 'size-4.5');

  const getExternalHref = (to: string): string => {
    const slug = user?.company?.slug;
    const customDomain = user?.company?.customDomain;

    return slug && slug.trim().length > 0
      ? buildStoreUrl(slug, to, customDomain || undefined)
      : to;
  };

  const isActive = (path: string) =>
    isSidebarPathActive(`${location.pathname}${location.search}`, path);

  useEffect(() => {
    if (!navRef.current) return;
    const activeItem = navRef.current.querySelector('.app-shell-sidebar-item--active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [location.pathname]);

  const renderLink = (
    to: string,
    className: string,
    children: React.ReactNode,
    title?: string,
    external?: boolean,
  ) => {
    if (external) {
      return (
        <a
          href={getExternalHref(to)}
          className={className}
          onClick={onNavigate}
          title={title}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        to={to}
        className={className}
        onClick={onNavigate}
        title={title}
      >
        {children}
      </Link>
    );
  };

  return (
    <aside
      aria-label={String(t('appDashboard.appNavigation', { appName }))}
      className={cn(
        "app-shell-sidebar select-none border-l rtl:border-r rtl:border-l-0 border-border/60 bg-card text-foreground",
        isCollapsed && "app-shell-sidebar--collapsed",
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className="app-shell-back-button text-muted-foreground hover:text-foreground transition-colors group"
        aria-label={String(t('appDashboard.backToApps'))}
      >
        {isRtl ? (
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
        )}
        {!isCollapsed && (
          <span className="text-xs font-semibold">
            {t('appDashboard.backToApps')}
          </span>
        )}
      </button>

      <div className="app-shell-sidebar-header border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex items-center justify-center size-9 rounded-lg shadow-2xs shrink-0",
            colorBadge,
          )}>
            {appIconNode}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="app-shell-sidebar-title text-sm font-semibold truncate text-foreground">{appName}</h2>
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && showPageExplanations && (
        <PageExplanations variant="block" />
      )}

      <nav ref={navRef} className="app-shell-sidebar-content">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => !item.hidden);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id} className="mb-2">
              {!isCollapsed && (
                <div className="px-4 py-1.5">
                  <h3 className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
              )}
              {visibleItems.map((item) => {
                const visibleChildren = item.children?.filter((child) => !child.hidden) ?? [];
                const itemContent = (
                  <>
                    {item.icon && React.isValidElement(item.icon)
                      ? item.icon
                      : item.icon
                        ? React.createElement(item.icon as React.ComponentType<{ className?: string }>, { className: 'size-4 shrink-0' })
                        : null}
                    {!isCollapsed && (
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge ? (
                      <span className="app-shell-sidebar-badge font-mono tabular-nums">{item.badge}</span>
                    ) : null}
                  </>
                );

                return (
                  <div key={item.to}>
                    {renderLink(
                      item.to,
                      cn(
                        "app-shell-sidebar-item transition-colors",
                        isActive(item.to) ? "app-shell-sidebar-item--active" : "hover:bg-muted/40",
                      ),
                      itemContent,
                      isCollapsed ? item.label : undefined,
                      item.external,
                    )}

                    {!isCollapsed && visibleChildren.length > 0 ? (
                      <div className="app-shell-sidebar-children">
                        {visibleChildren.map((child) => (
                          <React.Fragment key={child.to}>
                            {renderLink(
                              child.to,
                              cn(
                                "app-shell-sidebar-child transition-colors",
                                isActive(child.to) ? "app-shell-sidebar-child--active" : "hover:bg-muted/30",
                              ),
                              <span className="truncate">{child.label}</span>,
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

const renderIcon = (
  icon: React.ElementType | React.ReactElement,
  className: string,
): React.ReactElement => {
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
      'aria-hidden': true,
      className,
    });
  }

  return React.createElement(icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
    'aria-hidden': true,
    className,
  });
};

const AppSidebar = React.memo(AppSidebarInner);

export default AppSidebar;
