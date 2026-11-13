import React from 'react';
import { Star, Zap } from 'lucide-react';
import type { AppDefinition } from '../../../../config/appRegistry';
import { AppLaunchpadTile } from './AppLaunchpadTile';
import { cn } from '@/lib/utils';

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
    <div className="space-y-4">
      {/* Pinned Quick Access Bar (if favorites exist and enabled) */}
      {showPinnedFavorites && favoriteApps.length > 0 && (
        <section aria-label="التطبيقات المفضلة" className="mb-2">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              <span>المثبتة في المفضلة</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">وصول فوري</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
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

      {/* Main Apps Grid — High Density, Zero Box-in-Box */}
      <section aria-label="جميع التطبيقات">
        {showPinnedFavorites && favoriteApps.length > 0 && (
          <div className="flex items-center justify-between mb-2.5 px-0.5 pt-2 border-t border-border/40">
            <span className="text-xs font-bold text-muted-foreground">جميع الأنظمة والخدمات</span>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {apps.length} نظام متاح
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
          {apps.map((app, index) => (
            <div
              key={app.id}
              className="motion-safe:animate-fade-in"
              style={{
                animationDelay: `${Math.min(index * 25, 300)}ms`,
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
