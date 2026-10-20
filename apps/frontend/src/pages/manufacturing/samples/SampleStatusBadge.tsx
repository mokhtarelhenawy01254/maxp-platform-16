import React from 'react';
import { SampleOrderStatus, SampleMaterialSource } from '../manufacturingApi';

interface SampleStatusBadgeProps {
  status: SampleOrderStatus;
  className?: string;
}

export const SampleStatusBadge: React.FC<SampleStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<SampleOrderStatus, { label: string; bg: string; text: string; border: string }> = {
    DRAFT: {
      label: 'مسودة',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-700 dark:text-zinc-300',
      border: 'border-zinc-200 dark:border-zinc-700',
    },
    IN_PROGRESS: {
      label: 'قيد التنفيذ',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    APPROVED: {
      label: 'معتمدة',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    REJECTED: {
      label: 'مرفوضة',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
    },
    CONVERTED: {
      label: 'تم التحويل لأمر تشغيل',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
  };

  const config = configs[status] || configs.DRAFT;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {config.label}
    </span>
  );
};

export const MaterialSourceBadge: React.FC<{ source: SampleMaterialSource; className?: string }> = ({
  source,
  className = '',
}) => {
  const isCustomer = source === 'CUSTOMER';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
        isCustomer
          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      } ${className}`}
    >
      {isCustomer ? 'خامة العميل' : 'خامة من عندنا'}
    </span>
  );
};
