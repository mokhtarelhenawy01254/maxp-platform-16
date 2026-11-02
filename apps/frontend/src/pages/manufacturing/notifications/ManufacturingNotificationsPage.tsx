import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  RotateCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Filter,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  MfgNotificationLog,
  MfgNotificationEventKey,
} from '../manufacturingApi';

const EVENT_LABELS: Record<string, string> = {
  SAMPLE_CREATED: 'إنشاء عينة',
  SAMPLE_APPROVED: 'اعتماد عينة',
  SAMPLE_REJECTED: 'رفض عينة',
  SAMPLE_CONVERTED: 'تحويل عينة لأمر إنتاج',
  SAMPLE_RECEIVED: 'استلام عينة',
  PRODUCTION_STAGE_STARTED: 'بدء مرحلة إنتاج',
  PRODUCTION_STAGE_COMPLETED: 'إتمام مرحلة إنتاج',
  PRODUCTION_ORDER_DELAYED: 'تأخر أمر الإنتاج',
  PRODUCTION_ORDER_COMPLETED: 'اكتمال أمر الإنتاج',
  MATERIAL_SHORTAGE: 'نقص في الخامات',
};

const RECIPIENT_LABELS: Record<string, { label: string; badgeClass: string }> = {
  CUSTOMER: {
    label: 'العميل',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  FACTORY: {
    label: 'المصنع',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  TEAM: {
    label: 'فريق العمل',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
};

const REASON_LABELS: Record<string, string> = {
  no_session: 'لا توجد جلسة واتساب نشطة',
  no_phone: 'لا يوجد رقم هاتف مسجل',
  no_template_configured: 'لم يتم ضبط قالب معتمد',
  meta_template_not_approved: 'قالب Meta غير معتمد',
  disabled: 'الحدث معطل في الإعدادات',
  module_disabled: 'نظام الإشعارات معطل بالكامل',
};

export const ManufacturingNotificationsPage: React.FC = () => {
  const [logs, setLogs] = useState<MfgNotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);

  // Filters
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = {
        page,
        limit: 20,
      };
      if (eventFilter !== 'ALL') params.eventKey = eventFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await manufacturingApi.listNotificationLogs(params);
      if (res && res.items) {
        setLogs(res.items);
        setPagination(res.pagination || { total: res.items.length, page: 1, limit: 20, totalPages: 1 });
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error('Failed to load manufacturing notification logs:', err);
      setError(err.response?.data?.message || err.message || 'فشل في تحميل سجل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [page, eventFilter, statusFilter, searchTerm]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRetry = async (log: MfgNotificationLog) => {
    try {
      setRetryingId(log.id);
      setError(null);
      await manufacturingApi.retryNotificationLog(log.id);
      setRetrySuccess(`تمت إعادة جدولة وإرسال الإشعار بنجاح`);
      setTimeout(() => setRetrySuccess(null), 4000);
      await loadLogs();
    } catch (err: any) {
      console.error('Failed to retry notification:', err);
      setError(err.response?.data?.message || err.message || 'فشل في إعادة إرسال الإشعار');
    } finally {
      setRetryingId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>تم الإرسال</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>فشل</span>
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
            <Clock className="w-3 h-3" />
            <span>تم التخطي</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>قيد الانتظار</span>
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(d);
    } catch (_) {
      return String(dateStr);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16" dir="rtl">
      <ManufacturingHeader
        title="سجل إشعارات التصنيع (واتساب)"
        subtitle="متابعة دقيقة لجميع رسائل الواتساب المرسلة للعملاء والمصانع وإدارة التشغيل"
        actions={
          <button
            type="button"
            onClick={() => loadLogs()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-card border border-border/70 hover:bg-muted text-foreground flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">
        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {retrySuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{retrySuccess}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث بالاسم أو الرقم أو السبب..."
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-border/70 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Event Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={eventFilter}
                onChange={(e) => {
                  setEventFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">جميع الأحداث</option>
                {Object.entries(EVENT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="SENT">تم الإرسال (SENT)</option>
                <option value="FAILED">فشل (FAILED)</option>
                <option value="SKIPPED">تم التخطي (SKIPPED)</option>
                <option value="PENDING">قيد الانتظار (PENDING)</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            إجمالي السجلات: <span className="font-bold text-foreground">{pagination.total}</span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-card border border-border/70 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-border/60">
              <thead className="bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">وقت الإشعار</th>
                  <th className="py-3 px-4">الحدث</th>
                  <th className="py-3 px-4">الكيان المرتبط</th>
                  <th className="py-3 px-4">المستلم</th>
                  <th className="py-3 px-4">رقم الواتساب</th>
                  <th className="py-3 px-4">حالة الإرسال</th>
                  <th className="py-3 px-4">السبب / الملاحظات</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      <span>جاري تحميل سجل الإشعارات...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="font-medium">لا توجد سجلات إشعارات مطابقة</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const recipientMeta =
                      RECIPIENT_LABELS[log.recipientType || ''] || {
                        label: log.recipientType || 'مستلم',
                        badgeClass: 'bg-muted text-muted-foreground',
                      };
                    const eventName = EVENT_LABELS[log.eventKey] || log.eventKey;
                    const friendlyReason =
                      log.reason && REASON_LABELS[log.reason] ? REASON_LABELS[log.reason] : log.reason;
                    const canRetry = log.status === 'FAILED' || log.status === 'SKIPPED';
                    const isRetrying = retryingId === log.id;

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono">
                          {formatDate(log.createdAt)}
                        </td>

                        {/* Event */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{eventName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{log.eventKey}</div>
                        </td>

                        {/* Linked Entity */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs text-foreground font-semibold">
                            {log.sampleOrderId ? (
                              <span className="text-primary">عينة: {log.sampleOrderId}</span>
                            ) : log.productionOrderId ? (
                              <span className="text-indigo-600 dark:text-indigo-400">أمر: {log.productionOrderId}</span>
                            ) : (
                              log.entityId || '-'
                            )}
                          </div>
                          {log.stageId && (
                            <div className="text-[10px] text-muted-foreground font-mono">مرحلة: {log.stageId}</div>
                          )}
                        </td>

                        {/* Recipient */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${recipientMeta.badgeClass}`}
                            >
                              {recipientMeta.label}
                            </span>
                            <span className="font-medium text-foreground">{log.recipientName || '-'}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-xs" dir="ltr">
                          {log.recipientPhone ? (
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {log.recipientPhone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">بلا رقم</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(log.status)}</td>

                        {/* Reason / Notes */}
                        <td className="py-3 px-4 text-xs max-w-xs">
                          {log.reason ? (
                            <span className="text-muted-foreground">
                              {friendlyReason}
                              {log.errorCode && (
                                <span className="font-mono text-[10px] block text-red-500">[{log.errorCode}]</span>
                              )}
                            </span>
                          ) : log.status === 'SENT' ? (
                            <span className="text-emerald-600 text-[11px]">تم التسليم بنجاح</span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {canRetry ? (
                            <button
                              type="button"
                              onClick={() => handleRetry(log)}
                              disabled={isRetrying}
                              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-border/70 hover:bg-primary/10 hover:border-primary/40 text-primary transition-all inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Send className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                              <span>{isRetrying ? 'جاري الإرسال...' : 'إعادة إرسال'}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="p-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                الصفحة <span className="font-bold text-foreground">{pagination.page}</span> من{' '}
                <span className="font-bold text-foreground">{pagination.totalPages}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  className="px-2 py-1 rounded border border-border/70 bg-card hover:bg-muted text-foreground disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-2 py-1 rounded border border-border/70 bg-card hover:bg-muted text-foreground disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManufacturingNotificationsPage;
