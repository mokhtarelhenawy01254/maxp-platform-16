import React from 'react';
import { Coins, CheckCircle2, XCircle } from 'lucide-react';
import type { ReturnRequest } from '../../../services/returnService';

export interface ReturnSettlementSummaryBarProps {
  request: ReturnRequest;
}

export const ReturnSettlementSummaryBar: React.FC<ReturnSettlementSummaryBarProps> = ({
  request,
}) => {
  const hasFinancialData = Boolean(
    request.order?.codDepositPaid || request.shippingReturnCost || request.settlementAmount
  );

  if (!hasFinancialData) {
    return null;
  }

  const orderCurrency = request.order?.currency || 'EGP';

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
        <Coins size={16} className="text-amber-600 dark:text-amber-400" />
        التسوية المالية
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {request.order?.codDepositPaid && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">دفعة مسبقة (COD Deposit):</span>
            <span className="font-medium text-gray-900 dark:text-white tabular-nums font-mono flex items-center gap-1.5">
              <span>
                {request.order.codDepositAmount} {orderCurrency}
              </span>
              {request.order.codDepositRefunded ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} />
                  مستردة
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  <XCircle size={12} />
                  لم تسترد
                </span>
              )}
            </span>
          </div>
        )}
        {request.shippingReturnCost !== undefined && request.shippingReturnCost !== null && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">تكلفة الشحن الراجع:</span>
            <span className="font-bold text-red-600 dark:text-red-400 tabular-nums font-mono">
              {request.shippingReturnCost} {orderCurrency}
            </span>
          </div>
        )}
        {request.settlementAmount !== undefined && request.settlementAmount !== null && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
            <span
              className={`font-bold tabular-nums font-mono ${
                Number(request.settlementAmount) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {request.settlementAmount} {orderCurrency}
            </span>
          </div>
        )}
        {request.productCondition && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">حالة المنتج عند الاستلام:</span>
            <span className="font-medium text-gray-900 dark:text-white">{request.productCondition}</span>
          </div>
        )}
      </div>
    </div>
  );
};
