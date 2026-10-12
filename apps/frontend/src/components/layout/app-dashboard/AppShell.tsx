import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bars3Icon, ArrowUturnLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import AppSidebar from './AppSidebar';
import AdminBottomNav from './AdminBottomNav';
import { sectionHasVisibleItems, isChatRoute } from './helpers';
import { isSidebarPathActive } from '../sidebar/matchSidebarPath';
import PageExplanations from '../../common/PageExplanations';
import { getAppById, APP_REGISTRY } from '../../../config/appRegistry';
import type { AppDefinition } from '../../../config/appRegistry';
import type { SidebarItem, SidebarSection } from '../../../types/layout';

interface AppShellProps {
  children: React.ReactNode;
  allSections: SidebarSection[];
  /** Set to false when an outer header already provides mobile navigation (e.g. classic layouts wrapping /apps/:appId). */
  showMobileHeader?: boolean;
  /** اعرض مدخل شروحات الصفحة في السايدبار/هيدر الموبايل (يُعطَّل عندما يوفّر هيدر خارجي المدخل نفسه). */
  showPageExplanations?: boolean;
}

const AppShell: React.FC<AppShellProps> = ({
  children,
  allSections,
  showMobileHeader = true,
  showPageExplanations = true,
}) => {
  const { i18n, t } = useTranslation();
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // The mobile header is CSS-hidden on desktop (lg:hidden) but React still mounted its
  // PageExplanations, so every desktop page fired the explanations request twice. Gate it
  // on a real media query instead of relying on the CSS class alone.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const isRtl = i18n.language?.startsWith('ar') ?? false;
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);

  const app = useMemo(() => {
    const sectionById = allSections.find((section) => section.id === appId && sectionHasVisibleItems(section));
    if (sectionById) {
      return buildAppFromSection(sectionById);
    }

    const appById = getAppById(appId || '');
    if (appById) {
      return appHasVisibleSections(appById, allSections) ? appById : undefined;
    }

    return getAppByPath(location.pathname, allSections);
  }, [allSections, appId, location.pathname]);

  const appSections = useMemo(() => {
    if (!app) return [];
    return allSections.filter((section) => !section.hidden && app.sectionIds.includes(section.id));
  }, [app, allSections]);

  const firstVisibleItemPath = useMemo(() => getFirstVisibleItemPath(appSections), [appSections]);
  const targetDestination = app?.route || firstVisibleItemPath;
  const appLandingPath = app ? `/apps/${app.id}` : null;
  const isOnLandingPath = Boolean(appLandingPath) && location.pathname === appLandingPath;

  useEffect(() => {
    if (appLandingPath && location.pathname === appLandingPath && targetDestination) {
      navigate(targetDestination, { replace: true });
    }
  }, [appLandingPath, targetDestination, location.pathname, navigate]);

  useEffect(() => {
    if (!isSidebarOpen) {
      // Restore focus to the toggle when the drawer closes.
      if (mobileMenuToggleRef.current) {
        mobileMenuToggleRef.current.focus();
      }
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.body.classList.add('app-shell-mobile-open');
    document.addEventListener('keydown', handleKeyDown);

    // Move focus into the drawer so keyboard/screen-reader users land in the menu.
    const drawer = mobileDrawerRef.current;
    const firstFocusable = drawer?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    return () => {
      document.body.classList.remove('app-shell-mobile-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (deltaY > 50) return;
    if (isRtl ? deltaX > 80 : deltaX < -80) {
      setIsSidebarOpen(false);
    }
  }, [isRtl]);

  if (!app) {
    if (!appId) {
      return (
        <div className="app-shell-root app-shell-root--standalone">
          <main className="app-shell-main">
            <div className="app-shell-content">
              {children}
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('appDashboard.appNotFound')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/apps')}
            className="text-indigo-600 hover:text-indigo-500 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {t('appDashboard.backToApps')}
          </button>
        </div>
      </div>
    );
  }

  const icon = renderAppIcon(app.icon, 'h-5 w-5 text-gray-400');
  const appName = app.displayName ?? String(t(app.nameKey));

  const handleBack = () => {
    const normalizedCurrent = normalizePathname(location.pathname);

    let parentPath: string | null = null;
    let exactMatch = false;

    for (const section of appSections) {
      for (const item of section.items) {
        if (item.hidden || item.external) continue;
        const itemPath = normalizePathname(item.to);

        if (normalizedCurrent === itemPath) {
          exactMatch = true;
          parentPath = null;
          break;
        }

        if (
          normalizedCurrent.startsWith(itemPath + '/') &&
          isSidebarPathActive(normalizedCurrent, itemPath) &&
          (!parentPath || itemPath.length > parentPath.length)
        ) {
          parentPath = itemPath;
        }

        if (item.children) {
          for (const child of item.children) {
            if (child.hidden) continue;
            const childPath = normalizePathname(child.to);
            if (normalizedCurrent.startsWith(childPath + '/') || normalizedCurrent === childPath) {
              if (!parentPath || itemPath.length > parentPath.length) {
                parentPath = itemPath;
              }
              break;
            }
          }
        }
      }
      if (exactMatch) break;
    }

    if (parentPath) {
      navigate(parentPath);
    } else {
      navigate('/apps');
    }
  };

  const isChat = isChatRoute(location.pathname);

  return (
    <div className={`app-shell-root${isChat ? ' app-shell-root--no-bottom-nav' : ''}`}>
      <a
        href="#app-shell-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg"
      >
        {t('appDashboard.skipToContent')}
      </a>

      {showMobileHeader && (
        <header className="app-shell-mobile-header lg:hidden">
          <button
            ref={mobileMenuToggleRef}
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label={String(t('appDashboard.openAppMenu'))}
            aria-expanded={isSidebarOpen}
            aria-controls="app-shell-mobile-drawer"
            className="app-shell-mobile-header-button"
          >
            <Bars3Icon aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="app-shell-mobile-header-title">{appName}</div>
          <div className="flex items-center gap-1.5 ms-auto">
            {showPageExplanations && !isDesktop && <PageExplanations />}
            <button
              type="button"
              onClick={handleBack}
              aria-label={String(t('appDashboard.backToApps'))}
              className="app-shell-mobile-header-button"
            >
              <ArrowUturnLeftIcon aria-hidden="true" className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>
      )}

      <div className="app-shell-body">
        <div className="hidden lg:block h-full">
          <AppSidebar
            appName={appName}
            appIcon={app.icon}
            appColor={app.color}
            sections={appSections}
            onBack={handleBack}
            showPageExplanations={showPageExplanations}
          />
        </div>

        {isSidebarOpen && (
          <button
            type="button"
            aria-label={String(t('appDashboard.closeAppMenu'))}
            className="app-shell-mobile-backdrop app-shell-mobile-backdrop--visible lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div
          id="app-shell-mobile-drawer"
          ref={mobileDrawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={String(t('appDashboard.appNavigation', { appName }))}
          aria-hidden={isSidebarOpen ? undefined : true}
          className={`
            fixed inset-y-0 z-50 lg:hidden w-72 max-w-[85vw]
            transform transition-transform duration-200 ease-in-out
            ${isRtl ? 'right-0' : 'left-0'}
            ${isSidebarOpen ? 'app-shell-drawer--open translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}
          `}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          {...(isSidebarOpen ? {} : { inert: '' })}
        >
          <AppSidebar
            appName={appName}
            appIcon={app.icon}
            appColor={app.color}
            sections={appSections}
            onBack={handleBack}
            onNavigate={() => setIsSidebarOpen(false)}
            showPageExplanations={showPageExplanations}
          />
        </div>

        <div id="app-shell-main-content" className="app-shell-main">
          <div className={`app-shell-content${isChat ? ' app-shell-content--no-bottom-nav' : ''}`}>
            {isOnLandingPath && firstVisibleItemPath ? (
              <div className="flex min-h-[60vh] items-center justify-center" role="status">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
                  aria-hidden="true"
                />
              </div>
            ) : isOnLandingPath ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">{t('appDashboard.appNotFound')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/apps')}
                  className="text-indigo-600 hover:text-indigo-500 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {t('appDashboard.backToApps')}
                </button>
              </div>
            ) : (
              children
            )}
          </div>
        </div>

        <AdminBottomNav />
      </div>
    </div>
  );
};

const normalizePathname = (path: string): string => path.split('?')[0]?.replace(/\/+$/, '') || '/';

const itemMatchesPath = (item: SidebarItem, pathname: string): boolean =>
  isSidebarPathActive(pathname, item.to);

const itemOrChildrenMatchPath = (item: SidebarItem, pathname: string): boolean => {
  if (item.hidden || item.external) return false;

  return (
    itemMatchesPath(item, pathname) ||
    (item.children?.some((child) => !child.hidden && itemMatchesPath(child, pathname)) ?? false)
  );
};

const sectionHasPath = (section: SidebarSection, pathname: string): boolean =>
  !section.hidden && section.items.some((item) => itemOrChildrenMatchPath(item, pathname));

const buildAppFromSection = (section: SidebarSection): AppDefinition => {
  const metadata = APP_REGISTRY.find((app) => app.id === section.id || app.sectionIds.includes(section.id));

  return {
    id: section.id,
    nameKey: metadata?.nameKey ?? section.title,
    descriptionKey: metadata?.descriptionKey ?? 'appDashboard.toolsCount',
    icon: section.icon ?? metadata?.icon ?? ChartBarIcon,
    color: metadata?.color ?? 'indigo',
    bgGradient: metadata?.bgGradient ?? 'from-indigo-500 to-indigo-600',
    sectionIds: [section.id],
    category: metadata?.category ?? 'main',
    displayName: section.title,
    route: metadata?.route || (section.id === 'products' ? '/products' : section.id === 'inventory' ? '/inventory' : undefined),
  };
};

export const getAppByPath = (
  pathname: string,
  allSections: SidebarSection[],
): AppDefinition | undefined => {
  const normalized = normalizePathname(pathname);

  // Conversion Tools & Storefront Studio routes belong strictly to 'storefront-design',
  // and MUST NEVER be hijacked by the general 'settings' section or sidebar.
  if (
    normalized === '/settings/store/tools' ||
    normalized.startsWith('/settings/store/tools/')
  ) {
    const storefrontSection = allSections.find(
      (s) => !s.hidden && s.id === 'storefront-design',
    );
    if (storefrontSection) {
      return buildAppFromSection(storefrontSection);
    }
    // If storefront-design is hidden or absent for the current user/company,
    // return undefined so AppShell renders the page in clean standalone mode without any sidebar.
    return undefined;
  }

  // 1. Direct section prefix match when that section actually owns a matching item via isSidebarPathActive
  // (e.g. /inventory/studio matches section 'inventory' rather than duplicate shortcut in 'products',
  // while /settings/store/tools/* does NOT match 'settings' because '/settings' is a baseDashboardPath)
  const directSection = allSections.find(
    (s) => !s.hidden && (normalized === `/${s.id}` || normalized.startsWith(`/${s.id}/`))
  );
  if (directSection && directSection.items.some((item) => itemOrChildrenMatchPath(item, pathname))) {
    return buildAppFromSection(directSection);
  }

  // 2. Exact item path match
  const exactSection = allSections.find(
    (candidate) => !candidate.hidden && candidate.items.some((item) => !item.hidden && normalizePathname(item.to) === normalized)
  );
  if (exactSection) {
    return buildAppFromSection(exactSection);
  }

  // 3. General section match
  const section = allSections.find((candidate) => sectionHasPath(candidate, pathname));
  if (section) {
    return buildAppFromSection(section);
  }

  return APP_REGISTRY.find((candidate) =>
    appHasVisibleSections(candidate, allSections) &&
    allSections
      .filter((candidateSection) => candidate.sectionIds.includes(candidateSection.id))
      .some((candidateSection) => sectionHasPath(candidateSection, pathname)),
  );
};

const appHasVisibleSections = (
  app: AppDefinition,
  allSections: SidebarSection[],
): boolean =>
  allSections.some(
    (section) =>
      app.sectionIds.includes(section.id) &&
      !section.hidden &&
      section.items.some((item) => !item.hidden),
  );

const getFirstVisibleItemPath = (sections: SidebarSection[]): string | null => {
  for (const section of sections) {
    if (section.hidden) continue;
    const item = section.items.find(
      (candidate) =>
        !candidate.hidden &&
        !candidate.external,
    );
    if (item?.to) {
      return item.to;
    }
  }

  return null;
};

const renderAppIcon = (
  icon: AppDefinition['icon'],
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

export default AppShell;
