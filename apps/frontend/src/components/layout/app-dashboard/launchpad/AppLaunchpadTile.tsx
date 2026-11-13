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

type TileColor = { bg: string; iconClass: string; glow: string };

const TILE_COLORS: Record<string, TileColor> = {
  indigo: { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20', iconClass: 'text-indigo-600 dark:text-indigo-400', glow: 'group-hover:ring-indigo-500/20' },
  blue: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', iconClass: 'text-blue-600 dark:text-blue-400', glow: 'group-hover:ring-blue-500/20' },
  green: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', iconClass: 'text-emerald-600 dark:text-emerald-400', glow: 'group-hover:ring-emerald-500/20' },
  emerald: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', iconClass: 'text-emerald-600 dark:text-emerald-400', glow: 'group-hover:ring-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20', iconClass: 'text-sky-600 dark:text-sky-400', glow: 'group-hover:ring-sky-500/20' },
  orange: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20', iconClass: 'text-orange-600 dark:text-orange-400', glow: 'group-hover:ring-orange-500/20' },
  amber: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', iconClass: 'text-amber-600 dark:text-amber-400', glow: 'group-hover:ring-amber-500/20' },
  pink: { bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20', iconClass: 'text-pink-600 dark:text-pink-400', glow: 'group-hover:ring-pink-500/20' },
  purple: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20', iconClass: 'text-purple-600 dark:text-purple-400', glow: 'group-hover:ring-purple-500/20' },
  violet: { bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20', iconClass: 'text-violet-600 dark:text-violet-400', glow: 'group-hover:ring-violet-500/20' },
  teal: { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20', iconClass: 'text-teal-600 dark:text-teal-400', glow: 'group-hover:ring-teal-500/20' },
  cyan: { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20', iconClass: 'text-cyan-600 dark:text-cyan-400', glow: 'group-hover:ring-cyan-500/20' },
  red: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', iconClass: 'text-rose-600 dark:text-rose-400', glow: 'group-hover:ring-rose-500/20' },
  rose: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', iconClass: 'text-rose-600 dark:text-rose-400', glow: 'group-hover:ring-rose-500/20' },
  slate: { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20', iconClass: 'text-slate-600 dark:text-slate-400', glow: 'group-hover:ring-slate-500/20' },
  gray: { bg: 'bg-muted text-muted-foreground border border-border/50', iconClass: 'text-muted-foreground', glow: 'group-hover:ring-border' },
};

const DEFAULT_COLOR: TileColor = {
  bg: 'bg-primary/10 text-primary border border-primary/20',
  iconClass: 'text-primary',
  glow: 'group-hover:ring-primary/20',
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
        className: 'size-5 sm:size-5.5',
      })
    : React.createElement(app.icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'size-5 sm:size-5.5',
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
          "w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer text-start select-none",
          "border border-border/40 bg-card/60 dark:bg-card/40 backdrop-blur-xs",
          "transition-all duration-150 ease-out",
          "hover:bg-card hover:border-border hover:shadow-2xs hover:-translate-y-0.5",
          "active:scale-[0.985] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        )}
      >
        {/* Pure Icon Container — Zero Box-in-Box styling */}
        <div
          className={cn(
            "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-150 group-hover:scale-105",
            colors.bg,
          )}
        >
          {icon}
        </div>

        {/* Crisp App Name — Clean & Direct (Zero description chatter) */}
        <div className="min-w-0 flex-1 pl-6 rtl:pl-0 rtl:pr-6">
          <h3 className="text-xs sm:text-[13px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {appName}
          </h3>
          {app.category && app.category !== 'main' && (
            <span className="text-[10px] font-medium text-muted-foreground/70 truncate block">
              {t(`appDashboard.category.${app.category}`, { defaultValue: app.category })}
            </span>
          )}
        </div>
      </Link>

      {/* Favorite Star Button (Visible on Hover or if Favorited) */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={Boolean(isFavorite)}
          aria-label={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
          className={cn(
            "absolute top-2.5 z-10 size-7 rounded-lg flex items-center justify-center transition-all",
            isRtl ? "left-2" : "right-2",
            isFavorite
              ? "text-amber-500 bg-amber-500/10 opacity-100"
              : "text-muted-foreground/30 hover:text-amber-500 hover:bg-muted/60 opacity-0 group-hover:opacity-100",
          )}
          title={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
        >
          <Star className={cn("size-3.5", isFavorite && "fill-amber-500")} />
        </button>
      )}
    </div>
  );
};

export default AppLaunchpadTile;
