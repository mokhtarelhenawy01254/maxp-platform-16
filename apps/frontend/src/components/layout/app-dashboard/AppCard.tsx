import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppDefinition } from '../../../config/appRegistry';

interface AppCardProps {
  app: AppDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

type AppCardColor = { bg: string; text: string; ring: string };

const DEFAULT_CARD_COLOR: AppCardColor = {
  bg: 'bg-gray-100 dark:bg-gray-700',
  text: 'text-gray-600 dark:text-gray-400',
  ring: 'ring-gray-400 dark:ring-gray-500',
};

const COLOR_MAP: Record<string, AppCardColor> = {
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-400 dark:ring-indigo-500' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400' },
  green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-400' },
  sky: { bg: 'bg-sky-100 dark:bg-sky-900/50', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-400' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-400' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-400' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', ring: 'ring-slate-400' },
  red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-400' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', ring: 'ring-gray-400' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-400' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400' },
  fuchsia: { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/50', text: 'text-fuchsia-600 dark:text-fuchsia-400', ring: 'ring-fuchsia-400' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-400' },
  zinc: { bg: 'bg-zinc-100 dark:bg-zinc-700', text: 'text-zinc-600 dark:text-zinc-400', ring: 'ring-zinc-400' },
  neutral: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-400', ring: 'ring-neutral-400' },
};

const AppCard: React.FC<AppCardProps> = ({ app, isFavorite, onToggleFavorite }) => {
  const { i18n, t } = useTranslation();
  const colors = COLOR_MAP[app.color] ?? DEFAULT_CARD_COLOR;
  const icon = React.isValidElement(app.icon)
    ? React.cloneElement(app.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'h-5 w-5',
      })
    : React.createElement(app.icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'h-5 w-5',
      });
  const isRtl = i18n.language?.startsWith('ar') ?? false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(app.id);
  };

  const appName = app.displayName ?? t(app.nameKey);
  const appDescription = app.displayDescription ?? t(app.descriptionKey);

  return (
    <article className="relative">
      <Link
        to={`/apps/${app.id}`}
        aria-label={appName}
        className={`
        group relative w-full text-start p-4 rounded-xl cursor-pointer
        bg-white dark:bg-gray-800
        border border-gray-200/50 dark:border-gray-700/50
        transition-all duration-200 ease-out
        hover:shadow-md hover:shadow-gray-200/60 dark:hover:shadow-gray-900/60
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        block
      `}
      >
        <div className="flex items-start gap-3">
          <div className={`
            inline-flex items-center justify-center shrink-0
            w-9 h-9 rounded-lg
            ${colors.bg} ${colors.text}
            transition-colors duration-200
          `}>
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {appName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
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
          className={`
            absolute top-2 ${isRtl ? 'left-2' : 'right-2'}
            z-10 p-1 rounded-full
            text-gray-300 hover:text-yellow-400 active:scale-90
            dark:text-gray-600 dark:hover:text-yellow-400
            transition-[color,transform] duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
            ${isFavorite ? '!text-yellow-400' : ''}
          `}
          title={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </article>
  );
};

export default AppCard;
