import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type {
  ReturnRequest,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';
import { parseResponsibleParty } from './returnDetailsConstants';

export interface ReturnActivityReviewedDetailsProps {
  details: Record<string, unknown> | null;
  request: ReturnRequest;
  reasons: Array<{ id: string; reason?: string }>;
  shippingCompanies: ReturnShippingCompany[];
  returnTypes: ReturnType[];
}

export const ReturnActivityReviewedDetails: React.FC<ReturnActivityReviewedDetailsProps> = ({
  details,
  request,
  reasons,
  shippingCompanies,
  returnTypes,
}) => {
  const detailsObj = details || {};
  const resParty = parseResponsibleParty(
    (detailsObj.responsibleParty as string | undefined) || request.responsibleParty
  );

  const reasonTitle =
    (detailsObj.reason as string | undefined) ||
    (detailsObj.category as string | undefined) ||
    request.reason?.reason ||
    (request.reasonId && reasons.find((r) => r.id === request.reasonId)?.reason);

  const shippingName =
    (detailsObj.shippingCompany as string | undefined) ||
    request.shippingCompany?.name ||
    (request.shippingCompanyId &&
      shippingCompanies.find((s) => s.id === request.shippingCompanyId)?.name);

  const returnTypeName =
    (detailsObj.returnType as string | undefined) ||
    request.returnType?.name ||
    (request.returnTypeId &&
      returnTypes.find((rt) => rt.id === request.returnTypeId)?.name);

  const returnCost =
    detailsObj.shippingReturnCost !== undefined && detailsObj.shippingReturnCost !== null
      ? detailsObj.shippingReturnCost
      : request.shippingReturnCost;

  const settlement =
    detailsObj.settlementAmount !== undefined && detailsObj.settlementAmount !== null
      ? detailsObj.settlementAmount
      : request.settlementAmount;

  const admNotes = (detailsObj.adminNotes as string | undefined) || request.adminNotes;
  const custNotes = (detailsObj.customerNotes as string | undefined) || request.customerNotes;

  const hasFields =
    resParty ||
    reasonTitle ||
    shippingName ||
    returnTypeName ||
    returnCost != null ||
    settlement != null ||
    admNotes ||
    custNotes;

  if (!hasFields) {
    return (
      <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2">
        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>تمت مراجعة طلب الإرجاع واعتماده بنجاح.</span>
      </div>
    );
  }

  const currency = request.order?.currency || 'ج.م';

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {resParty && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">الجهة المسؤولة:</span>
            <span className="font-bold text-gray-900 dark:text-white px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {resParty}
            </span>
          </div>
        )}

        {reasonTitle && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">سبب الإرجاع:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {reasonTitle}
            </span>
          </div>
        )}

        {shippingName && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">شركة الشحن:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {shippingName}
            </span>
          </div>
        )}

        {returnTypeName && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">نوع المرتجع:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {returnTypeName}
            </span>
          </div>
        )}

        {returnCost != null && returnCost !== '' && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">تكلفة الشحن الراجع:</span>
            <span className="font-bold text-red-600 dark:text-red-400 tabular-nums font-mono">
              {String(returnCost)} {currency}
            </span>
          </div>
        )}

        {settlement != null && settlement !== '' && (
          <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
            <span
              className={`font-bold tabular-nums font-mono ${
                Number(settlement) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {String(settlement)} {currency}
            </span>
          </div>
        )}
      </div>

      {admNotes && (
        <div className="text-xs p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <span className="text-amber-800 dark:text-amber-300 font-semibold block mb-0.5">
            ملاحظات الإدارة:
          </span>
          <p className="text-gray-700 dark:text-gray-300">{admNotes}</p>
        </div>
      )}

      {custNotes && (
        <div className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
          <span className="text-gray-600 dark:text-gray-400 font-semibold block mb-0.5">
            ملاحظات العميل:
          </span>
          <p className="text-gray-700 dark:text-gray-300">{custNotes}</p>
        </div>
      )}
    </div>
  );
};
