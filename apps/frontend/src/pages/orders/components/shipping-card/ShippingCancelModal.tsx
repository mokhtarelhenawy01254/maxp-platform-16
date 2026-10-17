import React from "react";

interface ShippingCancelModalProps {
  showCancelModal: boolean;
  onClose: () => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  cancelling: boolean;
  onConfirmCancel: () => void;
}

export const ShippingCancelModal: React.FC<ShippingCancelModalProps> = ({
  showCancelModal,
  onClose,
  cancelReason,
  setCancelReason,
  cancelling,
  onConfirmCancel,
}) => {
  if (!showCancelModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl border border-slate-200 dark:border-slate-700">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          تأكيد إلغاء الشحنة
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          سيتم إرسال طلب إلغاء لشركة الشحن وتغيير حالة الشحنة إلى ملغية.
        </p>
        <input
          type="text"
          placeholder="سبب الإلغاء (اختياري)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-97"
          >
            رجوع
          </button>
          <button
            type="button"
            onClick={onConfirmCancel}
            disabled={cancelling}
            className="px-4 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition active:scale-97"
          >
            {cancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingCancelModal;
