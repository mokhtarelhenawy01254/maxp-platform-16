import React from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, CheckCircle2, XCircle, Shield, Truck } from 'lucide-react';
import { ReturnRequest, ReturnShippingCompany, ReturnType } from '../../../services/returnService';

interface ReturnDetailsTabProps {
  request: ReturnRequest;
  responsibleParty: string;
  setResponsibleParty: (val: string) => void;
  responsiblePartyOptions: { value: string; label: string }[];
  reasonId: string;
  setReasonId: (val: string) => void;
  reasons: any[];
  categories: any[];
  customerNotes: string;
  setCustomerNotes: (val: string) => void;
  adminNotes: string;
  setAdminNotes: (val: string) => void;
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
}

export const ReturnDetailsTab: React.FC<ReturnDetailsTabProps> = ({
  request,
  responsibleParty,
  setResponsibleParty,
  responsiblePartyOptions,
  reasonId,
  setReasonId,
  reasons,
  categories,
  customerNotes,
  setCustomerNotes,
  adminNotes,
  setAdminNotes,
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
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Financial Settlement Bar */}
      {(request.order?.codDepositPaid || request.shippingReturnCost) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <Coins size={16} className="text-amber-600 dark:text-amber-400" />
            التسوية المالية
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {request.order?.codDepositPaid && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">دفعة مسبقة (COD Deposit):</span>
                <span className="font-medium text-gray-900 dark:text-white tabular-nums flex items-center gap-1.5">
                  <span>
                    {request.order.codDepositAmount} {request.order.currency}
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
            {request.shippingReturnCost && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">تكلفة الشحن الراجع:</span>
                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {request.shippingReturnCost} {request.order?.currency}
                </span>
              </div>
            )}
            {request.settlementAmount && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
                <span
                  className={`font-bold tabular-nums ${
                    request.settlementAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {request.settlementAmount} {request.order?.currency}
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
      )}

      {/* Enhanced Review Form */}
      <div className="bg-white dark:bg-gray-900/50 border-2 border-blue-100 dark:border-blue-900/30 p-4 rounded-lg space-y-4">
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Shield size={16} /> {t('returns.k_201')}
        </h3>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_202')}
          </label>
          <select
            value={responsibleParty}
            onChange={(e) => {
              setResponsibleParty(e.target.value as any);
              setReasonId('');
            }}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          >
            <option value="">{t('returns.k_30')}</option>
            {responsiblePartyOptions.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_154')}
          </label>
          <select
            value={reasonId}
            onChange={(e) => {
              const selectedReason = reasons.find((r) => r.id === e.target.value);
              setReasonId(e.target.value);
              if (selectedReason?.category?.defaultRole) {
                setResponsibleParty(selectedReason.category.defaultRole);
              }
            }}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          >
            <option value="">{t('returns.k_30')}</option>
            {categories
              .filter((cat: any) => cat.defaultRole === responsibleParty)
              .map((cat: any) => (
                <optgroup key={cat.id} label={cat.name}>
                  {reasons
                    .filter((r: any) => r.categoryId === cat.id)
                    .map((reason: any) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.reason}
                        {reason.description && ` - ${reason.description}`}
                      </option>
                    ))}
                </optgroup>
              ))}
            {reasons.filter((r: any) => {
              const cat = categories.find((c: any) => c.id === r.categoryId);
              return !cat || cat.defaultRole === 'OTHER';
            }).length > 0 && (
              <optgroup label={t('returns.k_31')}>
                {reasons
                  .filter((r: any) => {
                    const cat = categories.find((c: any) => c.id === r.categoryId);
                    return !cat || cat.defaultRole === 'OTHER';
                  })
                  .map((reason: any) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.reason}
                      {reason.description && ` - ${reason.description}`}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_156')}
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={2}
            placeholder={t('returns.k_35')}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('returns.k_207')}
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
          />
        </div>

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

        {returnTypeId &&
          (() => {
            const rt =
              returnTypes.find((x) => x.id === returnTypeId) ||
              shippingCompanies
                .flatMap((c) => c.returnTypes || [])
                .find((x) => x.id === returnTypeId);
            if (!rt) return null;
            const suggested = getSuggestedCost(rt);
            const currency = request.order?.currency || t('returns.k_22');
            return (
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-medium bg-blue-50/80 dark:bg-blue-900/20 p-2.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                <Truck size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  {t('returns.k_256')}:{' '}
                  <strong className="font-bold text-blue-900 dark:text-blue-100 underline decoration-blue-400 tabular-nums">
                    {suggested} {currency}
                  </strong>
                </span>
              </p>
            );
          })()}

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
      </div>
    </div>
  );
};
