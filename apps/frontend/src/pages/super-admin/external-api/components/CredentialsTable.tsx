import React, { useState } from 'react';
import { ExternalApiCredential } from '../types';
import {
  ShieldAlert,
  Search,
  Clock,
  Activity,
  Calendar,
  XCircle,
  FileText,
  Globe
} from 'lucide-react';

interface Props {
  credentials: ExternalApiCredential[];
  loading: boolean;
  onRevoke: (credential: ExternalApiCredential) => void;
  onViewAuditLogs: (credential: ExternalApiCredential) => void;
}

export const CredentialsTable: React.FC<Props> = ({
  credentials,
  loading,
  onRevoke,
  onViewAuditLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = credentials.filter((cred) => {
    if (statusFilter !== 'ALL' && cred.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = cred.name.toLowerCase().includes(q);
      const matchLabel = cred.label?.toLowerCase().includes(q);
      const matchPrefix = cred.keyPrefixMasked.toLowerCase().includes(q);
      const matchCompany = cred.companyName.toLowerCase().includes(q);
      if (!matchName && !matchLabel && !matchPrefix && !matchCompany) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            نشط
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" />
            ملغي (REVOKED)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            منتهي الصلاحية
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البادئة أو الوسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border/60 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">كل الحالات</option>
            <option value="ACTIVE">النشطة فقط</option>
            <option value="REVOKED">الملغاة</option>
            <option value="EXPIRED">المنتهية</option>
          </select>
        </div>
      </div>

      {/* Table Surface */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs font-medium border-b border-border/60">
              <tr>
                <th className="px-4 py-3">المفتاح والاسم</th>
                <th className="px-4 py-3">النطاق والشركة</th>
                <th className="px-4 py-3">السكوبات الممنوحة</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">الطلبات</th>
                <th className="px-4 py-3">آخر استخدام</th>
                <th className="px-4 py-3">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    جاري تحميل المفاتيح...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    لا توجد مفاتيح تطابق الفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filtered.map((cred) => (
                  <tr key={cred.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {cred.name}
                        {cred.scopes.includes('*') && (
                          <span title="صلاحية كاملة" className="p-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                            *
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">
                        {cred.keyPrefixMasked}
                      </div>
                      {cred.label && (
                        <span className="inline-block mt-1 text-[11px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">
                          {cred.label}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {cred.companyName}
                      </div>
                      {cred.allowedIps.length > 0 && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {cred.allowedIps.length} IP مسموح
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {cred.scopes.slice(0, 3).map((scope) => (
                          <span
                            key={scope}
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono ${
                              scope === '*' || scope === 'platform:read'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {scope}
                          </span>
                        ))}
                        {cred.scopes.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center px-1">
                            +{cred.scopes.length - 3} أخرى
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {getStatusBadge(cred.status)}
                      {cred.revokedReason && (
                        <div className="text-[10px] text-rose-500 mt-1 max-w-[120px] truncate" title={cred.revokedReason}>
                          {cred.revokedReason}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center font-mono tabular-nums text-foreground">
                      {cred.requestCount.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {cred.lastUsedAt ? (
                        <div>
                          <div>{formatDate(cred.lastUsedAt)}</div>
                          {cred.lastUsedIp && (
                            <div className="font-mono text-[10px] text-muted-foreground/70">{cred.lastUsedIp}</div>
                          )}
                        </div>
                      ) : (
                        'لم يُستخدم بعد'
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(cred.expiresAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewAuditLogs(cred)}
                          title="عرض سجل تدقيق الطلبات"
                          className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-[0.98]"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {cred.isActive && !cred.revokedAt && (
                          <button
                            type="button"
                            onClick={() => onRevoke(cred)}
                            title="إلغاء فوري للمفتاح"
                            className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition active:scale-[0.98]"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
