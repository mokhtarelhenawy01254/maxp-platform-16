import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MessageSquare,
  RotateCw,
  ShoppingBag,
  Terminal,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { extractUrlFromMessage, getMetaErrorInfo } from './metaErrorCodes';
import {
  EVENT_LABELS,
  LogEntry,
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from './types';

interface NotificationLogDetailsDialogProps {
  log: LogEntry | null;
  formatDate: (val?: string | null) => string;
  onClose: () => void;
}

export const NotificationLogDetailsDialog: React.FC<NotificationLogDetailsDialogProps> = ({
  log,
  formatDate,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleCopy = (text?: string | null, fieldKey: string = 'text') => {
    if (!text) return;
    const markCopied = () => {
      setCopiedField(fieldKey);
      setTimeout(() => {
        setCopiedField((prev) => (prev === fieldKey ? null : prev));
      }, 2000);
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        // Only report success when the clipboard write actually resolves; a rejected
        // promise (permission denied / insecure context) must not show "تم النسخ".
        navigator.clipboard.writeText(text).then(markCopied).catch(() => {});
      }
    } catch {
      // Fallback silent catch for environments without clipboard permissions
    }
  };

  const isFailed = log?.status === 'FAILED' || !!log?.failureReason || !!log?.errorCode;
  const errorInfo = isFailed ? getMetaErrorInfo(log?.errorCode, log?.failureReason) : null;
  const extractedUrl = log ? extractUrlFromMessage(log.failureReason) || extractUrlFromMessage(log.content) : null;
  const isLongContent = (log?.content?.length || 0) > 280;

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        role="dialog"
        aria-labelledby="notification-log-title"
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:m-0 p-4 sm:p-6 bg-card"
        overlayClassName="bg-black/50"
        closeLabel="إغلاق"
      >
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle
                id="notification-log-title"
                className="text-base sm:text-lg font-bold text-foreground"
              >
                تفاصيل الإشعار المرسل
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs font-mono tabular-nums text-muted-foreground">
                {log ? formatDate(log.createdAt) : ''}
              </DialogDescription>
              {log && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    {log.recipientName || 'مستلم غير معروف'}
                  </span>
                  {log.recipientPhone ? (
                    <>
                      <span aria-hidden="true" className="text-muted-foreground">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground" dir="ltr">
                        {log.recipientPhone}
                      </span>
                    </>
                  ) : null}
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-md text-[10px] font-mono px-2 py-0.5',
                      MESSAGE_TYPE_STYLES[log.messageType] || MESSAGE_TYPE_STYLES.TEXT
                    )}
                  >
                    {MESSAGE_TYPE_LABELS[log.messageType] || '—'}
                  </Badge>
                </div>
              )}
            </div>

            {log && (
              <Badge
                variant="outline"
                className={cn(
                  'rounded-lg px-3 py-1 text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5',
                  STATUS_STYLES[log.status] || STATUS_STYLES.CANCELLED
                )}
              >
                {log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ' ? (
                  <CheckCircle2 className="size-4" />
                ) : log.status === 'FAILED' ? (
                  <XCircle className="size-4" />
                ) : (
                  <Clock className="size-4" />
                )}
                <span>{STATUS_LABELS[log.status] || log.status}</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {log && (
          <div className="space-y-4 py-1 text-right" dir="rtl">
            {/* Error Banner if Failed */}
            {isFailed && errorInfo && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 max-w-full">
                    <AlertTriangle className="size-5 shrink-0 text-destructive mt-0.5" />
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-destructive">
                          {errorInfo.title}
                        </h4>
                        {log.errorCode ? (
                          <span
                            className="rounded bg-destructive/15 px-2 py-0.5 text-[11px] font-mono font-bold text-destructive"
                            dir="ltr"
                          >
                            كود {log.errorCode}
                          </span>
                        ) : (
                          <span className="rounded bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            كود غير معروف
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {errorInfo.description}
                      </p>
                    </div>
                  </div>

                  {errorInfo.actionUrl && (
                    <a
                      href={errorInfo.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-primary shadow-xs transition-colors hover:bg-muted shrink-0"
                    >
                      <span>فتح في Meta</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>

                {log.failureReason && (
                  <details className="group rounded-lg border border-destructive/20 bg-background/70 p-2.5 text-xs">
                    <summary className="flex cursor-pointer items-center justify-between font-medium text-destructive/90 select-none">
                      <span>التفاصيل التقنية للخطأ</span>
                      <span className="text-[10px] text-muted-foreground group-open:hidden">
                        (انقر للعرض)
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-destructive/15 pt-2">
                      <p
                        className="font-mono text-[11px] leading-relaxed text-destructive/90 break-all whitespace-pre-wrap select-all"
                        dir="ltr"
                      >
                        {log.failureReason}
                      </p>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(log.failureReason, 'error')}
                          className="h-7 gap-1 text-[11px] text-destructive hover:bg-destructive/10"
                        >
                          {copiedField === 'error' ? (
                            <>
                              <Check className="size-3 text-emerald-600" />
                              <span className="text-emerald-600">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>نسخ نص الخطأ</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {log.orderNumber && (
                <a
                  href={`/orders?search=${encodeURIComponent(log.orderNumber)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted shadow-xs"
                >
                  <ShoppingBag className="size-3.5 text-primary" />
                  <span>فتح الطلب ({log.orderNumber})</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title="مش مدعوم حالياً"
                className="h-8 gap-1.5 rounded-lg text-xs opacity-60 cursor-not-allowed"
              >
                <RotateCw className="size-3" />
                <span>إعادة إرسال</span>
                <span className="text-[10px] text-muted-foreground">(مش مدعوم حالياً)</span>
              </Button>

              {log.content && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(log.content, 'quick-content')}
                  className="h-8 gap-1.5 rounded-lg text-xs"
                >
                  {copiedField === 'quick-content' ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      <span className="text-emerald-600">تم نسخ الرسالة</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>نسخ الرسالة</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* WhatsApp Message Bubble */}
            {log.content && (
              <div className="rounded-xl border border-border/40 bg-card p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-4 text-emerald-600" />
                    <span>محتوى الرسالة</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(log.content, 'bubble-content')}
                    className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {copiedField === 'bubble-content' ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>نسخ المحتوى</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-col items-end">
                  <div
                    className="w-auto max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tr-xs border border-emerald-200/60 bg-emerald-50/80 p-3.5 text-xs sm:text-sm leading-relaxed text-foreground shadow-xs dark:border-emerald-800/40 dark:bg-emerald-950/30"
                    dir="auto"
                  >
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words',
                        !isExpanded && isLongContent && 'line-clamp-6'
                      )}
                    >
                      {log.content}
                    </div>

                    <div
                      className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground font-mono tabular-nums"
                      dir="ltr"
                    >
                      <span>{formatDate(log.createdAt)}</span>
                      {log.status === 'READ' ||
                      log.status === 'DELIVERED' ||
                      log.status === 'SENT' ? (
                        <CheckCircle2 className="size-3 text-emerald-600" />
                      ) : null}
                    </div>
                  </div>

                  {isLongContent && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-1 h-6 text-xs text-primary p-0"
                    >
                      {isExpanded ? 'عرض أقل' : 'عرض الرسالة كاملة'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Structured Info Cards Grid - Hides Empty Cards */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-border/40 bg-card p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  المستلم
                </span>
                <p className="mt-1 text-xs font-bold text-foreground">
                  {log.recipientName || 'مستلم غير محدد'}
                </p>
                <p className="text-xs font-mono tabular-nums text-muted-foreground" dir="ltr">
                  {log.recipientPhone || '—'}
                </p>
              </div>

              {(log.sessionName || log.sessionPhone || log.sessionProvider) && (
                <div className="rounded-lg border border-border/40 bg-card p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    الجلسة المستخدمة
                  </span>
                  <p className="mt-1 text-xs font-bold text-foreground">
                    {log.sessionName || '—'}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-muted-foreground" dir="ltr">
                    {log.sessionPhone || ''}{' '}
                    {log.sessionProvider ? `· ${log.sessionProvider}` : ''}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border/40 bg-card p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  نوع الرسالة والحدث
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-md text-[10px] font-mono px-2 py-0.5',
                      MESSAGE_TYPE_STYLES[log.messageType] || MESSAGE_TYPE_STYLES.TEXT
                    )}
                  >
                    {MESSAGE_TYPE_LABELS[log.messageType] || log.messageType || '—'}
                  </Badge>
                  {log.eventType && (
                    <span className="text-xs text-muted-foreground">
                      · {EVENT_LABELS[log.eventType] || log.eventType}
                    </span>
                  )}
                </div>
              </div>

              {(log.templateName || log.metaTemplateName) && (
                <div className="rounded-lg border border-border/40 bg-card p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    القالب المستخدم
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {log.templateName && (
                      <span className="font-medium text-foreground">{log.templateName}</span>
                    )}
                    {log.metaTemplateName && (
                      <span
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-mono font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        dir="ltr"
                      >
                        {log.metaTemplateName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {log.orderNumber && (
                <div className="rounded-lg border border-border/40 bg-card p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    رقم الطلب المرتبط
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs font-mono font-bold text-foreground" dir="ltr">
                      {log.orderNumber}
                    </p>
                    {log.orderTotal && (
                      <span className="text-xs text-muted-foreground">
                        ({log.orderTotal})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Technical Details Section (Collapsed by Default) */}
            <details className="group rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-3.5">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground select-none">
                <span className="flex items-center gap-2">
                  <Terminal className="size-4 text-muted-foreground" />
                  <span>بيانات تقنية ومعرفات النظام</span>
                </span>
                <span className="text-[11px] text-muted-foreground group-open:hidden">
                  (انقر للفتح)
                </span>
              </summary>

              <div className="mt-3 space-y-2.5 border-t border-border/40 pt-3 text-xs">
                {log.whatsappMessageId && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-background/70 p-2.5 border border-border/40">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        معرّف الرسالة (Message ID)
                      </span>
                      <p className="font-mono text-xs break-all text-foreground" dir="ltr">
                        {log.whatsappMessageId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(log.whatsappMessageId, 'tech-wamid')}
                      className="h-7 shrink-0 gap-1 text-[11px] self-end sm:self-center"
                    >
                      {copiedField === 'tech-wamid' ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {(log.templateName || log.metaTemplateName) && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-background/70 p-2.5 border border-border/40">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        اسم القالب المعتمد
                      </span>
                      <p className="font-mono text-xs break-all text-foreground" dir="ltr">
                        {log.metaTemplateName || log.templateName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(log.metaTemplateName || log.templateName, 'tech-template')
                      }
                      className="h-7 shrink-0 gap-1 text-[11px] self-end sm:self-center"
                    >
                      {copiedField === 'tech-template' ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {extractedUrl && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-background/70 p-2.5 border border-border/40">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        الرابط المستخرج من الرسالة / الخطأ (URL)
                      </span>
                      <a
                        href={extractedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs break-all text-primary underline block"
                        dir="ltr"
                      >
                        {extractedUrl}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(extractedUrl, 'tech-url')}
                      className="h-7 shrink-0 gap-1 text-[11px] self-end sm:self-center"
                    >
                      {copiedField === 'tech-url' ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {log.sessionId && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-background/70 p-2.5 border border-border/40">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        معرّف الجلسة (Session ID)
                      </span>
                      <p className="font-mono text-xs break-all text-foreground" dir="ltr">
                        {log.sessionId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(log.sessionId, 'tech-session')}
                      className="h-7 shrink-0 gap-1 text-[11px] self-end sm:self-center"
                    >
                      {copiedField === 'tech-session' ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {log.createdAt && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-background/70 p-2.5 border border-border/40">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        الوقت الزمني الدقيق (ISO Timestamp)
                      </span>
                      <p className="font-mono text-xs break-all text-foreground" dir="ltr">
                        {log.createdAt}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(log.createdAt, 'tech-time')}
                      className="h-7 shrink-0 gap-1 text-[11px] self-end sm:self-center"
                    >
                      {copiedField === 'tech-time' ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
