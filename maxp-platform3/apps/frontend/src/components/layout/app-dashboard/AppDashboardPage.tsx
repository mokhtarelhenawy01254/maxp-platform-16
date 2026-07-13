import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChartBarIcon, MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/outline';
import AppCard from './AppCard';
import AppCardSkeleton from './AppCardSkeleton';
import { sectionHasVisibleItems } from './helpers';
import { APP_CATEGORIES, APP_REGISTRY, AppCategory } from '../../../config/appRegistry';
import type { AppDefinition } from '../../../config/appRegistry';
import type { SidebarSection } from '../../../types/layout';

interface AppDashboardPageProps {
  userId?: string | null;
  companyId?: string | null;
  allSections?: SidebarSection[];
}

type AppFilterCategory = AppCategory | 'all' | 'favorites';

const FAVORITES_STORAGE_PREFIX = 'app-dashboard-favorites';

const normalizeCategory = (value: string | null): AppFilterCategory => {
  if (value === 'all' || value === 'favorites') return value;
  if (value && Object.prototype.hasOwnProperty.call(APP_CATEGORIES, value)) {
    return value as AppCategory;
  }

  return 'all';
};

const readStoredFavorites = (storageKey: string): string[] => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

const AppDashboardPage: React.FC<AppDashboardPageProps> = ({
  userId,
  companyId,
  allSections = [],
}) => {
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = normalizeCategory(searchParams.get('category'));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const favoriteStorageKey = useMemo(
    () => `${FAVORITES_STORAGE_PREFIX}:${companyId || 'no-company'}:${userId || 'anonymous'}`,
    [companyId, userId],
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    return readStoredFavorites(favoriteStorageKey);
  });

  const isRtl = i18n.language?.startsWith('ar') ?? false;

  const visibleApps = useMemo(() => {
    return allSections
      .filter(sectionHasVisibleItems)
      .map((section, index) => buildAppFromSection(section, index, t));
  }, [allSections, t]);

  useEffect(() => {
    setFavorites(readStoredFavorites(favoriteStorageKey));
  }, [favoriteStorageKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateDashboardParams = useCallback(
    (updates: { q?: string; category?: AppFilterCategory }) => {
      const nextParams = new URLSearchParams(searchParams);

      if (updates.q !== undefined) {
        if (updates.q.trim()) {
          nextParams.set('q', updates.q);
        } else {
          nextParams.delete('q');
        }
      }

      if (updates.category !== undefined) {
        if (updates.category === 'all') {
          nextParams.delete('category');
        } else {
          nextParams.set('category', updates.category);
        }
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const toggleFavorite = useCallback((appId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId];
      try {
        window.localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
      } catch {
        // Favorites are a convenience; keep the UI responsive if storage is unavailable.
      }
      return next;
    });
  }, [favoriteStorageKey]);

  const filteredApps = useMemo(() => {
    let apps = visibleApps;

    if (selectedCategory === 'favorites') {
      apps = apps.filter((app) => favorites.includes(app.id));
    } else if (selectedCategory !== 'all') {
      apps = apps.filter((app) => app.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      apps = apps.filter((app) => {
        const name = t(app.nameKey).toLowerCase();
        const desc = t(app.descriptionKey).toLowerCase();
        return name.includes(query) || desc.includes(query);
      });
    }

    return apps;
  }, [visibleApps, selectedCategory, searchQuery, favorites, t]);

  const categories = useMemo(() => {
    const usedCategories = new Set(visibleApps.map((app) => app.category));
    return (Object.keys(APP_CATEGORIES) as AppCategory[]).filter((cat) => usedCategories.has(cat));
  }, [visibleApps]);

  const favoriteApps = useMemo(
    () => visibleApps.filter((app) => favorites.includes(app.id)),
    [visibleApps, favorites],
  );

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('appDashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('appDashboard.subtitle')}
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <label htmlFor="app-dashboard-search" className="sr-only">
              {t('appDashboard.searchLabel')}
            </label>
            <MagnifyingGlassIcon aria-hidden="true" className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
            <input
              ref={searchInputRef}
              id="app-dashboard-search"
              name="app-search"
              type="text"
              value={searchQuery}
              onChange={(e) => updateDashboardParams({ q: e.target.value })}
              placeholder={String(t('appDashboard.searchPlaceholder'))}
              autoComplete="off"
              className={`
                w-full ${isRtl ? 'pr-10 pl-8' : 'pl-10 pr-8'} py-2.5
                rounded-xl
                border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-white
                placeholder-gray-400
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent
                transition-[border-color,box-shadow] duration-200
              `}
            />
            <button
              type="button"
              popovertarget="shortcuts-popover"
              popovertargetaction="toggle"
              className={`inline-flex absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150`}
              title={String(t('appDashboard.shortcuts'))}
            >
              <span className="text-xs">⌘</span>K
            </button>

            <div
              id="shortcuts-popover"
              popover="auto"
              className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-4 text-sm min-w-[220px]"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('appDashboard.shortcuts')}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400">{t('appDashboard.shortcutFocusSearch')}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400">{t('appDashboard.shortcutClose')}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2" aria-label={String(t('appDashboard.categoryFilterLabel'))}>
          <button
            type="button"
            aria-pressed={selectedCategory === 'all'}
            onClick={() => updateDashboardParams({ category: 'all' })}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${selectedCategory === 'all'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }
            `}
          >
            {t('appDashboard.category.all')}
          </button>

          {favoriteApps.length > 0 && (
            <button
              type="button"
              aria-pressed={selectedCategory === 'favorites'}
              onClick={() => updateDashboardParams({ category: 'favorites' })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 flex items-center gap-1.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
                ${selectedCategory === 'favorites'
                  ? 'bg-yellow-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }
              `}
            >
              <StarIcon aria-hidden="true" className="h-4 w-4" />
              {t('appDashboard.category.favorites')}
            </button>
          )}

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => updateDashboardParams({ category: cat })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${selectedCategory === cat
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }
              `}
            >
              {t(APP_CATEGORIES[cat].nameKey)}
            </button>
          ))}
        </nav>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400" aria-hidden="true">
            {filteredApps.length} {t('appDashboard.title')}
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {filteredApps.length === 0
            ? t('appDashboard.noResults')
            : `${filteredApps.length} ${t('appDashboard.title')}`
          }
        </div>

        {visibleApps.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <AppCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16">
            <MagnifyingGlassIcon aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('appDashboard.noResults')}
            </p>
            <button
              type="button"
              onClick={() => updateDashboardParams({ q: '', category: 'all' })}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t('appDashboard.clearFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 @container">
            {filteredApps.map((app, index) => (
              <div
                key={app.id}
                className="motion-safe:animate-fade-in"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'forwards', contentVisibility: 'auto', containIntrinsicSize: '80px' }}
              >
                <AppCard
                  app={app}
                  isFavorite={favorites.includes(app.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SECTION_CATEGORY_OVERRIDES: Partial<Record<string, AppCategory>> = {
  facebook: 'communication',
  whatsapp: 'communication',
  telegram: 'communication',
  orders: 'sales',
  'orders-analytics': 'analytics',
  products: 'sales',
  'storefront-design': 'sales',
  customers: 'sales',
  affiliate: 'sales',
  'platform-partner': 'sales',
  procurement: 'operations',
  inventory: 'operations',
  business: 'operations',
  marketing: 'marketing',
  hr: 'hr',
  analytics: 'analytics',
  marketplace: 'system',
  billing: 'settings',
  notifications: 'settings',
  activity: 'settings',
  settings: 'settings',
  legal: 'settings',
  'ai-operator': 'system',
  admin: 'system',
  system: 'system',
  company: 'system',
  'my-account': 'main',
  'my-companies': 'main',
};

const CATEGORY_COLORS: Record<AppCategory, string> = {
  main: 'indigo',
  communication: 'blue',
  sales: 'teal',
  operations: 'slate',
  hr: 'violet',
  analytics: 'indigo',
  marketing: 'amber',
  settings: 'gray',
  system: 'purple',
};

const FALLBACK_COLORS = [
  'indigo',
  'blue',
  'teal',
  'slate',
  'violet',
  'amber',
  'gray',
  'purple',
] as const;

const buildAppFromSection = (
  section: SidebarSection,
  index: number,
  t: TFunction,
): AppDefinition => {
  const exactMetadata = APP_REGISTRY.find((app) => app.id === section.id);
  const inheritedMetadata = APP_REGISTRY.find((app) => app.sectionIds.includes(section.id));
  const metadata = exactMetadata ?? inheritedMetadata;
  const visibleItemCount = section.items.filter((item) => !item.hidden).length;
  const category = metadata?.id === section.id
    ? metadata.category
    : SECTION_CATEGORY_OVERRIDES[section.id] ?? metadata?.category ?? 'main';
  const fallbackColor = CATEGORY_COLORS[category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? 'indigo';

  return {
    id: section.id,
    nameKey: metadata?.nameKey ?? section.title,
    descriptionKey: metadata?.descriptionKey ?? 'appDashboard.toolsCount',
    icon: section.icon ?? metadata?.icon ?? ChartBarIcon,
    color: metadata?.color ?? fallbackColor,
    bgGradient: metadata?.bgGradient ?? `from-${fallbackColor}-500 to-${fallbackColor}-600`,
    sectionIds: [section.id],
    category,
      displayName: section.title,
      displayDescription: exactMetadata?.descriptionKey
        ? t(exactMetadata.descriptionKey)
        : t('appDashboard.toolsCount', { count: visibleItemCount }),
  };
};

export default AppDashboardPage;
