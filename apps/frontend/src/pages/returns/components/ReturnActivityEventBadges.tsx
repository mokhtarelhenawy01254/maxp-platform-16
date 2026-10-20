import React from 'react';
import { Bot, ArrowRightLeft, PlusCircle } from 'lucide-react';
import {
  FIELD_LABELS,
  CONTACT_RESULTS_MAP,
} from './returnDetailsConstants';

export interface ReturnActivityEventBadgesProps {
  action: string;
  details: unknown;
}

export const ReturnActivityEventBadges: React.FC<ReturnActivityEventBadgesProps> = ({
  action,
  details,
}) => {
  const detailsObj = (typeof details === 'object' && details !== null ? details : {}) as Record<string, unknown>;

  if (action === 'AUTO_CREATED') {
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

  if (action === 'CONTACT_ATTEMPT') {
    const method = (detailsObj.method as string) || 'PHONE';
    const result = (detailsObj.result as string) || 'NO_ANSWER';
    const notes = detailsObj.notes as string | undefined;

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
            &ldquo;{notes}&rdquo;
          </p>
        )}
      </div>
    );
  }

  if (action === 'STATUS_CHANGE') {
    const fromVal = String(detailsObj.from || '—');
    const toVal = String(detailsObj.to || '—');
    const reason = detailsObj.reason as string | undefined;

    return (
      <div className="text-xs bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">تغيير الحالة:</span>
          <span className="font-semibold px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-gray-800 dark:text-white font-mono">
            {fromVal}
          </span>
          <ArrowRightLeft size={12} className="text-amber-600 dark:text-amber-400" />
          <span className="font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-mono">
            {toVal}
          </span>
        </div>
        {reason && (
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">السبب: {reason}</p>
        )}
      </div>
    );
  }

  if (action === 'UPDATED') {
    const description = (detailsObj.description as string) || 'تم تعديل بيانات طلب الإرجاع:';
    const changes = detailsObj.changes as Record<string, { from?: unknown; to?: unknown }> | undefined;

    return (
      <div className="text-xs bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-2">
        <span className="font-medium text-indigo-900 dark:text-indigo-200 block">
          {description}
        </span>
        {changes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {Object.entries(changes).map(([field, change]) => (
              <div
                key={field}
                className="bg-white dark:bg-gray-800 p-2 rounded border border-indigo-100 dark:border-indigo-900/40 text-xs"
              >
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                  {FIELD_LABELS[field] || field}
                </span>
                <span className="text-red-500 line-through mr-1 font-mono">
                  {String(change?.from ?? 'فارغ')}
                </span>
                <span className="text-emerald-600 font-semibold font-mono">
                  {' '}← {String(change?.to ?? 'فارغ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === 'NOTE_ADDED') {
    const noteText =
      detailsObj.note
        ? String(detailsObj.note)
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

  if (action === 'CREATED') {
    return (
      <div className="text-xs text-cyan-900 dark:text-cyan-200 bg-cyan-50/70 dark:bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/30 flex items-center gap-2">
        <PlusCircle size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span>تم إنشاء طلب الإرجاع في النظام</span>
      </div>
    );
  }

  return null;
};
