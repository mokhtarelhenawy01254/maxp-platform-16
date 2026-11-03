import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import courierPortalApi, { FailureReason, FALLBACK_FAILURE_REASONS } from './services/courierPortalApi';
import { enqueueAction } from './services/offlineQueue';
import { DateInput } from '../../components/ui/DateInput';

export type DeliverySheetActionType = 'DELIVERED' | 'FAILED' | 'DELAYED';

interface CourierDeliverySheetProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
  shipment: any;
  otpRequired?: boolean;
  onActionComplete: (result: {
    status: DeliverySheetActionType;
    collectedAmount?: number;
    shipmentId: string;
    queued?: boolean;
  }) => void;
}

export const CourierDeliverySheet: React.FC<CourierDeliverySheetProps> = ({
  isOpen,
  onClose,
  runId,
  shipment,
  otpRequired = false,
  onActionComplete,
}) => {
  const [actionType, setActionType] = useState<DeliverySheetActionType>('DELIVERED');
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [otp, setOtp] = useState<string>('');
  const [failureReasons, setFailureReasons] = useState<FailureReason[]>(FALLBACK_FAILURE_REASONS);
  const [failureReasonCode, setFailureReasonCode] = useState<string>('');
  const [nextAttemptDate, setNextAttemptDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Initialize values when shipment changes or modal opens
  useEffect(() => {
    if (shipment) {
      const orderTotal = Number(shipment.order?.total ?? shipment.codAmount ?? 0);
      setCollectedAmount(orderTotal);
      setOtp('');
      setNotes('');
      setFailureReasonCode(FALLBACK_FAILURE_REASONS[0]?.code || "CUSTOMER_UNAVAILABLE");
      // default next attempt date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextAttemptDate(tomorrow.toISOString().split('T')[0] || '');
      setActionType('DELIVERED');
    }
  }, [shipment, isOpen]);

  // Load failure reasons from API
  useEffect(() => {
    let isMounted = true;
    courierPortalApi
      .getFailureReasons()
      .then((res) => {
        if (isMounted && res.data && res.data.length > 0) {
          setFailureReasons(res.data);
          if (!failureReasonCode) {
            setFailureReasonCode(res.data[0]?.code || "CUSTOMER_UNAVAILABLE");
          }
        }
      })
      .catch(() => {
        // fallback already populated
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen || !shipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validations
    if (actionType === 'DELIVERED') {
      if (otpRequired && !/^\d{4}$/.test(otp.trim())) {
        toast.error('يرجى إدخال رمز التحقق (OTP) المكون من 4 أرقام الذي استلمه العميل');
        return;
      }
      if (collectedAmount < 0 || isNaN(collectedAmount)) {
        toast.error('يرجى تحديد المبلغ المحصل بشكل صحيح');
        return;
      }
    } else if (actionType === 'FAILED') {
      if (!failureReasonCode) {
        toast.error('يرجى اختيار سبب تعذر التسليم');
        return;
      }
    } else if (actionType === 'DELAYED') {
      if (!nextAttemptDate) {
        toast.error('يرجى تحديد تاريخ إعادة المحاولة');
        return;
      }
    }

    setSubmitting(true);

    const payload = {
      status: actionType,
      collectedAmount: actionType === 'DELIVERED' ? Number(collectedAmount) : 0,
      otp: actionType === 'DELIVERED' && otp.trim() ? otp.trim() : undefined,
      failureReasonCode: actionType === 'FAILED' ? failureReasonCode : undefined,
      notes: notes.trim() || undefined,
      nextAttemptDate: actionType !== 'DELIVERED' ? nextAttemptDate : undefined,
    };

    // If completely offline, queue immediately
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      try {
        await enqueueAction({
          runId,
          shipmentId: shipment.id,
          ...payload,
        });
        toast.info('تم حفظ العملية بدون إنترنت — سيتم المزامنة تلقائياً عند استعادة الاتصال', {
          icon: <CloudArrowUpIcon className="w-5 h-5 text-amber-500" />,
        });
        onActionComplete({
          status: actionType,
          collectedAmount: payload.collectedAmount,
          shipmentId: shipment.id,
          queued: true,
        });
        onClose();
      } catch (qErr) {
        toast.error('تعذر حفظ العملية محلياً');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Attempt online submission
    try {
      await courierPortalApi.updateDeliveryAction(runId, shipment.id, payload);
      toast.success(
        actionType === 'DELIVERED'
          ? 'تم تسجيل التسليم بنجاح'
          : actionType === 'DELAYED'
          ? 'تم تأجيل موعد التسليم'
          : 'تم تسجيل تعذر التسليم / مرتجع'
      );
      onActionComplete({
        status: actionType,
        collectedAmount: payload.collectedAmount,
        shipmentId: shipment.id,
        queued: false,
      });
      onClose();
    } catch (err: any) {
      console.warn('Online submission failed, falling back to offline queue:', err);
      // Fallback to offline queue on network failures
      try {
        await enqueueAction({
          runId,
          shipmentId: shipment.id,
          ...payload,
        });
        toast.info('تم حفظ العملية بدون إنترنت وسيتم إعادة المحاولة تلقائياً', {
          icon: <CloudArrowUpIcon className="w-5 h-5 text-amber-500" />,
        });
        onActionComplete({
          status: actionType,
          collectedAmount: payload.collectedAmount,
          shipmentId: shipment.id,
          queued: true,
        });
        onClose();
      } catch (queueErr) {
        toast.error(err?.message || 'تعذر تسجيل العملية');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const orderNum = shipment.order?.orderNumber || shipment.trackingNumber || shipment.id;
  const customerName = shipment.order?.customerName || 'عميل';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              تحديث حالة الشحنة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              طلب <span className="font-mono font-semibold">{orderNum}</span> — {customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Segmented Tabs */}
        <div className="p-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActionType('DELIVERED')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition ${
                actionType === 'DELIVERED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>تم التسليم</span>
            </button>
            <button
              type="button"
              onClick={() => setActionType('DELAYED')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition ${
                actionType === 'DELAYED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <span>تأجيل</span>
            </button>
            <button
              type="button"
              onClick={() => setActionType('FAILED')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition ${
                actionType === 'FAILED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <XCircleIcon className="w-4 h-4" />
              <span>تعذر / مرتجع</span>
            </button>
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="p-4 pt-2 space-y-4 flex-1">
          {actionType === 'DELIVERED' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المحصل نقداً (COD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                  <span className="absolute left-3 top-3 text-xs text-slate-400 font-mono">ج.م</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  المبلغ المطلوب طبقاً للمانيفست: <span className="font-mono font-semibold">{shipment.order?.total ?? 0}</span> ج.م
                </p>
              </div>

              {otpRequired && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    كود تسليم العميل (OTP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    الكود المكون من 4 أرقام المرسل للعميل عبر واتساب أو الرسائل النصية
                  </p>
                </div>
              )}
            </div>
          )}

          {actionType === 'FAILED' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  سبب تعذر التسليم <span className="text-rose-500">*</span>
                </label>
                <select
                  value={failureReasonCode}
                  onChange={(e) => setFailureReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                >
                  {failureReasons.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ المحاولة القادمة (اختياري)
                </label>
                <DateInput
                  
                  value={nextAttemptDate}
                  onChange={(e) => setNextAttemptDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {actionType === 'DELAYED' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الموعد البديل المتفق عليه <span className="text-rose-500">*</span>
                </label>
                <DateInput
                  
                  value={nextAttemptDate}
                  onChange={(e) => setNextAttemptDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Notes field for all options */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات المندوب (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل تخص العميل، التوقيت، أو العنوان..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow transition flex items-center justify-center gap-2 active:scale-[0.98] ${
                actionType === 'DELIVERED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'DELAYED'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <span>
                  {actionType === 'DELIVERED'
                    ? 'تأكيد التسليم والتحصيل'
                    : actionType === 'DELAYED'
                    ? 'تأكيد تأجيل الاستلام'
                    : 'تأكيد تعذر التسليم'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourierDeliverySheet;
