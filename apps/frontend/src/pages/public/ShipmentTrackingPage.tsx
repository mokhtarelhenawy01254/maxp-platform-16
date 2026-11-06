import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Phone,
  User,
  RotateCcw,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { shippingOpsService, PublicTrackingResponse } from '../../services/shippingOpsService';

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  DELIVERED: {
    label: 'تم التوصيل بنجاح',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  OUT_FOR_DELIVERY: {
    label: 'خرج للتوصيل مع المندوب',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    icon: Truck,
  },
  PICKED_UP: {
    label: 'استلمها مندوب التوصيل',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
    icon: Truck,
  },
  ASSIGNED: {
    label: 'قيد التوزيع للمندوب',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
    icon: Package,
  },
  POSTPONED: {
    label: 'تأجيل موعد التسليم',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    icon: Clock,
  },
  FAILED: {
    label: 'محاولة تسليم غير مكتملة',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    icon: AlertCircle,
  },
  RETURNED_AT_COMPANY: {
    label: 'قيد المراجعة في الشركة',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    icon: RotateCcw,
  },
  RETURNED_RECEIVED: {
    label: 'مرتجع للمتجر',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800',
    icon: RotateCcw,
  },
  RETURNED_DAMAGED: {
    label: 'تالف أثناء الشحن',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    icon: AlertCircle,
  },
  RETURNED_LOST: {
    label: 'مفقود أثناء الشحن',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    icon: AlertCircle,
  },
  RESHIPPED: {
    label: 'إعادة إرسال شحنة بديلة',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    icon: Truck,
  },
  REMITTED: {
    label: 'تم التوصيل والتوريد',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  CLOSED: {
    label: 'مكتملة ومغلقة',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: CheckCircle2,
  },
  INCOMPLETE: {
    label: 'مسودة قيد الاستكمال',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: Clock,
  },
  IN_TRANSIT: {
    label: 'في الطريق بين الفروع',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
    icon: Truck,
  },
  RECEIVED_AT_HUB: {
    label: 'تم الاستلام في المركز الرئيسي',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
    icon: Package,
  },
  RETURNED: {
    label: 'شحنة مرتجعة',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    icon: RotateCcw,
  },
  CANCELLED: {
    label: 'شحنة ملغاة',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: XCircle,
  },
  PENDING: {
    label: 'قيد التجهيز',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Clock,
  },
};

export const ShipmentTrackingPage: React.FC = () => {
  const { waybill: routeWaybill } = useParams<{ waybill?: string }>();
  const navigate = useNavigate();

  const [inputWaybill, setInputWaybill] = useState<string>(routeWaybill || '');
  const [activeWaybill, setActiveWaybill] = useState<string | null>(routeWaybill || null);
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      const data = await shippingOpsService.trackPublicShipment(clean);
      setTrackingData(data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ||
          (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message ||
          'الشحنة غير موجودة أو رقم البوليصة غير صحيح'
        : 'تعذر الاتصال بخادم التتبع. يرجى المحاولة لاحقاً.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeWaybill) {
      setInputWaybill(routeWaybill);
      setActiveWaybill(routeWaybill);
      fetchTracking(routeWaybill);
    }
  }, [routeWaybill, fetchTracking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputWaybill.trim();
    if (!clean) return;

    setActiveWaybill(clean);
    navigate(`/track/${encodeURIComponent(clean)}`, { replace: true });
    fetchTracking(clean);
  };

  const statusConfig = trackingData
    ? STATUS_CONFIG[trackingData.status] || {
        label: trackingData.status,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: Package,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans" dir="rtl">
      {/* Standalone Brand Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">منصة التتبع العام</span>
              <span className="text-[11px] block text-slate-400 -mt-0.5">خدمة تتبع الشحنات والطرود بالبوليصة</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Search Bar Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            تتبع شحنتك لحظة بلحظة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
            أدخل رقم البوليصة أو رقم التتبع للاطلاع على الحالة ومسار الشحنة
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputWaybill}
                onChange={(e) => setInputWaybill(e.target.value)}
                placeholder="مثال: TRK-XXXX-YYYY أو WB-12345"
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                dir="ltr"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={loading || !inputWaybill.trim()}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-medium text-sm transition active:scale-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري البحث...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>تتبع الشحنة</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-6 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="text-base font-semibold text-red-900 dark:text-red-200">{error}</h3>
            <p className="text-xs text-red-700 dark:text-red-400">
              يرجى التأكد من كتابة رقم البوليصة أو التتبع بدقة كما تم استلامه في رسالة الشحن
            </p>
          </div>
        )}

        {/* Tracking Details Card */}
        {trackingData && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Overview Ribbon */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">رقم البوليصة / التتبع</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white" dir="ltr">
                      {trackingData.waybill}
                    </span>
                  </div>
                </div>

                {statusConfig && (
                  <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${statusConfig.badgeClass} self-start sm:self-auto`}>
                    <statusConfig.icon className="w-4 h-4" />
                    <span>{trackingData.customerStatus || trackingData.statusLabel || statusConfig.label}</span>
                  </div>
                )}
              </div>

              {/* Masked Info & Destination Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">المستلم</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trackingData.recipientName || 'عميل'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم الهاتف</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200" dir="ltr">{trackingData.recipientPhone || '***'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 sm:col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الوجهة والمحافظة</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {trackingData.destinationGovernorate} {trackingData.destinationCity ? ` - ${trackingData.destinationCity}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Timeline Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">سجل مسار الشحنة</h2>
              </div>

              {(!trackingData.events || trackingData.events.length === 0) ? (
                <p className="text-xs sm:text-sm text-slate-500 py-3">لا توجد أحداث مسجلة حتى الآن.</p>
              ) : (
                <div className="relative pr-4 space-y-6 before:absolute before:right-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {trackingData.events.map((event, idx) => {
                    const isLatest = idx === 0;
                    const eventStatus = event.toStatus || event.status;
                    const eventConfig = STATUS_CONFIG[eventStatus] || {
                      label: event.toStatusLabel || event.note || eventStatus,
                      badgeClass: 'text-slate-600',
                      icon: Package,
                    };
                    const dateObj = new Date(event.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={event.id || idx} className="relative pr-6">
                        {/* Dot on line */}
                        <div
                          className={`absolute right-0 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                            isLatest
                              ? 'bg-blue-600 border-white dark:border-slate-900 ring-4 ring-blue-100 dark:ring-blue-950'
                              : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-900'
                          }`}
                        />

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold ${isLatest ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {event.toStatusLabel || eventConfig.label}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-medium">
                                أحدث حالة
                              </span>
                            )}
                          </div>

                          {event.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">{event.notes}</p>
                          )}

                          <span className="text-[11px] text-slate-400 font-mono block">
                            {formattedDate} · {formattedTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShipmentTrackingPage;
