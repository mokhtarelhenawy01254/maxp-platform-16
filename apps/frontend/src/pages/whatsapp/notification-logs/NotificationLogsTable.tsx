import React from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  EVENT_LABELS,
  LogEntry,
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from './types';

interface NotificationLogsTableProps {
  logs: LogEntry[];
  formatDate: (val?: string | null) => string;
  onSelectLog: (log: LogEntry) => void;
}

export const NotificationLogsTable: React.FC<NotificationLogsTableProps> = ({
  logs,
  formatDate,
  onSelectLog,
}) => {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead className="text-right text-xs">المستلم</TableHead>
            <TableHead className="text-right text-xs">الجلسة</TableHead>
            <TableHead className="text-right text-xs">النوع</TableHead>
            <TableHead className="text-right text-xs">الحدث</TableHead>
            <TableHead className="text-right text-xs">الحالة</TableHead>
            <TableHead className="text-right text-xs">سبب الفشل</TableHead>
            <TableHead className="text-right text-xs">التاريخ والوقت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer transition-colors hover:bg-muted/30 border-b border-border/30"
                onClick={() => onSelectLog(log)}
              >
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-foreground">
                      {log.recipientName || 'مستلم غير محدد'}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-muted-foreground" dir="ltr">
                      {log.recipientPhone}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-xs text-foreground font-medium">{log.sessionName || '—'}</p>
                    {log.sessionPhone && (
                      <p className="text-[11px] font-mono tabular-nums text-muted-foreground" dir="ltr">
                        {log.sessionPhone}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-md text-[10px] font-mono px-2 py-0.5',
                      MESSAGE_TYPE_STYLES[log.messageType] || MESSAGE_TYPE_STYLES.TEXT
                    )}
                  >
                    {MESSAGE_TYPE_LABELS[log.messageType] || log.messageType || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {EVENT_LABELS[log.eventType] || log.eventType}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-md text-[10px] font-medium px-2 py-0.5',
                      STATUS_STYLES[log.status] || STATUS_STYLES.CANCELLED
                    )}
                  >
                    {log.status === 'SENT' && log.messageType === 'BUTTONS' ? (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        <span>{STATUS_LABELS[log.status] || log.status}</span>
                      </span>
                    ) : log.status === 'FAILED' ? (
                      <span className="flex items-center gap-1">
                        <XCircle className="size-3" />
                        <span>{STATUS_LABELS[log.status] || log.status}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        <span>{STATUS_LABELS[log.status] || log.status}</span>
                      </span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[240px] whitespace-nowrap">
                  {log.status === 'FAILED' && (log.failureReason || log.errorCode) ? (
                    <div
                      className="flex items-center gap-1.5 overflow-hidden"
                      title={
                        log.errorCode
                          ? `[${log.errorCode}] ${log.failureReason || ''}`
                          : log.failureReason || ''
                      }
                    >
                      {log.errorCode && (
                        <span
                          className="shrink-0 rounded bg-red-100 px-1 py-0.5 text-[10px] font-mono font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          dir="ltr"
                        >
                          #{log.errorCode}
                        </span>
                      )}
                      <span
                        className="truncate text-xs font-mono text-destructive"
                        dir="auto"
                      >
                        {log.failureReason || `كود ${log.errorCode}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs font-mono tabular-nums text-muted-foreground">
                  {formatDate(log.createdAt)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                  <ClipboardList className="size-8 text-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">لا توجد سجلات مطابقة</p>
                  <p className="text-[11px] text-muted-foreground">
                    جرّب تغيير خيارات البحث أو الفلترة لتظهر السجلات المطلوبة.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
