import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bars3Icon, ArrowUturnLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import AppSidebar from './AppSidebar';
import { sectionHasVisibleItems } from './helpers';
import { getAppById, APP_REGISTRY } from '../../../config/appRegistry';
import type { AppDefinition } from '../../../config/appRegistry';
import type { SidebarItem, SidebarSection } from '../../../types/layout';

interface AppShellProps {
  children: React.ReactNode;
  allSections: SidebarSection[];
}

const AppShell: React.FC<AppShellProps> = ({ children, allSections }) => {
  const { i18n, t } = useTranslation();
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isRtl = i18n.language?.startsWith('ar') ?? false;
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

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
  const appLandingPath = app ? `/apps/${app.id}` : null;

  useEffect(() => {
    if (appLandingPath && location.pathname === appLandingPath && firstVisibleItemPath) {
      navigate(firstVisibleItemPath, { replace: true });
    }
  }, [appLandingPath, firstVisibleItemPath, location.pathname, navigate]);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.body.classList.add('app-shell-mobile-open');
    document.addEventListener('keydown', handleKeyDown);

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

    for (const section of appSections) {
      for (const item of section.items) {
        if (item.hidden || item.external) continue;
        const itemPath = normalizePathname(item.to);

        if (normalizedCurrent === itemPath) {
          parentPath = null;
          break;
        }

        if (normalizedCurrent.startsWith(itemPath + '/')) {
          parentPath = itemPath;
          break;
        }

        if (item.children) {
          for (const child of item.children) {
            if (child.hidden) continue;
            const childPath = normalizePathname(child.to);
            if (normalizedCurrent.startsWith(childPath + '/') || normalizedCurrent === childPath) {
              parentPath = itemPath;
              break;
            }
          }
          if (parentPath) break;
        }
      }
      if (parentPath !== null) break;
    }

    if (parentPath) {
      navigate(parentPath);
    } else {
      navigate('/apps');
    }
  };

  return (
    <div className="app-shell-root">
      <a
        href="#app-shell-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg"
      >
        {t('appDashboard.skipToContent')}
      </a>

      <div className="hidden lg:block h-full">
        <AppSidebar
          appName={appName}
          appIcon={app.icon}
          appColor={app.color}
          sections={appSections}
          onBack={handleBack}
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
        className={`
          fixed inset-y-0 z-50 lg:hidden
          transform transition-transform duration-200 ease-in-out
          ${isRtl ? 'right-0' : 'left-0'}
          ${isSidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AppSidebar
          appName={appName}
          appIcon={app.icon}
          appColor={app.color}
          sections={appSections}
          onBack={handleBack}
          onNavigate={() => setIsSidebarOpen(false)}
        />
      </div>

      <div id="app-shell-main-content" className="app-shell-main">
        <header className="app-shell-header">
          <button
            type="button"
            onClick={handleBack}
            aria-label={String(t('appDashboard.backToApps'))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowUturnLeftIcon aria-hidden="true" className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            aria-label={String(t('appDashboard.openAppMenu'))}
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Bars3Icon aria-hidden="true" className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {appName}
            </span>
          </div>
        </header>
        <div className="app-shell-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const normalizePathname = (path: string): string => path.split('?')[0]?.replace(/\/+$/, '') || '/';

const itemMatchesPath = (item: SidebarItem, pathname: string): boolean => {
  const target = normalizePathname(item.to);
  const current = normalizePathname(pathname);

  if (target === '/') {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
};

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
  };
};

const getAppByPath = (
  pathname: string,
  allSections: SidebarSection[],
): AppDefinition | undefined => {
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
    const item = section.items.find((candidate) => !candidate.hidden && !candidate.external);
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
