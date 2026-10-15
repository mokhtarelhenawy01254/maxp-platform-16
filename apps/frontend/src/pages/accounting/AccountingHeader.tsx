import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Landmark,
  ListTree,
  FileSpreadsheet,
  BookOpen,
  Scale,
  LineChart,
  Building2,
  Calendar,
  Receipt,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/accounting', label: 'نظرة عامة', icon: Landmark, end: true },
  { to: '/accounting/coa', label: 'دليل الحسابات', icon: ListTree },
  { to: '/accounting/entries', label: 'قيود اليومية', icon: FileSpreadsheet },
  { to: '/accounting/ledger', label: 'الأستاذ العام', icon: BookOpen },
  { to: '/accounting/trial-balance', label: 'ميزان المراجعة', icon: Scale },
  { to: '/accounting/income-statement', label: 'قائمة الدخل', icon: LineChart },
  { to: '/accounting/balance-sheet', label: 'الميزانية العمومية', icon: Building2 },
  { to: '/accounting/periods', label: 'الفترات المالية', icon: Calendar },
  { to: '/accounting/vat-report', label: 'إقرار ض.ق.م', icon: Receipt },
  { to: '/accounting/settings', label: 'الإعدادات والترحيل', icon: Settings },
];

interface AccountingHeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export const AccountingHeader: React.FC<AccountingHeaderProps> = ({ title, actions }) => {
  return (
    <div className="border-b border-border/70 bg-card sticky top-0 z-20">
      {/* Top action bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title || 'نظام الحسابات المالية العامة'}
            </h1>
            <p className="text-xs text-muted-foreground">
              النظام المحاسبي المزدوج المتوافق مع معايير المحاسبة المصرية (EAS)
            </p>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Horizontal navigation tabs */}
      <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-border/60">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5 font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default AccountingHeader;
