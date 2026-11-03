import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Copy,
  Clock,
  User,
  MapPin,
  Package,
  Banknote,
  Building2,
  XCircle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { shippingOpsService, ShipmentItem } from '../../services/shippingOpsService';
import { getStatusBadge, formatDate, formatCurrency, printShipmentLabel } from './shippingOpsShared';

export const ShippingParcelDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [shipment, setShipment] = useState<ShipmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel dialog state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadShipment = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await shippingOpsService.getShipmentById(id);
      setShipment(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('shippingOps.loadError', 'حدث خطأ أثناء تحميل بيانات الشحنة');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadShipment();
  }, [loadShipment]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isEn ? 'Copied to clipboard' : 'تم النسخ للحافظة');
  };

  const handleCancel = async () => {
    if (!shipment) return;
    try {
      setCancelLoading(true);
      const updated = await shippingOpsService.cancelShipment(shipment.id, cancelReason);
      toast.success(isEn ? 'Shipment cancelled successfully' : 'تم إلغاء الشحنة بنجاح');
      setShipment(updated);
      setShowCancelModal(false);
      setCancelReason('');
      loadShipment();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إلغاء الشحنة';
      toast.error(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading && !shipment) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
        <span>{isEn ? 'Loading shipment details...' : 'جاري تحميل تفاصيل الشحنة...'}</span>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
          {error || 'الشحنة غير موجودة'}
        </div>
        <Link
          to="/shipping-ops/parcels"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span>{isEn ? 'Back to Parcels' : 'العودة لسجل الشحنات'}</span>
        </Link>
      </div>
    );
  }

  const badge = getStatusBadge(shipment.status, isEn);
  const isPending = shipment.status === 'PENDING';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Header (No nav element) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/shipping-ops/parcels" className="hover:underline">
              {t('shippingOps.parcels', 'الشحنات والطرود')}
            </Link>
            <span>/</span>
            <span className="font-mono">{shipment.trackingNumber}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">
              {shipment.trackingNumber}
            </h1>
            <button
              onClick={() => handleCopy(shipment.trackingNumber)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="نسخ رقم التتبع"
            >
              <Copy className="w-4 h-4" />
            </button>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeClass}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/shipping-ops/parcels"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            <span>{isEn ? 'Back to List' : 'سجل الشحنات'}</span>
          </Link>

          <button
            onClick={() => printShipmentLabel(shipment.id, shipment.trackingNumber)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{isEn ? 'Print Waybill (A6)' : 'طباعة البوليصة (A6)'}</span>
          </button>

          {isPending && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-rose-600 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>{t('shippingOps.list.cancelShipment', 'إلغاء الشحنة')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: 4 Core Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Recipient Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('shippingOps.details.recipientDetails', 'بيانات المستلم والوجهة')}</span>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">الاسم:</span>
              <span className="font-medium">{shipment.recipientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الهاتف الأساسي:</span>
              <span className="font-mono font-medium" dir="ltr">{shipment.recipientPhone}</span>
            </div>
            {shipment.recipientPhone2 && (
              <div className="flex justify-between">
                <span className="text-slate-500">هاتف بديل:</span>
                <span className="font-mono" dir="ltr">{shipment.recipientPhone2}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">المحافظة:</span>
              <span className="font-medium">{shipment.destinationGovernorate}</span>
            </div>
            {shipment.destinationCity && (
              <div className="flex justify-between">
                <span className="text-slate-500">المدينة / المنطقة:</span>
                <span>{shipment.destinationCity}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 block mb-1">العنوان التفصيلي:</span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">{shipment.destinationAddress}</p>
            </div>
          </div>
        </div>

        {/* Cargo & Content Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('shippingOps.details.parcelInfo', 'مواصفات الطرد والبضاعة')}</span>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">عدد القطع:</span>
              <span className="font-medium tabular-nums">{shipment.pieces || 1} قطعة</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوزن:</span>
              <span className="font-medium tabular-nums">{shipment.weight} كجم</span>
            </div>
            {shipment.contentDescription && (
              <div className="flex justify-between">
                <span className="text-slate-500">وصف المحتوى:</span>
                <span className="font-medium">{shipment.contentDescription}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">قابل للكسر:</span>
              <span className={shipment.isFragile ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                {shipment.isFragile ? 'نعم (عناية خاصة)' : 'لا'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">معاينة الطرد:</span>
              <span className={shipment.allowOpenPackage ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                {shipment.allowOpenPackage ? 'مسموح بالفتح' : 'غير مسموح'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العميل / التاجر:</span>
              <span className="font-medium">{shipment.merchant?.name || 'مباشر (بدون تاجر)'}</span>
            </div>
          </div>
        </div>

        {/* Financials Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>{t('shippingOps.details.financials', 'الشؤون المالية والتحصيل')}</span>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">مبلغ التحصيل المطلوب (COD):</span>
              <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(shipment.codAmount, shipment.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">المبلغ المحصّل فعلياً:</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                {shipment.collectedAmount !== null && shipment.collectedAmount !== undefined
                  ? formatCurrency(shipment.collectedAmount, shipment.currency)
                  : 'لم يُحصّل بعد'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">تكلفة الشحن المحتسبة:</span>
              <span className="font-medium tabular-nums text-blue-600 dark:text-blue-400">
                {formatCurrency(shipment.cost, shipment.currency)}
              </span>
            </div>
            {shipment.declaredValue && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">القيمة المعلنة للبضاعة:</span>
                <span className="tabular-nums">{formatCurrency(shipment.declaredValue, shipment.currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Courier Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>معلومات التشغيل والتاريخ</span>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">تاريخ الإنشاء:</span>
              <span className="font-medium">{formatDate(shipment.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">نوع الناقل:</span>
              <span>{shipment.carrierType === 'MANUAL' ? 'أسطول داخلي / يدوي' : shipment.carrierType}</span>
            </div>
            {shipment.courier && (
              <div className="flex justify-between">
                <span className="text-slate-500">المندوب المكلّف:</span>
                <span className="font-medium">{shipment.courier.name} ({shipment.courier.phone})</span>
              </div>
            )}
            {shipment.shippingCompany && (
              <div className="flex justify-between">
                <span className="text-slate-500">شركة الشحن:</span>
                <span className="font-medium">{shipment.shippingCompany.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipment Event Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-base font-bold border-b border-slate-100 dark:border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>{t('shippingOps.details.timelineTitle', 'سجل مسار وأحداث الشحنة (Timeline)')}</span>
        </div>

        {!shipment.events || shipment.events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {t('shippingOps.details.noEvents', 'لا توجد أحداث مسجلة بعد')}
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-200 dark:border-slate-800 mr-3 pr-6 space-y-6">
            {shipment.events.map((evt) => {
              const toBadge = getStatusBadge(evt.toStatus, isEn);
              return (
                <div key={evt.id} className="relative">
                  {/* Circle dot on timeline */}
                  <span className="absolute -right-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {evt.reasonCode || 'تحديث الحالة'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${toBadge.badgeClass}`}>
                        {toBadge.label}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatDate(evt.createdAt)}
                      </span>
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {evt.notes}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400">
                      بواسطة: <span className="font-medium text-slate-600 dark:text-slate-300">{evt.actorName || evt.actorType}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t('shippingOps.list.cancelConfirmTitle', 'تأكيد إلغاء الشحنة')}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('shippingOps.list.cancelConfirmDesc', 'هل أنت متأكد من رغبتك في إلغاء هذه الشحنة؟')}
            </p>
            <div>
              <label htmlFor="cancelReason" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                سبب الإلغاء
              </label>
              <input
                id="cancelReason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="طلب العميل، خطأ في العنوان..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                {t('shippingOps.list.cancelDismissBtn', 'تراجع')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
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

export default ShippingParcelDetails;
