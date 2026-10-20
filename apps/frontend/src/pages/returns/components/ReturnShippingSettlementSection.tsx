import React from 'react';
import { Truck } from 'lucide-react';
import type {
  ReturnRequest,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';

export interface ReturnShippingSettlementSectionProps {
  request: ReturnRequest;
  shippingCompanyId: string;
  handleShippingCompanyChange: (val: string) => void;
  shippingCompanies: ReturnShippingCompany[];
  returnTypeId: string;
  handleReturnTypeChange: (val: string) => void;
  returnTypes: ReturnType[];
  getSuggestedCost: (type: ReturnType | undefined) => number;
  shippingReturnCost: string;
  setShippingReturnCost: (val: string) => void;
  settlementAmount: string;
  setSettlementAmount: (val: string) => void;
  t: (key: string) => string;
}

export const ReturnShippingSettlementSection: React.FC<ReturnShippingSettlementSectionProps> = ({
  request,
  shippingCompanyId,
  handleShippingCompanyChange,
  shippingCompanies,
  returnTypeId,
  handleReturnTypeChange,
  returnTypes,
  getSuggestedCost,
  shippingReturnCost,
  setShippingReturnCost,
  settlementAmount,
  setSettlementAmount,
  t,
}) => {
  const selectedReturnType =
    returnTypes.find((x) => x.id === returnTypeId) ||
    shippingCompanies.flatMap((c) => c.returnTypes || []).find((x) => x.id === returnTypeId);

  const suggestedCost = selectedReturnType ? getSuggestedCost(selectedReturnType) : null;
  const currency = request.order?.currency || t('returns.k_22') || 'EGP';

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_254')}
          </label>
          <select
            value={shippingCompanyId}
            onChange={(e) => handleShippingCompanyChange(e.target.value)}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          >
            <option value="">{t('returns.k_264') || '-- اختر شركة الشحن --'}</option>
            {shippingCompanies.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_255')}
          </label>
          <select
            value={returnTypeId}
            onChange={(e) => handleReturnTypeChange(e.target.value)}
            disabled={returnTypes.length === 0}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md disabled:opacity-50"
          >
            <option value="">{t('returns.k_265') || '-- اختر نوع المرتجع --'}</option>
            {returnTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {suggestedCost !== null && (
        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-medium bg-blue-50/80 dark:bg-blue-900/20 p-2.5 rounded-md border border-blue-200 dark:border-blue-800/40">
          <Truck size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            {t('returns.k_256')}:{' '}
            <strong className="font-bold text-blue-900 dark:text-blue-100 underline decoration-blue-400 tabular-nums font-mono">
              {suggestedCost} {currency}
            </strong>
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_228')}
          </label>
          <input
            type="number"
            step="0.01"
            value={shippingReturnCost}
            onChange={(e) => setShippingReturnCost(e.target.value)}
            placeholder="0.00"
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md tabular-nums font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_229')}
          </label>
          <input
            type="number"
            step="0.01"
            value={settlementAmount}
            onChange={(e) => setSettlementAmount(e.target.value)}
            placeholder="0.00"
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md tabular-nums font-mono"
          />
        </div>
      </div>
    </>
  );
};
