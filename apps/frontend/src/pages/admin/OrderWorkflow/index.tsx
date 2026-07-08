import React, { useState, useEffect } from 'react';
import {
    ArrowsRightLeftIcon,
    ListBulletIcon,
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
    const [activeTab, setActiveTab] = useState('settings');
    const [config, setConfig] = useState<OrderWorkflowConfig | null>(null);
    const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configData, statusesData] = await Promise.all([
                orderWorkflowService.getConfig(),
                orderWorkflowService.getStatuses()
            ]);
            setConfig(configData.data);
            setStatuses(statusesData.data);
        } catch (error) {
            console.error('Failed to fetch workflow data', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'settings', label: 'الإعدادات العامة', icon: AdjustmentsVerticalIcon },
        { id: 'transitions', label: 'قواعد الانتقال', icon: ArrowsRightLeftIcon },
        { id: 'approvals', label: 'طلبات الموافقة', icon: CheckBadgeIcon },
        { id: 'overrides', label: 'صلاحيات التجاوز', icon: ShieldCheckIcon },
        { id: 'audit', label: 'سجل العمليات', icon: ClockIcon },
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
            <div className={`${isEmbedded ? 'w-full' : 'max-w-7xl mx-auto'}`}>
                {/* Header - Hide if embedded */}
                {!isEmbedded && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 text-white">
                                    <ArrowsRightLeftIcon className="w-8 h-8" />
                                </div>
                                مسار حالات الطلبات والصلاحيات
                            </h1>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">
                                إدارة دورة حياة الطلبات، قواعد الانتقال، ونظام الموافقات المتقدم
                            </p>
                        </div>

                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                تفعيل نظام المسار المتقدم:
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
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">مسار حالات الطلبات والصلاحيات</h2>
                            <p className="text-xs text-slate-500">إدارة دورة حياة الطلبات، قواعد الانتقال، ونظام الموافقات</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                            <span className="text-xs font-medium">الحالة:</span>
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
                            نظام المسار معطل حالياً. الطلبات ستتبع السلوك الافتراضي دون قيود. يمكنك تهيئة الإعدادات أدناه ثم التفعيل عندما تكون جاهزاً.
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
                                onClick={() => setActiveTab(tab.id)}
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
                                    <p className="mt-4 text-slate-500">جاري تحميل البيانات...</p>
                                </div>
                            ) : (
                                <div className="p-8">
                                    {activeTab === 'settings' && (
                                        <TabErrorBoundary tabLabel="الإعدادات العامة">
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">الإعدادات العامة للمسار</h2>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                                        <h3 className="font-bold mb-2">فرض قواعد الانتقال</h3>
                                                        <p className="text-sm text-slate-500 mb-4">منع أي تغيير في حالة الطلب إذا لم يكن هناك قاعدة انتقال معرفة.</p>
                                                        <button
                                                            onClick={() => orderWorkflowService.updateConfig({ enforceTransitions: !config?.enforceTransitions }).then(fetchData)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold ${config?.enforceTransitions ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {config?.enforceTransitions ? 'مفعل' : 'معطل'}
                                                        </button>
                                                    </div>
                                                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                                        <h3 className="font-bold mb-2">طلب موافقة افتراضياً</h3>
                                                        <p className="text-sm text-slate-500 mb-4">كل عمليات تغيير الحالة ستحتاج موافقة المدير ما لم يحدد خلاف ذلك.</p>
                                                        <button
                                                            onClick={() => orderWorkflowService.updateConfig({ requireApprovalByDefault: !config?.requireApprovalByDefault }).then(fetchData)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold ${config?.requireApprovalByDefault ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                                                        >
                                                            {config?.requireApprovalByDefault ? 'مفعل' : 'معطل'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        </TabErrorBoundary>
                                    )}
                                    {activeTab === 'transitions' && <TabErrorBoundary tabLabel="قواعد الانتقال"><TransitionRules statuses={statuses} onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'approvals' && <TabErrorBoundary tabLabel="طلبات الموافقة"><ApprovalRules onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'overrides' && <TabErrorBoundary tabLabel="صلاحيات التجاوز"><OverridePermissions config={config} onUpdate={fetchData} /></TabErrorBoundary>}
                                    {activeTab === 'audit' && <TabErrorBoundary tabLabel="سجل العمليات"><AuditLogViewer /></TabErrorBoundary>}
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
