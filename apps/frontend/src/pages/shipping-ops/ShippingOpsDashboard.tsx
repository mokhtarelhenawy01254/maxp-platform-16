import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PackagePlus,
  RefreshCw,
  Truck,
  CheckCircle2,
  XCircle,
  Banknote,
  Clock,
  ArrowRight,
  Eye,
  Boxes,
} from 'lucide-react';
import { shippingOpsService, DashboardStats } from '../../services/shippingOpsService';
import { getStatusBadge, formatDate, formatCurrency } from './shippingOpsShared';

export const ShippingOpsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shippingOpsService.getDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('shippingOps.loadError', 'حدث خطأ أثناء تحميل البيانات');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Page Header (No nav element) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('shippingOps.dashboard', 'لوحة تشغيل الشحن')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('shippingOps.subtitle', 'إدارة الطرود المستقلة، تسعير العملاء، ومتابعة حركة الشحنات والتسليم')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : 'تحديث'}</span>
          </button>
          <Link
            to="/shipping-ops/parcels"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Boxes className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{t('shippingOps.parcels', 'سجل الطرود')}</span>
          </Link>
          <Link
            to="/shipping-ops/parcels/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm transition active:scale-95"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{t('shippingOps.newParcel', 'إنشاء طرد جديد')}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Today Parcels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.todayShipments', 'شحنات اليوم')}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {loading ? '—' : stats?.todayCount ?? 0}
          </div>
        </div>

        {/* Out for Delivery */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.outForDelivery', 'قيد التسليم')}</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
            {loading ? '—' : stats?.outForDeliveryCount ?? 0}
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.delivered', 'مسلّمة بنجاح')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {loading ? '—' : stats?.deliveredCount ?? 0}
          </div>
        </div>

        {/* Returned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.returned', 'مرتجعة')}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {loading ? '—' : stats?.returnedCount ?? 0}
          </div>
        </div>

        {/* Expected COD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.codExpected', 'COD متوقع')}</span>
            <Banknote className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
            {loading ? '—' : formatCurrency(stats?.codExpected)}
          </div>
        </div>

        {/* Collected COD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('shippingOps.kpi.codCollected', 'COD محصّل')}</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
            {loading ? '—' : formatCurrency(stats?.codCollected)}
          </div>
        </div>
      </div>

      {/* Recent 10 Shipments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm sm:text-base font-semibold">
              {t('shippingOps.recentShipments', 'آخر ١٠ شحنات مسجلة')}
            </h2>
          </div>
          <Link
            to="/shipping-ops/parcels"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1"
          >
            <span>{isEn ? 'View all' : 'عرض الكل'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.trackingNumber', 'رقم التتبع')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.recipient', 'المستلم')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.destination', 'الوجهة')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.merchant', 'العميل')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.cod', 'مبلغ التحصيل')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.cost', 'التكلفة')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.status', 'الحالة')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.list.createdAt', 'التاريخ')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('shippingOps.list.actions', 'إجراء')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !stats ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading shipments...' : 'جاري تحميل الشحنات...'}</span>
                  </td>
                </tr>
              ) : !stats?.recentShipments || stats.recentShipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    {t('shippingOps.list.noParcelsFound', 'لا توجد شحنات مسجلة بعد')}
                  </td>
                </tr>
              ) : (
                stats.recentShipments.map((s) => {
                  const badge = getStatusBadge(s.status, isEn);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                        <Link to={`/shipping-ops/parcels/${s.id}`} className="hover:underline">
                          {s.trackingNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{s.recipientName}</div>
                        <div className="text-xs text-slate-500 font-mono" dir="ltr">{s.recipientPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-slate-100">{s.destinationGovernorate}</div>
                        {s.destinationCity && (
                          <div className="text-xs text-slate-500">{s.destinationCity}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {s.merchant?.name || (isEn ? 'Direct' : 'مباشر')}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(s.codAmount)}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-600 dark:text-slate-400">
                        {formatCurrency(s.cost)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/shipping-ops/parcels/${s.id}`}
                          className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title={t('shippingOps.list.viewDetails', 'عرض التفاصيل')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShippingOpsDashboard;
