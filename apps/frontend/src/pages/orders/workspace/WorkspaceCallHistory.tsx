import React from 'react';
import { ClockIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { WorkspaceOrder } from './types';
import {
  callResultLabel,
  callResultToneClass,
  formatCallDuration,
  formatCallTimestamp,
  totalCallAttempts,
} from './callLogFormat';

interface WorkspaceCallHistoryProps {
  order: WorkspaceOrder;
  isArabic: boolean;
}

export const WorkspaceCallHistory: React.FC<WorkspaceCallHistoryProps> = ({
  order,
  isArabic,
}) => {
  const callLogs = order.callLogs || [];
  const totalCalls = totalCallAttempts(order, callLogs);

  return (
    <section className="border-b border-border/30 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ClockIcon className="h-4 w-4 text-primary" />
          <span className="text-xs">
            {isArabic ? 'سجل المكالمات والمحاولات السابقة' : 'Call History & Attempts'}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary tabular-nums">
            {totalCalls}
          </span>
        </div>
        {order.lastCallAt && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {isArabic ? 'آخر اتصال:' : 'Last call:'}{' '}
            {formatCallTimestamp(order.lastCallAt, isArabic)}
          </span>
        )}
      </div>

      {callLogs.length > 0 ? (
        <div className="space-y-2 mt-2">
          {callLogs.map((log) => {
            const durationStr = formatCallDuration(log.durationSeconds, isArabic);

            return (
              <div
                key={log.id}
                className="rounded-lg border border-border/50 bg-background/60 p-2.5 text-xs transition-colors hover:bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <PhoneIcon className="h-3 w-3" />
                    </span>
                    <span className="font-bold text-foreground">
                      {log.userName || (isArabic ? 'موظف' : 'Agent')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {durationStr && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {durationStr}
                      </span>
                    )}
                    <span>{formatCallTimestamp(log.createdAt, isArabic)}</span>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${callResultToneClass(log.result)}`}
                  >
                    {callResultLabel(log.result, isArabic)}
                  </span>
                  {log.notes && (
                    <span className="text-[11px] text-muted-foreground">{log.notes}</span>
                  )}
                </div>

                {log.recordingUrl && (
                  <div className="mt-2">
                    <audio controls src={log.recordingUrl} className="h-7 w-full max-w-sm" preload="none" />
                  </div>
                )}
              </div>
            );
          })}
          {totalCalls > callLogs.length && (
            <p className="text-[11px] text-muted-foreground">
              {isArabic
                ? `يُعرض أحدث ${callLogs.length} محاولة من إجمالي ${totalCalls}`
                : `Showing latest ${callLogs.length} of ${totalCalls} attempts`}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
          <p>{isArabic ? 'لا توجد مكالمات مسجلة لهذا الطلب حتى الآن' : 'No calls recorded for this order yet'}</p>
        </div>
      )}
    </section>
  );
};
