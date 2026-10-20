import React from 'react';
import {
  CheckCircle2,
  Bot,
  ArrowRightLeft,
  PlusCircle,
} from 'lucide-react';
import {
  ReturnRequest,
  ActivityLog,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';
import {
  FIELD_LABELS,
  parseResponsibleParty,
  CONTACT_RESULTS_MAP,
} from './returnDetailsConstants';

interface ReturnActivityDetailsProps {
  log: ActivityLog;
  request: ReturnRequest;
  reasons: any[];
  shippingCompanies: ReturnShippingCompany[];
  returnTypes: ReturnType[];
}

export const ReturnActivityDetails: React.FC<ReturnActivityDetailsProps> = ({
  log,
  request,
  reasons,
  shippingCompanies,
  returnTypes,
}) => {
  let details: any = log.details;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      // Keep as string
    }
  }

  if (log.action === 'REVIEWED') {
    const resParty = parseResponsibleParty(
      details?.responsibleParty || request.responsibleParty
    );
    const reasonTitle =
      details?.reason ||
      details?.category ||
      request.reason?.reason ||
      (request.reasonId && reasons.find((r) => r.id === request.reasonId)?.reason);
    const shippingName =
      details?.shippingCompany ||
      request.shippingCompany?.name ||
      (request.shippingCompanyId &&
        shippingCompanies.find((s) => s.id === request.shippingCompanyId)?.name);
    const returnTypeName =
      details?.returnType ||
      request.returnType?.name ||
      (request.returnTypeId &&
        returnTypes.find((rt) => rt.id === request.returnTypeId)?.name);
    const returnCost =
      details?.shippingReturnCost !== undefined && details?.shippingReturnCost !== null
        ? details.shippingReturnCost
        : request.shippingReturnCost;
    const settlement =
      details?.settlementAmount !== undefined && details?.settlementAmount !== null
        ? details.settlementAmount
        : request.settlementAmount;
    const admNotes = details?.adminNotes || request.adminNotes;
    const custNotes = details?.customerNotes || request.customerNotes;

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
              <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                {returnCost} {request.order?.currency || 'ج.م'}
              </span>
            </div>
          )}

          {settlement != null && settlement !== '' && (
            <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
              <span
                className={`font-bold tabular-nums ${
                  Number(settlement) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {settlement} {request.order?.currency || 'ج.م'}
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
  }

  if (log.action === 'AUTO_CREATED') {
    return (
      <div className="text-xs text-blue-900 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
        <Bot size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          {typeof details === 'string' && details.length > 0
            ? details
            : 'تم إنشاء طلب الإرجاع تلقائياً بواسطة النظام لتحديث حالة الطلب إلى مرتجع'}
        </span>
      </div>
    );
  }

  if (log.action === 'CONTACT_ATTEMPT') {
    const method = details?.method || 'PHONE';
    const result = details?.result || 'NO_ANSWER';
    const notes = details?.notes;

    return (
      <div className="text-xs bg-purple-50/70 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30 space-y-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 dark:text-gray-400">وسيلة التواصل:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {method === 'WHATSAPP' ? 'واتساب (WhatsApp)' : 'مكالمة هاتفية (Phone)'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-500 dark:text-gray-400">النتيجة:</span>
          <span className="font-semibold text-purple-700 dark:text-purple-300">
            {CONTACT_RESULTS_MAP[result] || result}
          </span>
        </div>
        {notes && (
          <p className="text-gray-700 dark:text-gray-300 text-xs mt-1 border-t border-purple-100 dark:border-purple-900/30 pt-1">
            "{notes}"
          </p>
        )}
      </div>
    );
  }

  if (log.action === 'STATUS_CHANGE') {
    return (
      <div className="text-xs bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">تغيير الحالة:</span>
          <span className="font-semibold px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-gray-800 dark:text-white">
            {details?.from || '—'}
          </span>
          <ArrowRightLeft size={12} className="text-amber-600 dark:text-amber-400" />
          <span className="font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200">
            {details?.to || '—'}
          </span>
        </div>
        {details?.reason && (
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">السبب: {details.reason}</p>
        )}
      </div>
    );
  }

  if (log.action === 'UPDATED') {
    return (
      <div className="text-xs bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-2">
        <span className="font-medium text-indigo-900 dark:text-indigo-200 block">
          {details?.description || 'تم تعديل بيانات طلب الإرجاع:'}
        </span>
        {details?.changes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {Object.entries(details.changes).map(([field, change]: [string, any]) => (
              <div
                key={field}
                className="bg-white dark:bg-gray-800 p-2 rounded border border-indigo-100 dark:border-indigo-900/40 text-xs"
              >
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                  {FIELD_LABELS[field] || field}
                </span>
                <span className="text-red-500 line-through mr-1">
                  {String(change?.from ?? 'فارغ')}
                </span>
                <span className="text-emerald-600 font-semibold">
                  {' '}← {String(change?.to ?? 'فارغ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (log.action === 'NOTE_ADDED') {
    const noteText =
      typeof details === 'object' && details?.note
        ? details.note
        : typeof details === 'string'
        ? details
        : null;

    return (
      <div className="text-xs bg-slate-50 dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400 block mb-1">الملاحظة:</span>
        <p className="text-gray-800 dark:text-gray-200 font-medium">
          {noteText || 'تم تحديث الملاحظات الإدارية'}
        </p>
      </div>
    );
  }

  if (log.action === 'CREATED') {
    return (
      <div className="text-xs text-cyan-900 dark:text-cyan-200 bg-cyan-50/70 dark:bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/30 flex items-center gap-2">
        <PlusCircle size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span>تم إنشاء طلب الإرجاع في النظام</span>
      </div>
    );
  }

  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
    return null;
  }

  return (
    <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
      {typeof details === 'string' ? details : JSON.stringify(details)}
    </div>
  );
};
