import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Settings,
  Sparkles,
  Plus,
  RotateCw,
} from 'lucide-react';
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
  'order-preparation': '/orders/preparation',
  'order-preparation-hold': '/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COMMUNICATION: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  ECOMMERCE: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  MARKETING: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  ORDER_OPS: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  MEDICAL: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
  AI: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
  ANALYTICS: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20' },
  HR: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
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
    <div className="space-y-4">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              إجمالي التطبيقات المفعلة
            </span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Package className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-bold tracking-tight text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground font-medium">تطبيق مثبت</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              اشتراكات نشطة
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.active}</span>
            <span className="text-xs text-muted-foreground font-medium">اشتراك فعال</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              فترات تجريبية
            </span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats.trial}</span>
            <span className="text-xs text-muted-foreground font-medium">تجربة مجانية</span>
          </div>
        </div>
      </div>

      {/* Specialty Banner if available */}
      {businessSpecialty && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">تخصص نشاطك</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
                  {businessSpecialty.nameAr || businessSpecialty.nameEn || businessSpecialty.slug}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                لوحة تحكمك مجهزة تلقائياً بالأدوات والخدمات المناسبة لقطاعك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
          >
            <Plus className="size-3.5" />
            متجر التطبيقات
          </button>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بين التطبيقات..."
            className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
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
              className="p-1.5 rounded-lg border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              aria-label="تحديث البيانات"
            >
              <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Installed Apps */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-border/70 rounded-xl bg-card/40">
          <div className="size-11 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-2.5">
            <Package className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
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
            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="size-3.5" />
            متجر التطبيقات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredApps.map((app) => {
            const isTrial = app.status?.toUpperCase() === 'TRIAL';
            const route = APP_ROUTE_MAP[app.slug] || `/apps/${app.slug}`;
            const catColor = CATEGORY_COLORS[app.category?.toUpperCase() || ''] || {
              bg: 'bg-muted/50',
              text: 'text-muted-foreground',
              border: 'border-border/60',
            };

            return (
              <div
                key={app.id || app.slug}
                className="group relative bg-card border border-border/70 hover:border-border hover:shadow-sm rounded-xl p-3.5 flex flex-col justify-between transition-all duration-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Package className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {app.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                          >
                            {app.category || 'أداة'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isTrial ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        <Clock className="size-2.5" />
                        {app.daysRemainingInTrial != null
                          ? `${app.daysRemainingInTrial} يوم تجريبي`
                          : 'فترة تجريبية'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        <CheckCircle2 className="size-2.5" />
                        نشط
                      </span>
                    )}
                  </div>

                  {app.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/marketplace/apps/${app.slug}/settings`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-colors"
                  >
                    <Settings className="size-3" />
                    الإعدادات
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(route)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-xs"
                  >
                    <span>فتح التطبيق</span>
                    <ExternalLink className="size-3 rtl:rotate-180" />
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