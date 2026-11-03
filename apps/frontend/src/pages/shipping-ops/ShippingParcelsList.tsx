import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PackagePlus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Boxes,
  CheckCircle2,
  Copy,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  shippingOpsService,
  ShipmentItem,
  MerchantItem,
  ShipmentsQuery,
} from '../../services/shippingOpsService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { getStatusBadge, formatDate, formatCurrency, printShipmentLabel } from './shippingOpsShared';
import { DateInput } from '../../components/ui/DateInput';

export const ShippingParcelsList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Cancel Modal State
  const [cancellingShipment, setCancellingShipment] = useState<ShipmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Load merchants list for filter
  useEffect(() => {
    shippingOpsService
      .getMerchants()
      .then(setMerchants)
      .catch((err) => console.warn('Failed to load merchants', err));
  }, []);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query: ShipmentsQuery = {
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status || undefined,
        governorate: governorate || undefined,
        merchantId: merchantId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };

      const res = await shippingOpsService.getShipments(query);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray((res as any)?.items) ? (res as any).items : []);
      setShipments(list);
      setTotalPages(res?.pagination?.totalPages || (res as any)?.totalPages || 1);
      setTotalCount(res?.pagination?.total || (res as any)?.total || list.length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('shippingOps.loadError', 'حدث خطأ أثناء جلب قائمة الشحنات');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, governorate, merchantId, fromDate, toDate, t]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setGovernorate('');
    setMerchantId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking);
    toast.success(isEn ? 'Tracking number copied' : 'تم نسخ رقم التتبع بنجاح');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingShipment) return;
    try {
      setCancelLoading(true);
      await shippingOpsService.cancelShipment(cancellingShipment.id, cancelReason);
      toast.success(isEn ? 'Shipment cancelled successfully' : 'تم إلغاء الشحنة بنجاح');
      setCancellingShipment(null);
      setCancelReason('');
      loadShipments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إلغاء الشحنة';
      toast.error(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Page Header (No nav element) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('shippingOps.parcels', 'سجل الشحنات والطرود')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('shippingOps.subtitle', 'إدارة الطرود المستقلة، تسعير العملاء، ومتابعة حركة الشحنات والتسليم')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadShipments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : 'تحديث'}</span>
          </button>
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

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('shippingOps.list.searchPlaceholder', 'بحث برقم التتبع، المستلم، أو الهاتف...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('shippingOps.list.filterAllStatus', 'جميع الحالات')}</option>
              <option value="PENDING">{t('shippingOps.statusLabels.PENDING', 'قيد الانتظار (PENDING)')}</option>
              <option value="CONFIRMED">{t('shippingOps.statusLabels.CONFIRMED', 'تم التأكيد')}</option>
              <option value="OUT_FOR_DELIVERY">{t('shippingOps.statusLabels.OUT_FOR_DELIVERY', 'قيد التسليم')}</option>
              <option value="DELIVERED">{t('shippingOps.statusLabels.DELIVERED', 'تم التسليم')}</option>
              <option value="FAILED_ATTEMPT">{t('shippingOps.statusLabels.FAILED_ATTEMPT', 'محاولة فاشلة')}</option>
              <option value="RETURNED">{t('shippingOps.statusLabels.RETURNED', 'مرتجع')}</option>
              <option value="CANCELLED">{t('shippingOps.statusLabels.CANCELLED', 'ملغية')}</option>
            </select>
          </div>

          {/* Governorate Filter */}
          <div>
            <select
              value={governorate}
              onChange={(e) => {
                setGovernorate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('shippingOps.list.filterAllGov', 'جميع المحافظات')}</option>
              {EGYPT_GOVERNORATES.map((g) => (
                <option key={g.id} value={g.nameAr}>
                  {isEn ? g.nameEn : g.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Merchant Filter */}
          <div>
            <select
              value={merchantId}
              onChange={(e) => {
                setMerchantId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('shippingOps.list.filterAllMerchants', 'جميع العملاء / التجار')}</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">{t('shippingOps.list.dateFrom', 'من')}:</span>
            <DateInput
              
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
            <span className="text-slate-500 font-medium">{t('shippingOps.list.dateTo', 'إلى')}:</span>
            <DateInput
              
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          {(search || status || governorate || merchantId || fromDate || toDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Parcels Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
              {loading && shipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading parcels...' : 'جاري تحميل الشحنات...'}</span>
                  </td>
                </tr>
              ) : (!shipments || shipments.length === 0) ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{t('shippingOps.list.noParcelsFound', 'لم يتم العثور على أي شحنات')}</span>
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const badge = getStatusBadge(s.status, isEn);
                  const isCancelable = s.status === 'PENDING';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono font-medium text-blue-600 dark:text-blue-400">
                          <Link to={`/shipping-ops/parcels/${s.id}`} className="hover:underline">
                            {s.trackingNumber}
                          </Link>
                          <button
                            onClick={() => printShipmentLabel(s.id, s.trackingNumber)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title={isEn ? 'Print Waybill (A6)' : 'طباعة البوليصة'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopyTracking(s.trackingNumber)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                            title="نسخ رقم التتبع"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/shipping-ops/parcels/${s.id}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title={t('shippingOps.list.viewDetails', 'عرض التفاصيل')}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => printShipmentLabel(s.id, s.trackingNumber)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title={isEn ? 'Print Waybill (A6)' : 'طباعة البوليصة'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isCancelable && (
                            <button
                              onClick={() => {
                                setCancellingShipment(s);
                                setCancelReason('');
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title={t('shippingOps.list.cancelShipment', 'إلغاء الشحنة')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            <span>{t('shippingOps.list.totalRecords', 'إجمالي الشحنات')}: </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{isEn ? 'Previous' : 'السابق'}</span>
            </button>
            <span className="px-2 font-medium">
              {t('shippingOps.list.page', 'صفحة')} {page} {t('shippingOps.list.of', 'من')} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <span>{isEn ? 'Next' : 'التالي'}</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {cancellingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t('shippingOps.list.cancelConfirmTitle', 'تأكيد إلغاء الشحنة')}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('shippingOps.list.cancelConfirmDesc', 'هل أنت متأكد من رغبتك في إلغاء هذه الشحنة؟ لا يمكن التراجع عن هذا الإجراء.')}
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
              <div><span className="text-slate-400">رقم التتبع:</span> <span className="font-mono font-medium">{cancellingShipment.trackingNumber}</span></div>
              <div><span className="text-slate-400">المستلم:</span> <span className="font-medium">{cancellingShipment.recipientName}</span></div>
            </div>
            <div>
              <label htmlFor="cancelReason" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                سبب الإلغاء (اختياري)
              </label>
              <input
                id="cancelReason"
                type="text"
                placeholder="طلب العميل، خطأ في العنوان، تكرار..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingShipment(null)}
                disabled={cancelLoading}
                className="px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                {t('shippingOps.list.cancelDismissBtn', 'تراجع')}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition active:scale-95 disabled:opacity-50"
              >
                {cancelLoading ? 'جاري الإلغاء...' : t('shippingOps.list.confirmCancelBtn', 'تأكيد الإلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingParcelsList;
