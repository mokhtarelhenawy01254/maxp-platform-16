import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    ArrowsRightLeftIcon,
    ShieldCheckIcon,
    ClockIcon,
    CheckBadgeIcon,
    AdjustmentsVerticalIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import orderWorkflowService, { OrderStatusDefinition, OrderWorkflowConfig } from '../../../services/orderWorkflowService';
import TransitionRules from './TransitionRules';
import ApprovalRules from './ApprovalRules';
import OverridePermissions from './OverridePermissions';
import AuditLogViewer from './AuditLogViewer';
import TabErrorBoundary from './TabErrorBoundary';

interface OrderWorkflowProps {
    isEmbedded?: boolean;
}

const OrderWorkflow: React.FC<OrderWorkflowProps> = ({ isEmbedded }) => {
  const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('settings');
    const [config, setConfig] = useState<OrderWorkflowConfig | null>(null);
    const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasTransitions, setHasTransitions] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configData, statusesData, transitionsData] = await Promise.all([
                orderWorkflowService.getConfig(),
                orderWorkflowService.getStatuses(),
                orderWorkflowService.getTransitions()
            ]);
            setConfig(configData.data);
            setHasTransitions((transitionsData.data || []).length > 0);
            const statuses = statusesData.data || [];
            try {
                const seedResult = await orderWorkflowService.seedDefaultStatuses();
                if (seedResult?.data?.length > 0) {
                    const refreshed = await orderWorkflowService.getStatuses();
                    setStatuses(refreshed.data || []);
                    toast.success(t('orderSettings.imported_statuses_success', { count: seedResult.data.length }), { duration: 3000 });
                } else {
                    setStatuses(statuses);
                }
            } catch (seedErr) {
                console.warn('Seed defaults failed:', seedErr);
                setStatuses(statuses);
            }
        } catch (error) {
            console.error('Failed to fetch workflow data', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'settings', label: t('orderSettings.k_27'), icon: AdjustmentsVerticalIcon },
        { id: 'transitions', label: t('orderSettings.k_28'), icon: ArrowsRightLeftIcon },
        { id: 'approvals', label: t('orderSettings.k_29'), icon: CheckBadgeIcon },
        { id: 'overrides', label: t('orderSettings.k_30'), icon: ShieldCheckIcon },
        { id: 'audit', label: t('orderSettings.k_31'), icon: ClockIcon },
    ];

    const handleToggleWorkflow = async (enabled: boolean) => {
        if (!config) return;
        try {
            const updated = await orderWorkflowService.updateConfig({ enabled });
            setConfig(updated.data);
        } catch (error) {
            console.error('Failed to update config', error);
        }
    };

    return (
        <div className={`${isEmbedded ? '' : 'p-6 bg-slate-50 min-h-screen dark:bg-slate-900'}`}>
            <div className={`${isEmbedded ? 'w-full' : 'max-w-6xl 2xl:max-w-7xl mx-auto'}`}>
                {/* Header - Hide if embedded */}
                {!isEmbedded && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 text-white">
                                    <ArrowsRightLeftIcon className="w-8 h-8" />
                                </div>
                                {t('orderSettings.k_32')}
                            </h1>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">
                                {t('orderSettings.k_141')}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('orderSettings.k_142')}
                            </span>
                            <button
                                onClick={() => handleToggleWorkflow(!config?.enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config?.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Banner and Settings Header if embedded */}
                {isEmbedded && (
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('orderSettings.k_32')}</h2>
                            <p className="text-xs text-slate-500">{t('orderSettings.k_33')}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                            <span className="text-xs font-medium">{t('orderSettings.k_34')}</span>
                            <button
                                onClick={() => handleToggleWorkflow(!config?.enabled)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${config?.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config?.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Banner if disabled */}
                {!config?.enabled && !loading && (
                    <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-400">
                        <ShieldCheckIcon className="w-6 h-6 flex-shrink-0" />
                        <p className="text-sm">
                            {t('orderSettings.k_143')}
                        </p>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id === 'transitions') {
                                        orderWorkflowService.getStatuses()
                                            .then(res => setStatuses((res.data || [])))
                                            .catch(() => {});
                                    }
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <tab.icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </div>
                                <ChevronRightIcon className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
                            </button>
                        ))}
                    </div>

                    {/* tab Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {loading ? (
                                <div className="p-20 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p className="mt-4 text-slate-500">{t('orderSettings.k_35')}</p>
                                </div>
                            ) : (
                                <div className="p-8">
                                    {activeTab === 'settings' && (
                                        <TabErrorBoundary tabLabel={t('orderSettings.k_27')}>
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {config?.enabled && !hasTransitions && (
                                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 flex gap-3 text-amber-700 dark:text-amber-400">
                                                    <ShieldCheckIcon className="w-6 h-6 flex-shrink-0" />
                                                    <div className="text-sm">
                                                        <p className="font-bold mb-1">{t('orderSettings.k_36')}</p>
                                                        <p>{t('orderSettings.k_37')}<strong>{t('orderSettings.k_28')}</strong>{t('orderSettings.k_38')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('orderSettings.k_39')}</h2>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                                        <h3 className="font-bold mb-2">{t('orderSettings.k_40')}</h3>
                                                        <p className="text-sm text-slate-500 mb-4">{t('orderSettings.k_41')}</p>
                                                        <button
                                                            onClick={() => orderWorkflowService.updateConfig({ enforceTransitions: !config?.enforceTransitions }).then(fetchData)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold ${config?.enforceTransitions ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {config?.enforceTransitions ? t('orderSettings.k_42') : t('orderSettings.k_43')}
                                                        </button>
                                                    </div>
                                                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                                        <h3 className="font-bold mb-2">{t('orderSettings.k_44')}</h3>
                                                        <p className="text-sm text-slate-500 mb-4">{t('orderSettings.k_45')}</p>
                                                        <button
                                                            onClick={() => orderWorkflowService.updateConfig({ requireApprovalByDefault: !config?.requireApprovalByDefault }).then(fetchData)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold ${config?.requireApprovalByDefault ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {config?.requireApprovalByDefault ? t('orderSettings.k_42') : t('orderSettings.k_43')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        </TabErrorBoundary>
                                    )}
                                    {activeTab === 'transitions' && <TabErrorBoundary tabLabel={t('orderSettings.k_28')}><TransitionRules statuses={statuses} onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'approvals' && <TabErrorBoundary tabLabel={t('orderSettings.k_29')}><ApprovalRules onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'overrides' && <TabErrorBoundary tabLabel={t('orderSettings.k_30')}><OverridePermissions config={config} onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'audit' && <TabErrorBoundary tabLabel={t('orderSettings.k_31')}><AuditLogViewer /></TabErrorBoundary>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderWorkflow;
