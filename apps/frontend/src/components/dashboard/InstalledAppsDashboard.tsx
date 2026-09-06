import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  SparklesIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { DashboardInstalledApp, DashboardBusinessSpecialty } from '../../pages/dashboard/types';

interface InstalledAppsDashboardProps {
  installedApps: DashboardInstalledApp[];
  businessSpecialty?: DashboardBusinessSpecialty | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const APP_ROUTE_MAP: Record<string, string> = {
  store: '/orders',
  'store-basic': '/orders',
  'store-pro': '/orders',
  products: '/products',
  'whatsapp-business': '/whatsapp',
  'telegram-business': '/telegram',
  'telegram-integration': '/telegram',
  'medical-system': '/doctor/dashboard',
  'dental-lab-app': '/dental-lab',
  'booking-app': '/appointments',
  'facebook-ads-pro': '/advertising/facebook-ads',
  'facebook-pages-connect': '/marketing/facebook',
  'facebook-post': '/marketing/facebook-post',
  'instagram-business': '/instagram-inbox',
  'tiktok-integrations': '/tiktok-inbox',
  'ai-chat-basic': '/admin/ai-hub',
  'crm-lite': '/customers',
  'crm-basic': '/customers',
  'inventory-pro': '/inventory',
  'pos-pro': '/pos',
  'coupons-pro': '/coupons',
  'wholesale-pro': '/wholesale',
  'affiliate-pro': '/affiliates/dashboard',
  'amazon-affiliate-pro': '/amazon-affiliate',
  'blog-pro': '/articles',
  'order-shipping-turbo': '/shipping-companies',
  'order-shipping-hub': '/shipping-companies',
  'order-shipping-bosta': '/shipping-companies',
  'order-shipping-qpexpress': '/shipping-companies',
  'order-shipping': '/shipping-companies',
  shipping: '/shipping-companies',
  'procurement-pro': '/procurement',
  'hr-basic': '/hr',
  'unified-inbox': '/unified-inbox',
  'analytics-basic': '/analytics/orders',
  'orders-analytics': '/analytics/orders',
  'order-automation': '/orders/automation',
  'bulk-search': '/bulk-search',
  'customer-blocks': '/settings/customer-blocks',
  'bulk-orders': '/orders',
  'agent-workspace': '/orders',
  'cod-deposit': '/orders',
  'notification-automation': '/notifications/settings',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COMMUNICATION: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  ECOMMERCE: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  MARKETING: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  ORDER_OPS: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  MEDICAL: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  AI: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  ANALYTICS: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  HR: { bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
};

export const InstalledAppsDashboard: React.FC<InstalledAppsDashboardProps> = ({
  installedApps,
  businessSpecialty,
  onRefresh,
  isRefreshing = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    installedApps.forEach((app) => {
      if (app.category) cats.add(app.category.toUpperCase());
    });
    return ['ALL', ...Array.from(cats)];
  }, [installedApps]);

  const filteredApps = useMemo(() => {
    return installedApps.filter((app) => {
      const matchesSearch =
        !search.trim() ||
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.slug.toLowerCase().includes(search.toLowerCase()) ||
        (app.description && app.description.toLowerCase().includes(search.toLowerCase()));

      const matchesCat =
        selectedCategory === 'ALL' ||
        (app.category && app.category.toUpperCase() === selectedCategory);

      return matchesSearch && matchesCat;
    });
  }, [installedApps, search, selectedCategory]);

  const stats = useMemo(() => {
    const active = installedApps.filter((a) => a.status?.toUpperCase() === 'ACTIVE').length;
    const trial = installedApps.filter((a) => a.status?.toUpperCase() === 'TRIAL').length;
    return { total: installedApps.length, active, trial };
  }, [installedApps]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              إجمالي التطبيقات المفعلة
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CubeIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground font-medium">تطبيق مثبت</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              اشتراكات نشطة
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600">{stats.active}</span>
            <span className="text-xs text-muted-foreground font-medium">اشتراك فعال</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              فترات تجريبية نشطة
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ClockIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-600">{stats.trial}</span>
            <span className="text-xs text-muted-foreground font-medium">تجربة مجانية</span>
          </div>
        </div>
      </div>

      {/* Specialty Banner if available */}
      {businessSpecialty && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">تخصص نشاطك</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                  {businessSpecialty.nameAr || businessSpecialty.nameEn || businessSpecialty.slug}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                لوحة تحكمك مجهزة تلقائياً بالأدوات والخدمات المناسبة لقطاعك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            تصفح متجر التطبيقات
          </button>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بين التطبيقات المثبتة..."
            className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat === 'ALL' ? 'جميع التطبيقات' : cat}
            </button>
          ))}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="تحديث البيانات"
              className="p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Installed Apps */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-border rounded-3xl bg-card/40">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <CubeIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {search ? 'لا توجد تطبيقات مطابقة لبحثك' : 'لا توجد تطبيقات مثبتة حالياً'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? 'جرّب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً'
              : 'قم بزيارة متجر التطبيقات لتفعيل الأدوات التي تناسب طبيعة أعمالك'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            تصفح متجر التطبيقات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredApps.map((app) => {
            const isTrial = app.status?.toUpperCase() === 'TRIAL';
            const route = APP_ROUTE_MAP[app.slug] || `/apps/${app.slug}`;
            const catColor = CATEGORY_COLORS[app.category?.toUpperCase() || ''] || {
              bg: 'bg-muted/60',
              text: 'text-muted-foreground',
              border: 'border-border',
            };

            return (
              <div
                key={app.id || app.slug}
                className="group relative bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <CubeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {app.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                          >
                            {app.category || 'أداة'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isTrial ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">
                        <ClockIcon className="w-3 h-3" />
                        {app.daysRemainingInTrial != null
                          ? `${app.daysRemainingInTrial} يوم تجريبي`
                          : 'فترة تجريبية'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
                        <CheckCircleIcon className="w-3 h-3" />
                        نشط
                      </span>
                    )}
                  </div>

                  {app.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/marketplace/apps/${app.slug}/settings`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 text-xs font-semibold transition-colors"
                  >
                    <Cog6ToothIcon className="w-3.5 h-3.5" />
                    الإعدادات
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(route)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>فتح التطبيق</span>
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InstalledAppsDashboard;