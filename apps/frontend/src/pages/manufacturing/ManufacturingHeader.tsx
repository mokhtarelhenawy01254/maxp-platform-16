import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Factory,
  ClipboardList,
  ListTree,
  ListOrdered,
  LineChart,
  Settings,
  LayoutDashboard,
  FileText,
  Building2,
  Calculator,
  ShieldCheck,
  BookOpen,
  Ruler,
  FlaskConical,
} from 'lucide-react';
import { manufacturingApi } from './manufacturingApi';

interface NavItemConfig {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
  isReviewTab?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { to: '/manufacturing', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/manufacturing/samples', label: 'أوامر العينات', icon: FlaskConical },
  { to: '/manufacturing/customer-orders', label: 'أوامر العملاء (التصنيع للغير)', icon: FileText },
  { to: '/manufacturing/orders', label: 'أوامر الإنتاج والتشغيل', icon: ClipboardList },
  { to: '/manufacturing/partner-factories', label: 'المصانع الشركاء', icon: Building2 },
  { to: '/manufacturing/reviews', label: 'مراجعة تحديثات المصانع', icon: ShieldCheck, isReviewTab: true },
  { to: '/manufacturing/boms', label: 'قوائم المكونات (BOM)', icon: ListTree },
  { to: '/manufacturing/stage-templates', label: 'مكتبة مراحل الإنتاج', icon: ListOrdered },
  { to: '/manufacturing/tech-packs', label: 'ملفات المنتجات الفنية', icon: BookOpen },
  { to: '/manufacturing/size-charts', label: 'جداول المقاسات', icon: Ruler },
  { to: '/manufacturing/fabric-calculator', label: 'حاسبة القماش', icon: Calculator },
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
  const [underReviewCount, setUnderReviewCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    manufacturingApi
      .listReviews({ reviewStatus: 'UNDER_REVIEW' })
      .then((res) => {
        if (isMounted) setUnderReviewCount(res.underReviewCount || 0);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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
              {item.isReviewTab && underReviewCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {underReviewCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default ManufacturingHeader;
