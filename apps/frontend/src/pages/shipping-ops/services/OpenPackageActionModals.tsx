import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PackageOpenRequestItem } from './shippingServicesTypes';

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PackageOpenRequestItem | null;
  onConfirm: (fee: number) => Promise<void>;
  loading: boolean;
  isEn?: boolean;
}

export const ApproveOpenPackageModal: React.FC<ApproveModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  loading,
  isEn,
}) => {
  const [fee, setFee] = useState<number | string>(5.0);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {isEn ? 'Approve Open Package Request' : 'الموافقة على فتح ومعاينة الشحنة'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isEn
              ? 'Confirm allowing the customer/recipient to inspect the package. Specify the open package fee applied:'
              : 'تأكيد السماح للعميل أو المستلم بفتح وفحص محتويات الشحنة. حدد قيمة الرسوم المقررة:'}
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Inspection Fee (EGP)' : 'رسوم الفحص والمعاينة (ج.م)'}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full text-xs font-bold tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              {isEn ? 'Default fee: 5.00 EGP' : 'القيمة الافتراضية: 5.00 ج.م'}
            </span>
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
              onClick={() => onConfirm(Number(fee) || 0)}
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

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PackageOpenRequestItem | null;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
  isEn?: boolean;
}

export const RejectOpenPackageModal: React.FC<RejectModalProps> = ({
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
            {isEn ? 'Reject Package Open Request' : 'رفض طلب فتح الشحنة'}
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
              placeholder={isEn ? 'State why opening is not permitted...' : 'اكتب سبب منع الفحص والمعاينة...'}
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
