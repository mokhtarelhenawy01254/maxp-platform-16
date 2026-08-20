import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from 'react';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    ArrowsRightLeftIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    ExclamationCircleIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import orderWorkflowService, {
    OrderStatusDefinition,
    OrderWorkflowTransition
} from '../../../services/orderWorkflowService';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuthSimple';

interface Props {
    statuses: OrderStatusDefinition[];
    onUpdate: () => void;
}

const TransitionRules: React.FC<Props> = ({ statuses, onUpdate }) => {
  const { t } = useTranslation();
    const { user } = useAuth();
    const [transitions, setTransitions] = useState<OrderWorkflowTransition[]>([]);
    const [employees, setEmployees] = useState<{id: string, firstName: string, lastName: string}[]>([]);
    const [employeePage, setEmployeePage] = useState(1);
    const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
    const [loadingMoreEmployees, setLoadingMoreEmployees] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [newRule, setNewRule] = useState<Partial<OrderWorkflowTransition>>({
        fromStatusId: '',
        toStatusId: '',
        allowedRoles: '["OWNER", "SUPER_ADMIN"]',
        requiresApproval: false,
        allowOverride: false,
        restrictBackward: false
    });

    const availableRoles = [
        { value: 'OWNER', label: t('orderSettings.k_70') },
        { value: 'SUPER_ADMIN', label: t('orderSettings.k_71') },
        { value: 'COMPANY_ADMIN', label: t('orderSettings.k_72') },
        { value: 'MANAGER', label: t('orderSettings.k_73') },
        { value: 'AGENT', label: t('orderSettings.k_74') },
    ];

    const filteredEmployees = useMemo(() => {
        if (!employeeSearch) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    useEffect(() => {
        fetchTransitions();
        if (user?.companyId) {
            fetchEmployees(1, false);
        }
    }, [user?.companyId]);

    const fetchEmployees = async (page = 1, append = false) => {
        try {
            const res = await api.get(`/companies/${user.companyId}/users?limit=100&page=${page}`);
            if (res.data?.success && res.data?.data?.users) {
                const newUsers = res.data.data.users;
                if (append) {
                    setEmployees(prev => [...prev, ...newUsers]);
                } else {
                    setEmployees(newUsers);
                }
                setHasMoreEmployees(newUsers.length >= 100);
                setEmployeePage(page);
            } else {
                setHasMoreEmployees(false);
            }
        } catch (error) {
            console.error('Failed to fetch employees', error);
        }
    };

    const loadMoreEmployees = async () => {
        setLoadingMoreEmployees(true);
        await fetchEmployees(employeePage + 1, true);
        setLoadingMoreEmployees(false);
    };

    const fetchTransitions = async () => {
        try {
            const res = await orderWorkflowService.getTransitions();
            setTransitions(res.data);
        } catch (error) {
            console.error('Failed to fetch transitions', error);
        }
    };

    const resetForm = () => {
        setNewRule({
            fromStatusId: '',
            toStatusId: '',
            allowedRoles: '["OWNER", "SUPER_ADMIN"]',
            requiresApproval: false,
            allowOverride: false,
            restrictBackward: false
        });
        setIsAdding(false);
        setEditingId(null);
        setSaveError(null);
        setEmployeeSearch('');
    };

    const handleEdit = (transition: OrderWorkflowTransition) => {
        setNewRule({
            id: transition.id,
            fromStatusId: transition.fromStatusId || '',
            toStatusId: transition.toStatusId,
            allowedRoles: transition.allowedRoles,
            requiresApproval: transition.requiresApproval,
            allowOverride: transition.allowOverride || false,
            restrictBackward: transition.restrictBackward
        });
        setEditingId(transition.id);
        setIsAdding(true);
        setSaveError(null);
        setEmployeeSearch('');
    };

    const handleSave = async () => {
        if (!newRule.toStatusId) {
            setSaveError(t('orderSettings.k_75'));
            return;
        }
        const roles = JSON.parse(newRule.allowedRoles || '[]');
        if (roles.length === 0) {
            setSaveError(t('orderSettings.k_76'));
            return;
        }
        try {
            setSaveError(null);
            await orderWorkflowService.upsertTransition(newRule);
            resetForm();
            fetchTransitions();
            onUpdate();
        } catch (error) {
            setSaveError(error.message || t('orderSettings.k_77'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('orderSettings.k_78'))) return;
        try {
            await orderWorkflowService.deleteTransition(id);
            fetchTransitions();
            onUpdate();
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const getStatusName = (id: string | null) => {
        if (!id) return t('orderSettings.k_79');
        return statuses.find(s => s.id === id)?.name || t('orderSettings.k_80');
    };

    const renderSaveCancelButtons = () => (
        <div className="flex gap-4">
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                {editingId ? t('orderSettings.k_149') : t('orderSettings.k_94')}
            </button>
            <button onClick={resetForm} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">{t('orderSettings.k_95')}</button>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('orderSettings.k_81')}</h2>
                    <p className="text-slate-500 text-sm">{t('orderSettings.k_82')}</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsAdding(true); }}
                    disabled={isAdding && !editingId}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    <PlusIcon className="w-5 h-5" />
                    {t('orderSettings.k_153')}
                </button>
            </div>

            <div className="space-y-4">
                {transitions.length === 0 && !isAdding && (
                    <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <ArrowsRightLeftIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-400">{t('orderSettings.k_83')}</p>
                    </div>
                )}

                {isAdding && (
                    <div className="p-6 rounded-3xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold text-base mb-4 text-indigo-700 dark:text-indigo-400">
                            {editingId ? t('orderSettings.k_166') : t('orderSettings.k_153')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('orderSettings.k_84')}</label>
                                <select
                                    value={newRule.fromStatusId}
                                    onChange={(e) => setNewRule({ ...newRule, fromStatusId: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                >
                                    <option value="">{t('orderSettings.k_79')}</option>
                                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('orderSettings.k_85')}</label>
                                <select
                                    value={newRule.toStatusId}
                                    onChange={(e) => setNewRule({ ...newRule, toStatusId: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                >
                                    <option value="">{t('orderSettings.k_86')}</option>
                                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('orderSettings.k_87')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableRoles.map(role => (
                                        <label key={role.value} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={JSON.parse(newRule.allowedRoles || '[]').includes(role.value)}
                                                onChange={(e) => {
                                                    const roles = JSON.parse(newRule.allowedRoles || '[]');
                                                    const updated = e.target.checked
                                                        ? [...roles, role.value]
                                                        : roles.filter((r: string) => r !== role.value);
                                                    setNewRule({ ...newRule, allowedRoles: JSON.stringify(updated) });
                                                }}
                                            />
                                            {role.label}
                                        </label>
                                    ))}
                                </div>
                                <label className="block text-sm font-medium mb-1 mt-4">{t('orderSettings.k_88')}</label>
                                <div className="relative mb-2">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        placeholder={t('orderSettings.k_167')}
                                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-100 dark:border-slate-700 rounded-lg">
                                    {filteredEmployees.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={JSON.parse(newRule.allowedRoles || '[]').includes(emp.id)}
                                                onChange={(e) => {
                                                    const roles = JSON.parse(newRule.allowedRoles || '[]');
                                                    const updated = e.target.checked
                                                        ? [...roles, emp.id]
                                                        : roles.filter((r: string) => r !== emp.id);
                                                    setNewRule({ ...newRule, allowedRoles: JSON.stringify(updated) });
                                                }}
                                            />
                                            {emp.firstName} {emp.lastName}
                                        </label>
                                    ))}
                                    {employees.length === 0 && <p className="text-xs text-slate-400 col-span-2">{t('orderSettings.k_89')}</p>}
                                    {employees.length > 0 && filteredEmployees.length === 0 && <p className="text-xs text-slate-400 col-span-2">{t('orderSettings.k_169')}</p>}
                                </div>
                                {hasMoreEmployees && (
                                    <button
                                        onClick={loadMoreEmployees}
                                        disabled={loadingMoreEmployees}
                                        className="mt-2 w-full py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loadingMoreEmployees ? t('orderSettings.k_101') : t('orderSettings.k_138')}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRule.requiresApproval}
                                        onChange={(e) => setNewRule({ ...newRule, requiresApproval: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300"
                                    />
                                    <div className="text-sm">
                                        <p className="font-bold">{t('orderSettings.k_90')}</p>
                                        <p className="text-slate-500 text-xs">{t('orderSettings.k_91')}</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRule.allowOverride}
                                        onChange={(e) => setNewRule({ ...newRule, allowOverride: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300"
                                    />
                                    <div className="text-sm">
                                        <p className="font-bold">{t('orderSettings.k_170')}</p>
                                        <p className="text-slate-500 text-xs">{t('orderSettings.k_171')}</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newRule.restrictBackward}
                                        onChange={(e) => setNewRule({ ...newRule, restrictBackward: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300"
                                    />
                                    <div className="text-sm">
                                        <p className="font-bold">{t('orderSettings.k_92')}</p>
                                        <p className="text-slate-500 text-xs">{t('orderSettings.k_93')}</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {saveError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                                {saveError}
                            </div>
                        )}

                        {renderSaveCancelButtons()}
                    </div>
                )}

                {transitions.map((tr) => (
                    <div
                        key={tr.id}
                        className="flex flex-col md:flex-row items-center justify-between p-5 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow gap-4"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{getStatusName(tr.fromStatusId)}</span>
                                <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-400" />
                                <span className="font-bold text-indigo-600">{getStatusName(tr.toStatusId)}</span>
                            </div>

                            <div className="hidden md:flex flex-wrap items-center gap-2 px-6 border-x border-slate-100 dark:border-slate-700">
                                {JSON.parse(tr.allowedRoles || '[]').map((role: string) => {
                                    const roleObj = availableRoles.find(r => r.value === role);
                                    const empObj = employees.find(e => e.id === role);
                                    const label = roleObj ? roleObj.label : (empObj ? `${empObj.firstName} ${empObj.lastName}` : role);
                                    return (
                                        <span key={role} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                                            {label}
                                        </span>
                                    );
                                })}
                                {tr.requiresApproval && <ShieldCheckIcon className="w-5 h-5 text-amber-500" title={t('orderSettings.k_96')} />}
                                {tr.allowOverride && <ShieldExclamationIcon className="w-5 h-5 text-orange-500" title={t('orderSettings.k_170')} />}
                                {tr.restrictBackward && <ExclamationCircleIcon className="w-5 h-5 text-red-400" title={t('orderSettings.k_97')} />}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleEdit(tr)}
                                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                                title={t('orderSettings.k_168')}
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleDelete(tr.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TransitionRules;
