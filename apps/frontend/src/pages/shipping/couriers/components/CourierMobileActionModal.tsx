import React from 'react';
import { DeliveryRun, DeliveryRunItem } from '../../../../services/courierService';

interface CourierMobileActionModalProps {
  selectedShipment: DeliveryRunItem | null;
  actionType: 'DELIVERED' | 'DELAYED' | 'RETURNED' | null;
  run: DeliveryRun;
  fieldPin: string;
  setFieldPin: (val: string) => void;
  collectedAmount: number;
  setCollectedAmount: (val: number) => void;
  deliveryOtp: string;
  setDeliveryOtp: (val: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (val: string) => void;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const CourierMobileActionModal: React.FC<CourierMobileActionModalProps> = ({
  selectedShipment,
  actionType,
  run,
  fieldPin,
  setFieldPin,
  collectedAmount,
  setCollectedAmount,
  deliveryOtp,
  setDeliveryOtp,
  deliveryNotes,
  setDeliveryNotes,
  submitting,
  onClose,
  onConfirm,
}) => {
  if (!selectedShipment || !actionType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-sm sm:text-base">
            {actionType === 'DELIVERED'
              ? 'تأكيد التسليم واستلام الكاش'
              : actionType === 'DELAYED'
              ? 'تسجيل تأجيل الطرد'
              : 'تسجيل رفض أو مرتجع'}
          </h3>
          <button onClick={onClose} className="text-slate-400 p-1">
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <div>
            الطلب:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {selectedShipment.order?.orderNumber}
            </span>
          </div>
          <div>
            العميل:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {selectedShipment.order?.customerName}
            </span>
          </div>
        </div>

        {run.pinRequired && (
          <div>
            <label className="block text-xs font-medium mb-1">رمز PIN الخاص بك *</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={fieldPin}
              onChange={(e) => setFieldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold tracking-[0.5em] text-center tabular-nums font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              حماية المأمورية: العمليات بتتسجل باسمك بعد التحقق من الرمز.
            </p>
          </div>
        )}

        {actionType === 'DELIVERED' && (
          <div>
            <label className="block text-xs font-medium mb-1">المبلغ المحصل نقداً (ج.م) *</label>
            <input
              type="number"
              step="1"
              min="0"
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold tabular-nums font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              عدّل المبلغ في حالة وجود خصم خاص أو تسليم جزئي لبعض القطع.
            </p>
          </div>
        )}

        {actionType === 'DELIVERED' && run.otpRequired && (
          <div>
            <label className="block text-xs font-medium mb-1">كود الاستلام من العميل *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={deliveryOtp}
              onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold tracking-[0.5em] text-center tabular-nums font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              الكود وصل العميل في رسالة خروج الطلب للتوصيل — إثبات الاستلام منه مباشرة.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1">
            {actionType === 'DELIVERED' ? 'ملاحظات التسليم (اختياري)' : 'سبب التأجيل أو الرفض *'}
          </label>
          <textarea
            rows={2}
            required={actionType !== 'DELIVERED'}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder={
              actionType === 'DELIVERED'
                ? 'أي ملاحظة إضافية...'
                : 'اذكر السبب بدقة (مثال: العميل طلب التأجيل للغد، المقاس غير مناسب)'
            }
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
          >
            رجوع
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`py-2.5 text-white font-bold rounded-xl text-xs active:scale-95 transition disabled:opacity-50 ${
              actionType === 'DELIVERED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : actionType === 'DELAYED'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};
