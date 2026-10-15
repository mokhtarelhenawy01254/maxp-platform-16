import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Clock,
  User,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  X,
  Filter,
} from 'lucide-react';
import orderWorkflowService from '../../../services/orderWorkflowService';
import { useAuth } from '../../../hooks/useAuthSimple';
import api from '../../../services/api';

const PAGE_SIZE = 20;

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

const AuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [orderNumber, setOrderNumber] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const companyId = user?.companyId || (user as any)?.company?.id;
      if (!companyId) return;

      try {
        setLoadingEmployees(true);
        const res = await api.get(`/companies/${companyId}/users?limit=100`);
        if (res.data?.success && res.data?.data?.users) {
          setEmployees(res.data.data.users);
        } else if (Array.isArray(res.data?.data)) {
          setEmployees(res.data.data);
        }
      } catch (error) {
        console.error('[AuditLogViewer] Error fetching employees for filter:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [user?.companyId]);

  const fetchLogs = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      const targetUser = userId !== undefined ? userId : selectedUserId;
      const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, 0, targetUser);
      const fetchedLogs = Array.isArray(res.data) ? res.data : [];
      setLogs(fetchedLogs);
      setOffset(fetchedLogs.length);
      setHasMore(fetchedLogs.length >= PAGE_SIZE);
      setSearched(false);
    } catch (error) {
      console.error('[AuditLogViewer] Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleEmployeeChange = (newUserId: string) => {
    setSelectedUserId(newUserId);
    setOrderNumber('');
    fetchLogs(newUserId);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedOrder = orderNumber.trim();
    if (!trimmedOrder) {
      fetchLogs(selectedUserId);
      return;
    }

    try {
      setLoading(true);
      const res = await orderWorkflowService.getAuditLogs(trimmedOrder);
      let fetchedLogs = Array.isArray(res.data) ? res.data : [];

      if (selectedUserId && selectedUserId !== 'ALL') {
        fetchedLogs = fetchedLogs.filter(
          (log: any) => log.changedBy === selectedUserId || log.user?.id === selectedUserId
        );
      }

      setLogs(fetchedLogs);
      setOffset(fetchedLogs.length);
      setHasMore(false);
      setSearched(true);
    } catch (error) {
      console.error('[AuditLogViewer] Error searching order logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setOrderNumber('');
    setSelectedUserId('');
    fetchLogs('');
  };

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, offset, selectedUserId);
      const newLogs = Array.isArray(res.data) ? res.data : [];
      setLogs(prev => [...prev, ...newLogs]);
      setOffset(prev => prev + newLogs.length);
      setHasMore(newLogs.length >= PAGE_SIZE);
    } catch (error) {
      console.error('[AuditLogViewer] Error loading more logs:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'override':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-bold">
            <ShieldAlert className="w-3 h-3" />
            {t('orderSettings.k_127', 'تجاوز')}
          </span>
        );
      case 'approval':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold">
            <CheckCircle2 className="w-3 h-3" />
            {t('orderSettings.k_128', 'معتمد')}
          </span>
        );
      default:
        return (
          <span className="text-[11px] bg-muted text-muted-foreground border border-border/60 px-2 py-0.5 rounded-md font-medium">
            {t('orderSettings.k_129', 'عادي')}
          </span>
        );
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Control Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {t('orderSettings.k_130', 'سجل العمليات وتغيير الحالات')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('orderSettings.k_131', 'متابعة سجل نشاط الموظفين وتغيير حالات الطلبات والاعتمادات')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/70 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          {/* Employee Filter */}
          <div className="w-full md:w-64 relative">
            <Filter className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedUserId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              disabled={loading || loadingEmployees}
              className="w-full pr-8 pl-3 py-2 rounded-lg border border-border/70 bg-background text-foreground text-xs font-medium cursor-pointer"
            >
              <option value="">{t('orderWorkflow.allEmployees', 'جميع الموظفين (سجل كامل)')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} {emp.email ? `(${emp.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Order Search */}
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={t('orderSettings.k_132', 'البحث برقم الطلب (مثال: 1042)...')}
              className="w-full pr-8 pl-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? t('orderSettings.k_133', 'جارٍ البحث...') : t('orderSettings.k_134', 'بحث')}
            </button>
            {(selectedUserId || orderNumber || searched) && (
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={loading}
                className="px-3 py-2 border border-border/70 rounded-lg text-xs hover:bg-muted/40 transition inline-flex items-center gap-1"
                title="إعادة تعيين الفلاتر"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء الفلتر</span>
              </button>
            )}
          </div>
        </form>

        {selectedEmployee && (
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>تصفية نشاط الموظف: <strong className="text-foreground">{selectedEmployee.firstName} {selectedEmployee.lastName}</strong></span>
            <span className="font-mono">{logs.length} عملية</span>
          </div>
        )}
      </div>

      {/* Logs Timeline Surface */}
      <div className="space-y-3">
        {logs.length === 0 && !loading && (
          <div className="p-16 text-center rounded-xl border border-dashed border-border/70 bg-card space-y-2">
            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <h4 className="text-sm font-bold text-foreground">
              {selectedUserId ? 'لا توجد حركات تغيير حالات لهذا الموظف' : t('orderSettings.k_135', 'لا توجد سجلات تطابق البحث')}
            </h4>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="p-4 rounded-xl bg-card border border-border/70 shadow-sm hover:border-primary/40 transition-colors space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {log.order?.orderNumber && (
                  <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                    #{log.order.orderNumber}
                  </span>
                )}
                <span className="text-xs text-foreground font-medium">{log.fromStatus?.name || t('orderSettings.k_104', 'البداية')}</span>
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-primary">{log.toStatus?.name}</span>
                {getTypeBadge(log.changeType)}
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {new Date(log.createdAt).toLocaleString('ar-EG')}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>{t('orderSettings.k_136', 'تم بواسطة:')} <strong className="text-foreground font-medium">{log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : (log.changedBy || 'النظام')}</strong></span>
              </div>
              {log.approver && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('orderSettings.k_137', 'المعتمد:')} {log.approver.firstName} {log.approver.lastName}</span>
                </div>
              )}
            </div>

            {log.reason && (
              <div className="p-2 bg-muted/30 border border-border/60 rounded-md text-xs text-muted-foreground italic">
                "{log.reason}"
              </div>
            )}
          </div>
        ))}

        {hasMore && !searched && (
          <div className="text-center pt-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-card border border-border/70 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition disabled:opacity-50"
            >
              {loadingMore ? t('orderSettings.k_101', 'جارٍ التحميل...') : (
                <>
                  <span>{t('orderSettings.k_138', 'تحميل المزيد من السجلات')}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
