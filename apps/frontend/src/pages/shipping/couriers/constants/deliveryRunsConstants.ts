export interface StatusConfig {
  label: string;
  color: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  DISPATCHED: {
    label: 'في الميدان',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
  },
  COMPLETED: {
    label: 'اكتمل التوصيل',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  },
  SETTLED: {
    label: 'تمت التسوية والتوريد',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  },
  DRAFT: {
    label: 'مسودة',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
  },
  CANCELLED: {
    label: 'ملغاة',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
  }
};
