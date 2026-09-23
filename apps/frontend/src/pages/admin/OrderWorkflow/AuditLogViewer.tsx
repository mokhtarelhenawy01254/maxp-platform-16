import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    ClockIcon,
    UserIcon,
    ArrowRightIcon,
    ShieldExclamationIcon,
    CheckBadgeIcon,
    ChevronDownIcon,
    XMarkIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
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

    // Fetch company employees for the filter dropdown
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

            // If an employee is also selected, filter client-side on that order's logs
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
                    <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/50 font-bold">
                        <ShieldExclamationIcon className="w-3 h-3" />
                        {t('orderSettings.k_127', 'تجاوز')}
                    </span>
                );
            case 'approval':
                return (
                    <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/50 font-bold">
                        <CheckBadgeIcon className="w-3 h-3" />
                        {t('orderSettings.k_128', 'معتمد')}
                    </span>
                );
            default:
                return (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        {t('orderSettings.k_129', 'عادي')}
                    </span>
                );
        }
    };

    const selectedEmployee = employees.find(e => e.id === selectedUserId);

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t('orderSettings.k_130', 'سجل العمليات وتغيير الحالات')}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {t('orderSettings.k_131', 'متابعة سجل نشاط الموظفين وتغيير حالات الطلبات والاعتمادات')}
                </p>
            </div>

            {/* Controls Bar (Employee Filter + Order Search) */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                    {/* Employee Filter Dropdown */}
                    <div className="w-full md:w-72 relative">
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                            <FunnelIcon className="w-4 h-4" />
                        </div>
                        <select
                            value={selectedUserId}
                            onChange={(e) => handleEmployeeChange(e.target.value)}
                            disabled={loading || loadingEmployees}
                            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
                        >
                            <option value="">{t('orderWorkflow.allEmployees', 'جميع الموظفين (سجل كامل)')}</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} {emp.email ? `(${emp.email})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order Number Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder={t('orderSettings.k_132', 'البحث برقم الطلب (مثال: 1042)...')}
                            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-sm font-medium transition disabled:opacity-50 shadow-sm"
                        >
                            {loading ? t('orderSettings.k_133', 'جارٍ البحث...') : t('orderSettings.k_134', 'بحث')}
                        </button>

                        {(selectedUserId || orderNumber || searched) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                disabled={loading}
                                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium transition flex items-center gap-1.5"
                                title="إعادة تعيين الفلاتر"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">إلغاء الفلتر</span>
                            </button>
                        )}
                    </div>
                </form>

                {/* Active Filter Indicators */}
                {selectedEmployee && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">تصفية نشاط الموظف:</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-medium">
                                <UserIcon className="w-3.5 h-3.5" />
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                            </span>
                        </div>
                        <span className="text-slate-400 tabular-nums">
                            {logs.length} عملية مسجلة
                        </span>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="relative">
                {logs.length > 0 && (
                    <div className="absolute top-0 bottom-0 right-[21px] w-0.5 bg-slate-200 dark:bg-slate-800" />
                )}

                {logs.length === 0 && !loading && (
                    <div className="p-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <ClockIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {selectedUserId
                                ? 'لا توجد حركات تغيير حالات مسجلة لهذا الموظف'
                                : t('orderSettings.k_135', 'لا توجد سجلات تطابق البحث')}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            {selectedUserId
                                ? 'لم يقم هذا الموظف بتغيير حالة أي طلب حتى الآن أو ضمن نطاق البحث المحدد.'
                                : 'تأكد من رقم الطلب أو قم بإلغاء الفلتر لعرض السجل العام.'}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="relative flex gap-4 animate-in slide-in-from-right-3 duration-200">
                            {/* Timeline bullet */}
                            <div className="relative z-10 w-[42px] h-[42px] rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0">
                                <ClockIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>

                            {/* Card Content */}
                            <div className="flex-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {log.order?.orderNumber && (
                                            <div className="bg-slate-100 dark:bg-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 tabular-nums">
                                                #{log.order.orderNumber}
                                            </div>
                                        )}
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {log.fromStatus?.name || t('orderSettings.k_104', 'البداية')}
                                        </span>
                                        <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {log.toStatus?.name}
                                        </span>
                                        {getTypeBadge(log.changeType)}
                                    </div>
                                    <span className="text-xs text-slate-400 tabular-nums font-mono">
                                        {new Date(log.createdAt).toLocaleString('ar-EG', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-500">{t('orderSettings.k_136', 'تم بواسطة:')}</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : (log.changedBy || 'النظام')}
                                        </span>
                                    </div>
                                    {log.approver && (
                                        <div className="flex items-center gap-2">
                                            <CheckBadgeIcon className="w-4 h-4 text-green-500 shrink-0" />
                                            <span className="text-slate-500">{t('orderSettings.k_137', 'المعتمد:')}</span>
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                                {log.approver.firstName} {log.approver.lastName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {log.reason && (
                                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                                        "{log.reason}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {hasMore && !searched && (
                    <div className="text-center mt-6">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-50 shadow-xs"
                        >
                            {loadingMore ? t('orderSettings.k_101', 'جارٍ التحميل...') : (
                                <>
                                    <span>{t('orderSettings.k_138', 'تحميل المزيد من السجلات')}</span>
                                    <ChevronDownIcon className="w-3.5 h-3.5" />
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
