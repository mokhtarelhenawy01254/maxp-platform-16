import React, { useState } from 'react';
import { ExternalApiAuditLog, ExternalApiCredential } from '../types';
import { X, RefreshCw, FileText, CheckCircle2, AlertOctagon, ShieldAlert, Clock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logs: ExternalApiAuditLog[];
  loading: boolean;
  onRefresh: () => void;
  selectedCredential: ExternalApiCredential | null;
}

export const AuditLogsViewer: React.FC<Props> = ({
  isOpen,
  onClose,
  logs,
  loading,
  onRefresh,
  selectedCredential
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'SUCCESS' && log.statusCode >= 200 && log.statusCode < 300) return true;
    if (statusFilter === 'CLIENT_ERROR' && log.statusCode >= 400 && log.statusCode < 500) return true;
    if (statusFilter === 'SERVER_ERROR' && log.statusCode >= 500) return true;
    return statusFilter === 'ALL';
  });

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {code} OK
        </span>
      );
    }
    if (code === 401 || code === 403) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          {code} FORBIDDEN
        </span>
      );
    }
    if (code === 429) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          {code} RATE LIMITED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        {code}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                سجل تدقيق الطلبات (Audit Log)
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedCredential
                  ? `مفلتر للمفتاح: ${selectedCredential.name} (${selectedCredential.keyPrefixMasked})`
                  : 'كل طلبات واجهة API الخارجية عبر المنصة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              title="تحديث السجل"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">تصفية النتائج:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              الكل ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SUCCESS')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'SUCCESS' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ناجحة (2xx)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CLIENT_ERROR')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'CLIENT_ERROR' ? 'bg-rose-600 text-white font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              أخطاء ومرفوضة (4xx)
            </button>
          </div>

          <span className="text-muted-foreground tabular-nums">
            عرض {filteredLogs.length} سجل
          </span>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-medium sticky top-0 border-b border-border/60">
              <tr>
                <th className="px-4 py-2.5">الوقت</th>
                <th className="px-4 py-2.5">المفتاح</th>
                <th className="px-4 py-2.5">المسار (Endpoint)</th>
                <th className="px-4 py-2.5">كود الرد</th>
                <th className="px-4 py-2.5">عنوان IP</th>
                <th className="px-4 py-2.5 text-center">زمن الاستجابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-sans">
                    جاري تحميل سجل التدقيق...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-sans">
                    لا توجد سجلات تدقيق حتى الآن.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <span className="font-semibold text-foreground">{log.credentialName}</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">{log.keyPrefixMasked}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold mr-1">
                        {log.method}
                      </span>
                      <span className="text-foreground text-[11px] dir-ltr text-left inline-block">
                        {log.path}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {getStatusBadge(log.statusCode)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {log.ip || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                      {log.responseTimeMs !== null ? `${log.responseTimeMs} ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
