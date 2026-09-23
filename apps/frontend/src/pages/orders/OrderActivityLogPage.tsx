import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Clock,
    User,
    ArrowRight,
    ShieldAlert,
    CheckCircle2,
    Search,
    Filter,
    RotateCw,
    X,
    Calendar,
    Users,
    Activity,
    Layers,
    Table as TableIcon,
    List,
} from 'lucide-react';
import orderWorkflowService, { AuditLogFilters } from '../../services/orderWorkflowService';
import { useAuth } from '../../hooks/useAuthSimple';
import api from '../../services/api';

const PAGE_SIZE = 25;

interface EmployeeOption {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
}

export const OrderActivityLogPage: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Filters
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [orderNumber, setOrderNumber] = useState<string>('');
    const [changeType, setChangeType] = useState<string>('ALL');
    const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
    const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

    // Data State
    const [logs, setLogs] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Employees List
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Fetch Employees on Mount
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
            } catch (err) {
                console.error('[OrderActivityLogPage] Error fetching employees:', err);
            } finally {
                setLoadingEmployees(false);
            }
        };

        fetchEmployees();
    }, [user?.companyId]);

    // Calculate Date Range based on Preset
    const getDateRange = useCallback(() => {
        const now = new Date();
        if (datePreset === 'TODAY') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        if (datePreset === '7DAYS') {
            const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        if (datePreset === '30DAYS') {
            const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            return { startDate: start, endDate: now.toISOString() };
        }
        return {};
    }, [datePreset]);

    // Fetch Audit Logs
    const fetchLogs = useCallback(async (isLoadMore = false) => {
        const currentOffset = isLoadMore ? offset : 0;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const dateRange = getDateRange();
            const filters: AuditLogFilters = {
                userId: selectedUserId || undefined,
                changeType: changeType !== 'ALL' ? changeType : undefined,
                orderNumber: orderNumber.trim() || undefined,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            };

            const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, currentOffset, filters);
            const fetchedLogs = Array.isArray(res.data) ? res.data : [];

            if (isLoadMore) {
                setLogs((prev) => [...prev, ...fetchedLogs]);
                setOffset((prev) => prev + fetchedLogs.length);
            } else {
                setLogs(fetchedLogs);
                setOffset(fetchedLogs.length);
            }

            if (typeof res.total === 'number') {
                setTotalCount(res.total);
                setHasMore(currentOffset + fetchedLogs.length < res.total);
            } else {
                setHasMore(fetchedLogs.length >= PAGE_SIZE);
            }
        } catch (err) {
            console.error('[OrderActivityLogPage] Error fetching audit logs:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedUserId, changeType, orderNumber, getDateRange, offset]);

    // Refetch on filter changes
    useEffect(() => {
        fetchLogs(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUserId, changeType, datePreset]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs(false);
    };

    const handleResetFilters = () => {
        setSelectedUserId('');
        setOrderNumber('');
        setChangeType('ALL');
        setDatePreset('ALL');
    };

    // Telemetry Stats
    const stats = useMemo(() => {
        const uniqueUsers = new Set(logs.map((l) => l.changedBy || l.user?.id).filter(Boolean));
        const overrides = logs.filter((l) => l.changeType === 'override').length;
        const approvals = logs.filter((l) => l.changeType === 'approval').length;
        return {
            totalShown: logs.length,
            uniqueUsersCount: uniqueUsers.size,
            overridesCount: overrides,
            approvalsCount: approvals,
        };
    }, [logs]);

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'override':
                return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800';
            case 'approval':
                return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            default:
                return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const selectedEmployee = employees.find((e) => e.id === selectedUserId);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>الطلبات</span>
                        <span>/</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">سجل نشاط الطلبات</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        سجل نشاط الطلبات
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        متابعة حية وشاملة لكافة عمليات تغيير الحالات والاعتمادات بحسب كل موظف والطلب المعني
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setViewMode('timeline')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                            title="عرض الخط الزمني"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                            title="عرض الجدول"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchLogs(false)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition shadow-xs disabled:opacity-50"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>تحديث</span>
                    </button>
                </div>
            </div>

            {/* Quick Telemetry Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">إجمالي الحركات</span>
                        <Activity className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {totalCount || logs.length}
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">الموظفون النشطون</span>
                        <Users className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {stats.uniqueUsersCount}
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">الاعتمادات</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {stats.approvalsCount}
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">التجاوزات الخاصة</span>
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {stats.overridesCount}
                    </div>
                </div>
            </div>

            {/* Filter Cockpit Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Employee Picker */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            الموظف المنفذ
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={loadingEmployees}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            <option value="">جميع الموظفين (سجل كامل)</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} {emp.email ? `(${emp.email})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order Number Search */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            رقم الطلب
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                placeholder="مثال: 1042 أو 3812..."
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Change Type Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            نوع الحركة
                        </label>
                        <select
                            value={changeType}
                            onChange={(e) => setChangeType(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            <option value="ALL">جميع الأنواع</option>
                            <option value="normal">حركة عادية</option>
                            <option value="approval">حركة باعتماد مشرف</option>
                            <option value="override">تجاوز مسار (Override)</option>
                        </select>
                    </div>

                    {/* Date Preset Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            الفترة الزمنية
                        </label>
                        <select
                            value={datePreset}
                            onChange={(e) => setDatePreset(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            <option value="ALL">كل الأوقات</option>
                            <option value="TODAY">اليوم فقط</option>
                            <option value="7DAYS">آخر 7 أيام</option>
                            <option value="30DAYS">آخر 30 يوماً</option>
                        </select>
                    </div>
                </form>

                {/* Filter Status & Reset */}
                {(selectedUserId || orderNumber || changeType !== 'ALL' || datePreset !== 'ALL') && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-500">الفلاتر النشطة:</span>
                            {selectedEmployee && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
                                    <User className="w-3 h-3" />
                                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                                </span>
                            )}
                            {orderNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                    #{orderNumber}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 transition"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>مسح الفلاتر</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content Display: Timeline or Table */}
            {logs.length === 0 && !loading ? (
                <div className="p-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {selectedUserId ? 'لا يوجد نشاط مسجل لهذا الموظف' : 'لا توجد حركات مطابقة للبحث'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        حاول تغيير الفلاتر المحددة أو اختر موظفاً آخر للاطلاع على سجل الحركات.
                    </p>
                </div>
            ) : viewMode === 'timeline' ? (
                /* Timeline View */
                <div className="relative space-y-4">
                    <div className="absolute top-0 bottom-0 right-[21px] w-0.5 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                    {logs.map((log) => (
                        <div key={log.id} className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 animate-in fade-in duration-200">
                            {/* Marker */}
                            <div className="hidden sm:flex relative z-10 w-[42px] h-[42px] rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 items-center justify-center shadow-xs shrink-0">
                                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>

                            {/* Card */}
                            <div className="flex-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {log.order?.orderNumber && (
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 tabular-nums">
                                                #{log.order.orderNumber}
                                            </span>
                                        )}
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {log.fromStatus?.name || 'البداية'}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {log.toStatus?.name}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getBadgeStyle(log.changeType)}`}>
                                            {log.changeType === 'override' ? 'تجاوز' : log.changeType === 'approval' ? 'معتمد' : 'عادي'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                                        {new Date(log.createdAt).toLocaleString('ar-EG', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="text-slate-500">تم بواسطة:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : (log.changedBy || 'النظام')}
                                        </span>
                                    </div>

                                    {log.order?.customerName && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">العميل:</span>
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {log.order.customerName}
                                            </span>
                                        </div>
                                    )}

                                    {log.approver && (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="text-slate-500">المعتمد:</span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                {log.approver.firstName} {log.approver.lastName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {log.reason && (
                                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 italic">
                                        "{log.reason}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                <tr>
                                    <th className="py-3 px-4 font-semibold">رقم الطلب</th>
                                    <th className="py-3 px-4 font-semibold">الحالة السابقة</th>
                                    <th className="py-3 px-4 font-semibold">الحالة الجديدة</th>
                                    <th className="py-3 px-4 font-semibold">الموظف المنفذ</th>
                                    <th className="py-3 px-4 font-semibold">العميل</th>
                                    <th className="py-3 px-4 font-semibold">نوع الحركة</th>
                                    <th className="py-3 px-4 font-semibold">التاريخ والوقت</th>
                                    <th className="py-3 px-4 font-semibold">الملاحظات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                                            #{log.order?.orderNumber || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {log.fromStatus?.name || 'البداية'}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                                            {log.toStatus?.name}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                            {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : (log.changedBy || 'النظام')}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {log.order?.customerName || '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getBadgeStyle(log.changeType)}`}>
                                                {log.changeType === 'override' ? 'تجاوز' : log.changeType === 'approval' ? 'معتمد' : 'عادي'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                                            {new Date(log.createdAt).toLocaleString('ar-EG', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate italic">
                                            {log.reason || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && (
                <div className="text-center pt-2">
                    <button
                        type="button"
                        onClick={() => fetchLogs(true)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-xs active:scale-[0.98]"
                    >
                        {loadingMore ? 'جارٍ التحميل...' : 'تحميل المزيد من الحركات'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrderActivityLogPage;
