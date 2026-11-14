import React from 'react';
import { Star } from 'lucide-react';
import type { AppDefinition } from '../../../../config/appRegistry';
import { AppLaunchpadTile } from './AppLaunchpadTile';

interface AppLaunchpadGridProps {
  apps: AppDefinition[];
  favorites: string[];
  onToggleFavorite: (appId: string) => void;
  showPinnedFavorites?: boolean;
}

export const AppLaunchpadGrid: React.FC<AppLaunchpadGridProps> = ({
  apps,
  favorites,
  onToggleFavorite,
  showPinnedFavorites = true,
}) => {
  const favoriteApps = React.useMemo(
    () => apps.filter((app) => favorites.includes(app.id)),
    [apps, favorites],
  );

  return (
    <div className="space-y-6">
      {/* Pinned Quick Access Shelf (if favorites exist) */}
      {showPinnedFavorites && favoriteApps.length > 0 && (
        <section aria-label="التطبيقات المفضلة" className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              <span>المثبتة في المفضلة</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">وصول فوري</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-3.5 lg:gap-4">
            {favoriteApps.map((app) => (
              <AppLaunchpadTile
                key={`fav-${app.id}`}
                app={app}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Apps Canvas — Pure Borderless Apple / Odoo Launchpad */}
      <section aria-label="جميع التطبيقات">
        {showPinnedFavorites && favoriteApps.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">جميع الأنظمة والخدمات</span>
            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
              {apps.length} نظام متاح
            </span>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-3.5 lg:gap-4">
          {apps.map((app, index) => (
            <div
              key={app.id}
              className="motion-safe:animate-fade-in"
              style={{
                animationDelay: `${Math.min(index * 20, 250)}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <AppLaunchpadTile
                app={app}
                isFavorite={favorites.includes(app.id)}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AppLaunchpadGrid;
