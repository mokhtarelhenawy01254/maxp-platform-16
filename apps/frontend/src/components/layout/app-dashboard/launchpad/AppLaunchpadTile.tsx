import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import type { AppDefinition } from '../../../../config/appRegistry';
import { useRoutePrefetch } from '../../../../hooks/useRoutePrefetch';
import { cn } from '@/lib/utils';

interface AppLaunchpadTileProps {
  app: AppDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

type TileColor = { bg: string; shadow: string };

const TILE_COLORS: Record<string, TileColor> = {
  indigo: { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white', shadow: 'group-hover:shadow-indigo-500/25' },
  blue: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20 group-hover:bg-blue-600 group-hover:text-white', shadow: 'group-hover:shadow-blue-500/25' },
  green: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white', shadow: 'group-hover:shadow-emerald-500/25' },
  emerald: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white', shadow: 'group-hover:shadow-emerald-500/25' },
  sky: { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-500/20 group-hover:bg-sky-600 group-hover:text-white', shadow: 'group-hover:shadow-sky-500/25' },
  orange: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 dark:bg-orange-500/20 group-hover:bg-orange-600 group-hover:text-white', shadow: 'group-hover:shadow-orange-500/25' },
  amber: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20 group-hover:bg-amber-600 group-hover:text-white', shadow: 'group-hover:shadow-amber-500/25' },
  pink: { bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 dark:bg-pink-500/20 group-hover:bg-pink-600 group-hover:text-white', shadow: 'group-hover:shadow-pink-500/25' },
  purple: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20 group-hover:bg-purple-600 group-hover:text-white', shadow: 'group-hover:shadow-purple-500/25' },
  violet: { bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 dark:bg-violet-500/20 group-hover:bg-violet-600 group-hover:text-white', shadow: 'group-hover:shadow-violet-500/25' },
  teal: { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-500/20 group-hover:bg-teal-600 group-hover:text-white', shadow: 'group-hover:shadow-teal-500/25' },
  cyan: { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:bg-cyan-500/20 group-hover:bg-cyan-600 group-hover:text-white', shadow: 'group-hover:shadow-cyan-500/25' },
  red: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20 group-hover:bg-rose-600 group-hover:text-white', shadow: 'group-hover:shadow-rose-500/25' },
  rose: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20 group-hover:bg-rose-600 group-hover:text-white', shadow: 'group-hover:shadow-rose-500/25' },
  slate: { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-500/20 group-hover:bg-slate-700 group-hover:text-white', shadow: 'group-hover:shadow-slate-500/25' },
  gray: { bg: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-800 group-hover:text-white', shadow: 'group-hover:shadow-slate-500/25' },
};

const DEFAULT_COLOR: TileColor = {
  bg: 'bg-primary/10 text-primary dark:bg-primary/20 group-hover:bg-primary group-hover:text-primary-foreground',
  shadow: 'group-hover:shadow-primary/25',
};

export const AppLaunchpadTile: React.FC<AppLaunchpadTileProps> = ({
  app,
  isFavorite,
  onToggleFavorite,
}) => {
  const { i18n, t } = useTranslation();
  const prefetch = useRoutePrefetch();
  const colors = TILE_COLORS[app.color] ?? DEFAULT_COLOR;
  const isRtl = i18n.language?.startsWith('ar') ?? false;

  const appName = app.displayName ?? t(app.nameKey);
  const targetPath = app.route || `/apps/${app.id}`;

  const icon = React.isValidElement(app.icon)
    ? React.cloneElement(app.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'size-6 sm:size-7 md:size-8 transition-transform duration-200 group-hover:scale-110',
      })
    : React.createElement(app.icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'size-6 sm:size-7 md:size-8 transition-transform duration-200 group-hover:scale-110',
      });

  const handleMouseEnter = () => {
    prefetch(targetPath);
    if (app.id) {
      prefetch(`/${app.id}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(app.id);
  };

  return (
    <div className="relative group">
      <Link
        to={targetPath}
        aria-label={appName}
        onMouseEnter={handleMouseEnter}
        onFocus={handleMouseEnter}
        className={cn(
          "w-full flex flex-col items-center justify-start text-center p-1.5 sm:p-2 rounded-2xl cursor-pointer select-none",
          "border-0 shadow-none bg-transparent",
          "transition-all duration-200 ease-out",
          "hover:bg-slate-100/90 dark:hover:bg-slate-800/60 hover:-translate-y-1",
          "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        {/* Apple/Odoo Squircle Icon — Zero Box, Pure Floating Icon */}
        <div
          className={cn(
            "size-12 sm:size-14 md:size-[60px] lg:size-16 rounded-[18px] sm:rounded-2xl flex items-center justify-center shrink-0 mb-1.5 sm:mb-2 transition-all duration-200",
            "shadow-xs group-hover:shadow-md",
            colors.bg,
            colors.shadow,
          )}
        >
          {icon}
        </div>

        {/* Clean Typography — Bold, readable, zero description chatter */}
        <span className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors text-center line-clamp-2 leading-tight max-w-[110px]">
          {appName}
        </span>
      </Link>

      {/* Favorite Star Button (Visible on Hover or if Favorited) */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={Boolean(isFavorite)}
          aria-label={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
          className={cn(
            "absolute top-1 z-10 size-6 rounded-full flex items-center justify-center transition-all",
            isRtl ? "left-1" : "right-1",
            isFavorite
              ? "text-amber-500 bg-amber-500/10 opacity-100"
              : "text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100",
          )}
          title={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
        >
          <Star className={cn("size-3", isFavorite && "fill-amber-500")} />
        </button>
      )}
    </div>
  );
};

export default AppLaunchpadTile;
