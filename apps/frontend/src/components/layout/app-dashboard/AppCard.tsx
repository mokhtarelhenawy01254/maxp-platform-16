import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import type { AppDefinition } from '../../../config/appRegistry';
import { useRoutePrefetch } from '../../../hooks/useRoutePrefetch';
import { cn } from '@/lib/utils';

interface AppCardProps {
  app: AppDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

type AppCardColor = { bg: string; text: string; ring: string };

const DEFAULT_CARD_COLOR: AppCardColor = {
  bg: 'bg-muted text-muted-foreground',
  text: 'text-muted-foreground',
  ring: 'ring-border',
};

const COLOR_MAP: Record<string, AppCardColor> = {
  indigo: { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-400' },
  blue: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400' },
  green: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
  sky: { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-400' },
  orange: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-400' },
  pink: { bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-400' },
  purple: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
  teal: { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-400' },
  cyan: { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-400' },
  yellow: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-yellow-400' },
  slate: { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20', text: 'text-slate-600 dark:text-slate-400', ring: 'ring-slate-400' },
  red: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-red-400' },
  gray: { bg: 'bg-muted text-muted-foreground border border-border/60', text: 'text-muted-foreground', ring: 'ring-gray-400' },
  violet: { bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-400' },
  emerald: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
  amber: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400' },
  fuchsia: { bg: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20', text: 'text-fuchsia-600 dark:text-fuchsia-400', ring: 'ring-fuchsia-400' },
  rose: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-400' },
  zinc: { bg: 'bg-muted text-muted-foreground border border-border/60', text: 'text-muted-foreground', ring: 'ring-zinc-400' },
  neutral: { bg: 'bg-muted text-muted-foreground border border-border/60', text: 'text-muted-foreground', ring: 'ring-neutral-400' },
};

export const AppCard: React.FC<AppCardProps> = ({ app, isFavorite, onToggleFavorite }) => {
  const { i18n, t } = useTranslation();
  const colors = COLOR_MAP[app.color] ?? DEFAULT_CARD_COLOR;
  const icon = React.isValidElement(app.icon)
    ? React.cloneElement(app.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'size-4.5',
      })
    : React.createElement(app.icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'size-4.5',
      });
  const isRtl = i18n.language?.startsWith('ar') ?? false;
  const prefetch = useRoutePrefetch();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(app.id);
  };

  const appName = app.displayName ?? t(app.nameKey);
  const appDescription = app.displayDescription ?? t(app.descriptionKey);
  const targetPath = app.route || `/apps/${app.id}`;

  const handleMouseEnter = () => {
    prefetch(targetPath);
    if (app.id) {
      prefetch(`/${app.id}`);
    }
  };

  return (
    <article className="relative group">
      <Link
        to={targetPath}
        aria-label={appName}
        onMouseEnter={handleMouseEnter}
        onFocus={handleMouseEnter}
        className={cn(
          "w-full text-start p-3.5 rounded-xl cursor-pointer block",
          "bg-card border border-border/70 text-foreground",
          "transition-all duration-150 ease-out shadow-2xs",
          "hover:border-border/90 hover:bg-muted/30 hover:shadow-xs",
          "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "inline-flex items-center justify-center shrink-0 size-9 rounded-lg transition-colors shadow-2xs",
            colors.bg,
          )}>
            {icon}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {appName}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
              {appDescription}
            </p>
          </div>
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={Boolean(isFavorite)}
          aria-label={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
          className={cn(
            "absolute top-2.5 z-10 flex size-7 items-center justify-center rounded-lg transition-all",
            isRtl ? "left-2.5" : "right-2.5",
            isFavorite
              ? "text-amber-500 bg-amber-500/10"
              : "text-muted-foreground/40 hover:text-amber-500 hover:bg-muted/60 opacity-0 group-hover:opacity-100",
          )}
          title={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
        >
          <Star className={cn("size-3.5", isFavorite && "fill-amber-500")} />
        </button>
      )}
    </article>
  );
};

export default AppCard;
