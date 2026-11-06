import React from "react";
import { AssetRequestAdminRecord } from "./types";

interface AssetRequestsActionModalsProps {
  selectedRequest: AssetRequestAdminRecord | null;
  showApproveModal: boolean;
  onCloseApprove: () => void;
  approvalNotes: string;
  onApprovalNotesChange: (val: string) => void;
  onConfirmApprove: () => void;
  showRejectModal: boolean;
  onCloseReject: () => void;
  rejectionReason: string;
  onRejectionReasonChange: (val: string) => void;
  onConfirmReject: () => void;
  showFulfillModal: boolean;
  onCloseFulfill: () => void;
  selectedAssetId: string;
  onSelectedAssetIdChange: (val: string) => void;
  onConfirmFulfill: () => void;
}

export const AssetRequestsActionModals: React.FC<
  AssetRequestsActionModalsProps
> = ({
  selectedRequest,
  showApproveModal,
  onCloseApprove,
  approvalNotes,
  onApprovalNotesChange,
  onConfirmApprove,
  showRejectModal,
  onCloseReject,
  rejectionReason,
  onRejectionReasonChange,
  onConfirmReject,
  showFulfillModal,
  onCloseFulfill,
  selectedAssetId,
  onSelectedAssetIdChange,
  onConfirmFulfill,
}) => {
  return (
    <>
      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              الموافقة على الطلب
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => onApprovalNotesChange(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="أضف ملاحظات..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCloseApprove}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={onConfirmApprove}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  موافقة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              رفض الطلب
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سبب الرفض *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => onRejectionReasonChange(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="اكتب سبب الرفض..."
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCloseReject}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={onConfirmReject}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  رفض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fulfill Modal */}
      {showFulfillModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تخصيص أصل
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اختر الأصل *
                </label>
                <input
                  type="text"
                  value={selectedAssetId}
                  onChange={(e) => onSelectedAssetIdChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tabular-nums"
                  placeholder="معرف الأصل"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  سيتم تحسين هذا لاحقاً بقائمة منسدلة للأصول المتاحة
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCloseFulfill}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={onConfirmFulfill}
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
                >
                  تخصيص
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
