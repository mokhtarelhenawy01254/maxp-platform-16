import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppDefinition } from '../../../config/appRegistry';

interface AppCardProps {
  app: AppDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

type AppCardColor = { bg: string; text: string; ring: string; hover: string };

const DEFAULT_CARD_COLOR: AppCardColor = {
  bg: 'bg-gray-500',
  text: 'text-gray-600',
  ring: 'ring-gray-500',
  hover: 'hover:ring-gray-400',
};

const COLOR_MAP: Record<string, AppCardColor> = {
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-500', hover: 'hover:ring-indigo-400' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-500', hover: 'hover:ring-blue-400' },
  green: { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-500', hover: 'hover:ring-green-400' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-600', ring: 'ring-sky-500', hover: 'hover:ring-sky-400' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-500', hover: 'hover:ring-orange-400' },
  pink: { bg: 'bg-pink-500', text: 'text-pink-600', ring: 'ring-pink-500', hover: 'hover:ring-pink-400' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-500', hover: 'hover:ring-purple-400' },
  teal: { bg: 'bg-teal-500', text: 'text-teal-600', ring: 'ring-teal-500', hover: 'hover:ring-teal-400' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', ring: 'ring-cyan-500', hover: 'hover:ring-cyan-400' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', ring: 'ring-yellow-500', hover: 'hover:ring-yellow-400' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', ring: 'ring-slate-500', hover: 'hover:ring-slate-400' },
  red: { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-500', hover: 'hover:ring-red-400' },
  gray: { bg: 'bg-gray-500', text: 'text-gray-600', ring: 'ring-gray-500', hover: 'hover:ring-gray-400' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', ring: 'ring-violet-500', hover: 'hover:ring-violet-400' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500', hover: 'hover:ring-emerald-400' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500', hover: 'hover:ring-amber-400' },
  fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600', ring: 'ring-fuchsia-500', hover: 'hover:ring-fuchsia-400' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-500', hover: 'hover:ring-rose-400' },
  zinc: { bg: 'bg-zinc-500', text: 'text-zinc-600', ring: 'ring-zinc-500', hover: 'hover:ring-zinc-400' },
  neutral: { bg: 'bg-neutral-500', text: 'text-neutral-600', ring: 'ring-neutral-500', hover: 'hover:ring-neutral-400' },
};

const AppCard: React.FC<AppCardProps> = ({ app, isFavorite, onToggleFavorite }) => {
  const { i18n, t } = useTranslation();
  const colors = COLOR_MAP[app.color] ?? DEFAULT_CARD_COLOR;
  const icon = React.isValidElement(app.icon)
    ? React.cloneElement(app.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'h-6 w-6',
      })
    : React.createElement(app.icon as React.ElementType<{ className?: string; 'aria-hidden'?: boolean }>, {
        'aria-hidden': true,
        className: 'h-6 w-6',
      });
  const isRtl = i18n.language?.startsWith('ar') ?? false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(app.id);
  };

  const appName = app.displayName ?? t(app.nameKey);
  const appDescription = app.displayDescription ?? t(app.descriptionKey);

  return (
    <article className="relative">
      <Link
        to={`/apps/${app.id}`}
        className={`
        group relative w-full text-start p-5 rounded-2xl cursor-pointer
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        transition-[border-color,box-shadow,transform] duration-200 ease-out
        hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50
        hover:-translate-y-0.5 hover:ring-2 ${colors.ring}
        focus-visible:outline-none focus-visible:ring-2 ${colors.ring}
        block
      `}
      >
        <div className={`
          inline-flex items-center justify-center
          w-12 h-12 rounded-xl
          bg-gradient-to-br ${app.bgGradient}
          text-white shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30
          group-hover:scale-110
          transition-transform duration-200
          mb-4
        `}>
          {icon}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
          {appName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 break-words">
          {appDescription}
        </p>

        <div className={`
          absolute bottom-0 ${isRtl ? 'right-0' : 'left-0'}
          w-full h-0.5 rounded-b-2xl
          bg-gradient-to-r ${app.bgGradient}
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        `} />
      </Link>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={Boolean(isFavorite)}
          aria-label={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
          className={`
            absolute top-3 ${isRtl ? 'left-3' : 'right-3'}
            z-10 p-1.5 rounded-full
            text-gray-300 hover:text-yellow-400 active:scale-90
            dark:text-gray-600 dark:hover:text-yellow-400
            transition-[color,transform] duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
            ${isFavorite ? '!text-yellow-400' : ''}
          `}
          title={String(isFavorite ? t('appDashboard.removeFromFavorites') : t('appDashboard.addToFavorites'))}
        >
          <svg aria-hidden="true" className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </article>
  );
};

export default AppCard;
