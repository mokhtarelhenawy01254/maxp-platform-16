import React from 'react';
import { WorkspaceOrder } from '../../types';

interface WorkspaceInspectorDispositionsProps {
  order: WorkspaceOrder;
  isBusy: boolean;
  onLogCall: (order: WorkspaceOrder, result: string) => void;
  isArabic: boolean;
}

export const WorkspaceInspectorDispositions: React.FC<WorkspaceInspectorDispositionsProps> = ({
  order,
  isBusy,
  onLogCall,
  isArabic,
}) => {
  const dispositions = [
    {
      key: 'unreached',
      label: isArabic ? 'لم يرد' : 'Unreached',
      color: 'hover:bg-amber-500/10 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400',
    },
    {
      key: 'busy',
      label: isArabic ? 'مشغول / مغلق' : 'Busy',
      color: 'hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400',
    },
    {
      key: 'callback',
      label: isArabic ? 'إعادة اتصال' : 'Callback',
      color: 'hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400',
    },
    {
      key: 'wrong_number',
      label: isArabic ? 'رقم خاطئ' : 'Wrong No.',
      color: 'hover:bg-zinc-500/10 hover:text-zinc-600 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-300',
    },
    {
      key: 'reached',
      label: isArabic ? 'تم الرد' : 'Answered',
      color: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400',
    },
  ];

  return (
    <section className="border-b border-border/30 pb-3 dark:border-slate-800/80">
      <div className="flex flex-wrap gap-1.5">
        {dispositions.map((disp) => (
          <button
            key={disp.key}
            type="button"
            disabled={isBusy}
            onClick={() => onLogCall(order, disp.key)}
            className={`rounded-md border border-border/40 bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 ${disp.color}`}
          >
            {disp.label}
          </button>
        ))}
      </div>
    </section>
  );
};
