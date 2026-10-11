import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import type { SidebarSection } from '../../../types/layout';
import { useAuth } from '../../../hooks/useAuthSimple';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { isSidebarPathActive } from '../sidebar/matchSidebarPath';
import PageExplanations from '../../common/PageExplanations';

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
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  sky: 'bg-sky-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500',
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  fuchsia: 'bg-fuchsia-500',
  rose: 'bg-rose-500',
  zinc: 'bg-zinc-500',
  neutral: 'bg-neutral-500',
};
const DEFAULT_BG_COLOR = 'bg-gray-500';

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
  const bgColor = COLOR_MAP[appColor] ?? DEFAULT_BG_COLOR;
  const appIconNode = renderIcon(Icon, 'h-5 w-5');

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
      className={`app-shell-sidebar ${isCollapsed ? 'app-shell-sidebar--collapsed' : ''}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="app-shell-back-button"
        aria-label={String(t('appDashboard.backToApps'))}
      >
        <ArrowUturnLeftIcon aria-hidden="true" className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
        {!isCollapsed && (
          <span className="text-sm font-medium">
            {t('appDashboard.backToApps')}
          </span>
        )}
      </button>

      <div className="app-shell-sidebar-header">
        <div className="flex items-center gap-3">
          <div className={`
            flex items-center justify-center
            w-10 h-10 rounded-xl
            ${bgColor} text-white
            shadow-md
          `}>
            {appIconNode}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="app-shell-sidebar-title">{appName}</h2>
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
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
                        ? React.createElement(item.icon as React.ComponentType<{ className?: string }>, { className: 'h-5 w-5 flex-shrink-0' })
                        : null}
                    {!isCollapsed && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge ? (
                      <span className="app-shell-sidebar-badge">{item.badge}</span>
                    ) : null}
                  </>
                );

                return (
                  <div key={item.to}>
                    {renderLink(
                      item.to,
                      `
                        app-shell-sidebar-item
                        ${isActive(item.to) ? 'app-shell-sidebar-item--active' : ''}
                      `,
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
                              `
                                app-shell-sidebar-child
                                ${isActive(child.to) ? 'app-shell-sidebar-child--active' : ''}
                              `,
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

const normalizeRoute = (path: string): string => {
  const [pathname, search = ''] = path.split('?');
  const normalizedPathname = pathname?.replace(/\/+$/, '') || '/';
  return search ? `${normalizedPathname}?${search}` : normalizedPathname;
};

const AppSidebar = React.memo(AppSidebarInner);

export default AppSidebar;
