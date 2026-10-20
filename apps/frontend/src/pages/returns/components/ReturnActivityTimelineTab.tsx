import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, User, Bot, Info } from 'lucide-react';
import {
  ReturnRequest,
  ActivityLog,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';
import { ACTION_CONFIG, renderRoleBadge } from './returnDetailsConstants';
import { ReturnActivityDetails } from './ReturnActivityDetails';

interface ReturnActivityTimelineTabProps {
  request: ReturnRequest;
  loadingLogs: boolean;
  activityLog: ActivityLog[];
  activityFilter: string;
  setActivityFilter: (val: string) => void;
  reasons: any[];
  shippingCompanies: ReturnShippingCompany[];
  returnTypes: ReturnType[];
}

export const ReturnActivityTimelineTab: React.FC<ReturnActivityTimelineTabProps> = ({
  request,
  loadingLogs,
  activityLog,
  activityFilter,
  setActivityFilter,
  reasons,
  shippingCompanies,
  returnTypes,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {loadingLogs ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">{t('returns.k_144')}</p>
        </div>
      ) : (
        <>
          {/* Action Filters */}
          <div className="flex gap-2 flex-wrap border-b border-gray-100 dark:border-gray-700 pb-3">
            <button
              onClick={() => setActivityFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activityFilter === ''
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('returns.k_13')}{' '}
              <span className="tabular-nums">({activityLog.length})</span>
            </button>
            {Array.from(new Set(activityLog.map((l) => l.action))).map((action) => {
              const meta = ACTION_CONFIG[action];
              const count = activityLog.filter((l) => l.action === action).length;
              return (
                <button
                  key={action}
                  onClick={() => setActivityFilter(action)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activityFilter === action
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {meta?.label || action}
                  <span className="opacity-70 text-[10px] tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          {activityLog.filter((l) => !activityFilter || l.action === activityFilter).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
              {t('returns.k_217')}
            </div>
          ) : (
            <div className="relative border-r-2 border-gray-200 dark:border-gray-700 mr-4 space-y-6">
              {activityLog
                .filter((l) => !activityFilter || l.action === activityFilter)
                .map((log) => {
                  const actionMeta = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    icon: Info,
                    badgeClass:
                      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
                    borderClass: 'border-gray-400 dark:border-gray-600',
                    dotClass: 'bg-gray-400 dark:bg-gray-500',
                  };
                  const ActionIcon = actionMeta.icon;
                  const isSystem = !log.user || !log.user.id;
                  const fullName = log.user
                    ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') ||
                      log.user.email ||
                      'مستخدم'
                    : 'النظام الآلي';
                  const initials = fullName
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('');

                  return (
                    <div key={log.id} className="relative flex items-start gap-3 mr-[-9px]">
                      {/* Timeline Dot */}
                      <div className="bg-white dark:bg-gray-800 p-1 rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-xs shrink-0 mt-0.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${actionMeta.dotClass}`} />
                      </div>

                      {/* Card Surface */}
                      <div className="flex-1 bg-gray-50/70 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-3">
                        {/* Header: Action Badge + Timestamp */}
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${actionMeta.badgeClass}`}
                          >
                            <ActionIcon size={14} />
                            {actionMeta.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 tabular-nums">
                            <Calendar size={12} />
                            {new Date(log.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>

                        {/* Who did it */}
                        <div className="flex items-center gap-2.5 pt-0.5">
                          {isSystem ? (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200 dark:border-blue-800/40">
                              <Bot size={16} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                              {initials || <User size={14} />}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">
                              {fullName}
                            </span>
                            {log.user?.role && renderRoleBadge(log.user.role)}
                            {isSystem && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
                                تلقائي
                              </span>
                            )}
                            {log.user?.email && (
                              <span
                                className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline"
                                dir="ltr"
                              >
                                ({log.user.email})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* What was done */}
                        <ReturnActivityDetails
                          log={log}
                          request={request}
                          reasons={reasons}
                          shippingCompanies={shippingCompanies}
                          returnTypes={returnTypes}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
