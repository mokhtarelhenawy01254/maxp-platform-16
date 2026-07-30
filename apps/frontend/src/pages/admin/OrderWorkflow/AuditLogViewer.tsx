import { Search as MagnifyingGlassIcon, Clock as ClockIcon, User as UserIcon, ArrowRight as ArrowRightIcon, ShieldAlert as ShieldExclamationIcon, Circle as CheckBadgeIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
;
import orderWorkflowService from '../../../services/orderWorkflowService';

const PAGE_SIZE = 20;

const AuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
    const [orderNumber, setOrderNumber] = useState('');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searched, setSearched] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    React.useEffect(() => {
        fetchInitialLogs();
    }, []);

    const fetchInitialLogs = async () => {
        try {
            setLoading(true);
            const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE);
            setLogs(res.data);
            setOffset(res.data.length);
            setHasMore(res.data.length >= PAGE_SIZE);
            setSearched(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNumber) return;
        try {
            setLoading(true);
            const res = await orderWorkflowService.getAuditLogs(orderNumber);
            setLogs(res.data);
            setOffset(res.data.length);
            setHasMore(false);
            setSearched(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        try {
            setLoadingMore(true);
            const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, offset);
            const newLogs = res.data;
            setLogs(prev => [...prev, ...newLogs]);
            setOffset(prev => prev + newLogs.length);
            setHasMore(newLogs.length >= PAGE_SIZE);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'override':
                return <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 font-bold"><ShieldExclamationIcon className="w-3 h-3" />{t('orderSettings.k_127')}</span>;
            case 'approval':
                return <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100 font-bold"><CheckBadgeIcon className="w-3 h-3" />{t('orderSettings.k_128')}</span>;
            default:
                return <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{t('orderSettings.k_129')}</span>;
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('orderSettings.k_130')}</h2>
                <p className="text-slate-500 text-sm">{t('orderSettings.k_131')}</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder={t('orderSettings.k_132')}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {loading ? t('orderSettings.k_133') : t('orderSettings.k_134')}
                </button>
            </form>

            {/* Timeline */}
            <div className="relative">
                {logs.length > 0 && (
                    <div className="absolute top-0 bottom-0 left-[21px] w-0.5 bg-slate-100 dark:bg-slate-800" />
                )}

                {searched && logs.length === 0 && (
                    <div className="p-20 text-center text-slate-400">{t('orderSettings.k_135')}</div>
                )}

                <div className="space-y-8">
                    {logs.map((log) => (
                        <div key={log.id} className="relative flex gap-6 animate-in slide-in-from-left-4 duration-300">
                            <div className="relative z-10 w-[44px] h-[44px] rounded-full bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center shadow-sm">
                                <ClockIcon className="w-5 h-5 text-indigo-500" />
                            </div>

                            <div className="flex-1 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        {log.order?.orderNumber && (
                                            <div className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                                                #{log.order.orderNumber}
                                            </div>
                                        )}
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{log.fromStatus?.name || t('orderSettings.k_104')}</span>
                                        <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                                        <span className="text-sm font-bold text-indigo-600">{log.toStatus?.name}</span>
                                        {getTypeBadge(log.changeType)}
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <UserIcon className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500">{t('orderSettings.k_136')}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{log.user?.firstName} {log.user?.lastName}</span>
                                    </div>
                                    {log.approver && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckBadgeIcon className="w-4 h-4 text-green-500" />
                                            <span className="text-slate-500">{t('orderSettings.k_137')}</span>
                                            <span className="font-medium text-green-600">{log.approver?.firstName} {log.approver?.lastName}</span>
                                        </div>
                                    )}
                                </div>

                                {log.reason && (
                                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 italic">
                                        " {log.reason} "
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {hasMore && !searched && (
                    <div className="text-center mt-8">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        >
                            {loadingMore ? t('orderSettings.k_101') : (
                                <>{t('orderSettings.k_138')}<ChevronDownIcon className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogViewer;
