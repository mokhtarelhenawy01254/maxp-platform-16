import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BanknotesIcon,
  TableCellsIcon,
  DocumentDuplicateIcon,
  BookOpenIcon,
  ScaleIcon,
  PresentationChartLineIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ReceiptPercentIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const NAV_ITEMS = [
  { to: '/accounting', label: 'نظرة عامة', icon: BanknotesIcon, end: true },
  { to: '/accounting/coa', label: 'دليل الحسابات', icon: TableCellsIcon },
  { to: '/accounting/entries', label: 'قيود اليومية', icon: DocumentDuplicateIcon },
  { to: '/accounting/ledger', label: 'الأستاذ العام', icon: BookOpenIcon },
  { to: '/accounting/trial-balance', label: 'ميزان المراجعة', icon: ScaleIcon },
  { to: '/accounting/income-statement', label: 'قائمة الدخل', icon: PresentationChartLineIcon },
  { to: '/accounting/balance-sheet', label: 'الميزانية العمومية', icon: BuildingLibraryIcon },
  { to: '/accounting/periods', label: 'الفترات المالية', icon: CalendarDaysIcon },
  { to: '/accounting/vat-report', label: 'إقرار ض.ق.م', icon: ReceiptPercentIcon },
  { to: '/accounting/settings', label: 'الإعدادات والترحيل', icon: Cog6ToothIcon },
];

interface AccountingHeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export const AccountingHeader: React.FC<AccountingHeaderProps> = ({ title, actions }) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
      {/* Top action bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BanknotesIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {title || 'نظام الحسابات المالية العامة'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              النظام المحاسبي المزدوج المتوافق مع معايير المحاسبة المصرية (EAS)
            </p>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Horizontal navigation tabs */}
      <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/60">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
