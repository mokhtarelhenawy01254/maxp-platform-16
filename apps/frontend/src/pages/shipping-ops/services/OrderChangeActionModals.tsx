import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { OrderChangeRequestItem } from './shippingServicesTypes';

interface ApproveChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderChangeRequestItem | null;
  onConfirm: () => Promise<void>;
  loading: boolean;
  isEn?: boolean;
}

export const ApproveChangeRequestModal: React.FC<ApproveChangeModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  loading,
  isEn,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {isEn ? 'Approve Order Change' : 'الموافقة على تعديل بيانات الأوردر'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              {isEn
                ? 'Approving will immediately update the active shipment record with the requested change.'
                : 'الموافقة ستقوم بتحديث بيانات الشحنة الحالية فوراً بالتعديلات المطلوبة.'}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? (isEn ? 'Approving...' : 'جارٍ الاعتماد...') : (isEn ? 'Confirm Approval' : 'تأكيد الموافقة')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RejectChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderChangeRequestItem | null;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
  isEn?: boolean;
}

export const RejectChangeRequestModal: React.FC<RejectChangeModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  loading,
  isEn,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {isEn ? 'Reject Change Request' : 'رفض طلب تعديل الأوردر'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Rejection Reason *' : 'سبب الرفض *'}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? 'Explain why modification cannot be made...' : 'اكتب سبب تعذر تنفيذ التعديل...'}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason)}
              disabled={loading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? (isEn ? 'Rejecting...' : 'جارٍ الرفض...') : (isEn ? 'Confirm Rejection' : 'تأكيد الرفض')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
