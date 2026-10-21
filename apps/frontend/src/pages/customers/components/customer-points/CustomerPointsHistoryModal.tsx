import React from "react";
import { History, X } from "lucide-react";
import { CustomerLoyaltyRecord, formatPoints, toNumber } from "./types";

interface CustomerPointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecord: CustomerLoyaltyRecord | null;
}

export const CustomerPointsHistoryModal: React.FC<CustomerPointsHistoryModalProps> = ({
  isOpen,
  onClose,
  selectedRecord,
}) => {
  if (!isOpen || !selectedRecord) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-right"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            سجل حركات: {selectedRecord.customer.firstName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-inner">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              ملخص الحركات والأرصدة:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-3 font-mono tabular-nums">
              <li className="flex justify-between border-b pb-2 dark:border-gray-700">
                <span>إجمالي المكتسب تاريخياً:</span>
                <span className="text-emerald-600 font-bold">
                  {formatPoints(toNumber(selectedRecord.totalEarned))} نقطة
                </span>
              </li>
              <li className="flex justify-between border-b pb-2 dark:border-gray-700">
                <span>إجمالي المستبدل تاريخياً:</span>
                <span className="text-red-500 font-bold">
                  {formatPoints(toNumber(selectedRecord.totalRedeemed))} نقطة
                </span>
              </li>
              <li className="flex justify-between pt-1">
                <span>آخر عملية مسجلة:</span>
                <span className="text-gray-900 dark:text-white font-medium text-xs">
                  {new Date(selectedRecord.lastActivity).toLocaleString("ar-EG")}
                </span>
              </li>
            </ul>
          </div>

          {selectedRecord.metadata && selectedRecord.metadata.lastReason && (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium mb-1">
                سبب التعديل اليدوي الأخير:
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {selectedRecord.metadata.lastReason}
              </p>
            </div>
          )}

          <p className="text-xs text-center text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
            ملاحظة: سجل الحركات المفصل سيُتاح في التحديث القادم للنظام المعماري.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer"
        >
          إغلاق السجل
        </button>
      </div>
    </div>
  );
};
