import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

interface WorkspaceInspectorEmptyStateProps {
  confirmationDisabled?: boolean;
  isArabic: boolean;
  t: (key: string) => string;
}

export const WorkspaceInspectorEmptyState: React.FC<WorkspaceInspectorEmptyStateProps> = ({
  confirmationDisabled,
  isArabic,
  t,
}) => {
  if (confirmationDisabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <ExclamationTriangleIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-foreground dark:text-slate-100">
          {isArabic ? 'مركز التأكيد مقفول من الإعدادات' : 'Confirmation Center Disabled'}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground dark:text-slate-400">
          {isArabic
            ? 'تم إيقاف مركز التأكيد من الإعدادات، ولن تظهر أي طلبات في قائمة التأكيد حتى يتم تفعيله من صفحة الإعدادات.'
            : 'Order confirmation center is disabled in settings. No orders will appear until enabled from settings.'}
        </p>
        <Link
          to="/settings/orders?tab=confirmation"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
        >
          <span>{isArabic ? 'فتح إعدادات مركز التأكيد' : 'Open Confirmation Settings'}</span>
          <span>←</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <ShoppingBagIcon className="h-12 w-12 stroke-[1.5] text-muted-foreground/40 dark:text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-foreground dark:text-slate-200">
        {t('orders.noOrderSelected')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
        {t('orders.selectOrderFromList')}
      </p>
    </div>
  );
};
