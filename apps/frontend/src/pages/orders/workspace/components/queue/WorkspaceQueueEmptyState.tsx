import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface WorkspaceQueueEmptyStateProps {
  loading?: boolean;
  confirmationDisabled?: boolean;
  activeTab?: string;
  fetchError?: string | null;
  onRetry?: () => void;
  isArabic: boolean;
  riskOnly?: boolean;
  inStream?: boolean;
}

export const WorkspaceQueueEmptyState: React.FC<WorkspaceQueueEmptyStateProps> = ({
  loading,
  confirmationDisabled,
  activeTab,
  fetchError,
  onRetry,
  isArabic,
  riskOnly = false,
  inStream = false,
}) => {
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-xs font-medium text-muted-foreground dark:text-slate-400">
          {isArabic ? 'جارٍ تحميل طلبات الطابور…' : 'Loading workspace orders…'}
        </p>
      </div>
    );
  }

  const isConfirmationTab = activeTab === 'pending' || activeTab === 'all' || activeTab === 'confirmation';

  if (confirmationDisabled && isConfirmationTab) {
    if (inStream) {
      return (
        <div className="m-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center dark:border-amber-500/30 dark:bg-amber-950/20">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <h4 className="mt-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            {isArabic ? 'المركز مقفول من الإعدادات' : 'Confirmation Center Disabled'}
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/80">
            {isArabic
              ? 'تم إيقاف مركز التأكيد من الإعدادات، ولن تظهر أي طلبات في قائمة التأكيد حتى يتم تفعيله.'
              : 'Order confirmation center is disabled in settings. No orders will appear until enabled.'}
          </p>
          <Link
            to="/settings/orders?tab=confirmation"
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <span>{isArabic ? 'الانتقال لإعدادات التأكيد ←' : 'Go to Settings →'}</span>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <ExclamationTriangleIcon className="h-6 w-6" />
        </div>
        <h4 className="mt-3 text-sm font-bold text-foreground dark:text-slate-100">
          {isArabic ? 'المركز مقفول من الإعدادات' : 'Confirmation Center Disabled'}
        </h4>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs dark:text-slate-400">
          {isArabic
            ? 'تم إيقاف مركز التأكيد من الإعدادات، ولن تظهر أي طلبات في قائمة التأكيد حتى يتم تفعيله.'
            : 'Order confirmation center is disabled in settings. No orders will appear until enabled.'}
        </p>
        <Link
          to="/settings/orders?tab=confirmation"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          <span>{isArabic ? 'الانتقال لإعدادات التأكيد ←' : 'Go to Settings →'}</span>
        </Link>
      </div>
    );
  }

  if (inStream) {
    return (
      <div className="flex h-32 flex-col items-center justify-center p-4 text-center text-muted-foreground dark:text-slate-400">
        <p className="text-xs font-medium">
          {riskOnly
            ? isArabic
              ? 'لا توجد طلبات عالية الخطورة'
              : 'No high-risk orders'
            : isArabic
            ? 'لا توجد طلبات مطابقة'
            : 'No matching orders'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400">
        {fetchError ? (
          <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
        ) : (
          <CheckCircleIcon className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground text-balance dark:text-slate-200">
        {fetchError
          ? fetchError
          : activeTab === 'incomplete'
          ? isArabic
            ? 'لا توجد سلات متروكة'
            : 'No abandoned carts'
          : isArabic
          ? 'لا توجد طلبات قيد الانتظار'
          : 'No pending orders'}
      </p>
      {fetchError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {isArabic ? 'إعادة المحاولة' : 'Try again'}
        </button>
      )}
    </div>
  );
};
