import React from 'react';
import { Clock, Phone } from 'lucide-react';
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
    <section className="border-b border-border/40 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Clock size={15} className="text-primary" />
          <span className="text-xs">
            {isArabic ? 'سجل المكالمات والمحاولات السابقة' : 'Call History & Attempts'}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary tabular-nums">
            {totalCalls}
          </span>
        </div>
        {order.lastCallAt && (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
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
                className="rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Phone size={12} />
                    </span>
                    <span className="font-bold text-foreground">
                      {log.userName || (isArabic ? 'موظف' : 'Agent')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {durationStr && (
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
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
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {isArabic
                ? `يُعرض أحدث ${callLogs.length} محاولة من إجمالي ${totalCalls}`
                : `Showing latest ${callLogs.length} of ${totalCalls} attempts`}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-3 text-center text-xs text-muted-foreground">
          <p>{isArabic ? 'لا توجد مكالمات مسجلة لهذا الطلب حتى الآن' : 'No calls recorded for this order yet'}</p>
        </div>
      )}
    </section>
  );
};

export default WorkspaceCallHistory;
