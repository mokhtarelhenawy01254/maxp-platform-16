export interface StatusConfig {
  labelAr: string;
  labelEn: string;
  badgeClass: string;
}

export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  PENDING: {
    labelAr: 'قيد الانتظار',
    labelEn: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  CONFIRMED: {
    labelAr: 'تم التأكيد',
    labelEn: 'Confirmed',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  ASSIGNED: {
    labelAr: 'تم تعيين المندوب',
    labelEn: 'Assigned',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  },
  PICKED_UP: {
    labelAr: 'تم الاستلام',
    labelEn: 'Picked Up',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800',
  },
  IN_TRANSIT: {
    labelAr: 'قيد النقل',
    labelEn: 'In Transit',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
  },
  OUT_FOR_DELIVERY: {
    labelAr: 'قيد التسليم',
    labelEn: 'Out for Delivery',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  },
  DELIVERED: {
    labelAr: 'تم التسليم بنجاح',
    labelEn: 'Delivered',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  FAILED_ATTEMPT: {
    labelAr: 'محاولة فاشلة',
    labelEn: 'Failed Attempt',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
  },
  RETURNED: {
    labelAr: 'مرتجع',
    labelEn: 'Returned',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
  CANCELLED: {
    labelAr: 'ملغية',
    labelEn: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

export function getStatusBadge(status?: string | null, isEn = false) {
  const norm = (status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIGS[norm] || {
    labelAr: norm,
    labelEn: norm,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };
  return {
    label: isEn ? config.labelEn : config.labelAr,
    badgeClass: config.badgeClass,
  };
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount?: number | null, currency = 'EGP'): string {
  if (amount === undefined || amount === null) return `0 ${currency}`;
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}
