import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Factory,
  ClipboardList,
  ListTree,
  LineChart,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/manufacturing', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/manufacturing/orders', label: 'أوامر الإنتاج والتشغيل', icon: ClipboardList },
  { to: '/manufacturing/boms', label: 'قوائم المكونات (BOM)', icon: ListTree },
  { to: '/manufacturing/reports', label: 'تقارير الإنتاج والتكاليف', icon: LineChart },
  { to: '/manufacturing/settings', label: 'إعدادات التصنيع', icon: Settings },
];

interface ManufacturingHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const ManufacturingHeader: React.FC<ManufacturingHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="border-b border-border/70 bg-card sticky top-0 z-20">
      {/* Top Action Bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title || 'نظام إدارة عمليات وخطوط الإنتاج (MES)'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {subtitle || 'تتبع قوائم المكونات وأوامر التشغيل وتكلفة القطعة الفعلية والربط مع WIP'}
            </p>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Horizontal Tab Navigation */}
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

export default ManufacturingHeader;
