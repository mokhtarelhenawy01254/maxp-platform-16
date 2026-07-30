import { ShieldAlert as ShieldExclamationIcon, Circle as UserGroupIcon, Circle as FingerPrintIcon, AlertTriangle as ExclamationTriangleIcon, Check as CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
;
import orderWorkflowService, { OrderWorkflowConfig } from '../../../services/orderWorkflowService';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuthSimple';

const getAvailableRoles = (t: any) => [
    { value: 'OWNER', label: t('orderSettings.k_70') },
    { value: 'SUPER_ADMIN', label: t('orderSettings.k_71') },
    { value: 'COMPANY_ADMIN', label: t('orderSettings.k_72') },
    { value: 'MANAGER', label: t('orderSettings.k_73') },
    { value: 'AGENT', label: t('orderSettings.k_74') },
];

interface Props {
    config: OrderWorkflowConfig | null;
    onUpdate: () => void;
}

const OverridePermissions: React.FC<Props> = ({ config, onUpdate }) => {
  const { t } = useTranslation();
  const AVAILABLE_ROLES = React.useMemo(() => getAvailableRoles(t), [t]);
    const { user } = useAuth();
    const selectedRoles: string[] = config?.overrideRoles
        ? JSON.parse(config.overrideRoles)
        : ['OWNER', 'SUPER_ADMIN'];

    const [draftRoles, setDraftRoles] = useState<string[]>(selectedRoles);
    const [employees, setEmployees] = useState<{id: string, firstName: string, lastName: string}[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const hasChanges = JSON.stringify([...draftRoles].sort()) !== JSON.stringify([...selectedRoles].sort());

    useEffect(() => {
        if (user?.companyId) {
            api.get(`/companies/${user.companyId}/users?limit=100`)
                .then(res => {
                    if (res.data?.success && res.data?.data?.users) {
                        setEmployees(res.data.data.users);
                    }
                })
                .catch(err => console.error('Failed to fetch employees', err));
        }
    }, [user?.companyId]);

    const handleToggle = (role: string) => {
        setDraftRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
        setSaved(false);
    };

    const handleSave = async () => {
        if (draftRoles.length === 0) return;
        try {
            setSaving(true);
            await orderWorkflowService.updateConfig({ overrideRoles: JSON.stringify(draftRoles) });
            setSaved(true);
            onUpdate();
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save override roles', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('orderSettings.k_115')}</h2>
                <p className="text-slate-500 text-sm">{t('orderSettings.k_116')}</p>
            </div>

            {/* Allow Override Toggle */}
            <div className="mb-8 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{t('orderSettings.k_117')}</h3>
                        <p className="text-sm text-slate-500">{t('orderSettings.k_118')}</p>
                    </div>
                    <button
                        onClick={async () => {
                            await orderWorkflowService.updateConfig({ allowOverride: !config?.allowOverride });
                            onUpdate();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config?.allowOverride !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.allowOverride !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldExclamationIcon className="w-8 h-8 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('orderSettings.k_119')}</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('orderSettings.k_159')}
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <UserGroupIcon className="w-5 h-5 text-slate-400" />
                            {t('orderSettings.k_160')}
                        </h3>
                        <div className="space-y-3">
                            {AVAILABLE_ROLES.map(role => {
                                const isSelected = draftRoles.includes(role.value);
                                return (
                                    <button
                                        key={role.value}
                                        onClick={() => handleToggle(role.value)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                isSelected
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                                <FingerPrintIcon className="w-4 h-4" />
                                            </div>
                                            <span className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {role.label}
                                            </span>
                                        </div>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 border-indigo-600'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Employee-level override selection */}
                        {employees.length > 0 && (
                            <>
                                <h3 className="font-bold flex items-center gap-2 mt-6 mb-3">
                                    <UserGroupIcon className="w-5 h-5 text-slate-400" />
                                    {t('orderSettings.k_161')}
                                </h3>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    {employees.map(emp => {
                                        const isSelected = draftRoles.includes(emp.id);
                                        return (
                                            <button
                                                key={emp.id}
                                                onClick={() => handleToggle(emp.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </div>
                                                    <span className={`font-medium text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {emp.firstName} {emp.lastName}
                                                    </span>
                                                </div>
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }`}>
                                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {draftRoles.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">{t('orderSettings.k_120')}</p>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || draftRoles.length === 0 || saving}
                            className={`mt-4 w-full py-3 rounded-2xl font-bold transition-all ${
                                !hasChanges || draftRoles.length === 0
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : saving
                                        ? 'bg-indigo-400 text-white cursor-wait'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {saving ? t('orderSettings.k_121') : saved ? t('orderSettings.k_122') : t('orderSettings.k_123')}
                        </button>
                    </div>
                </div>

                <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50">
                    <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-6" />
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-400 mb-4">{t('orderSettings.k_124')}</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-500 mb-6 leading-relaxed">
                        {t('orderSettings.k_162')}
                    </p>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-600">{t('orderSettings.k_125')}</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-600">{t('orderSettings.k_126')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverridePermissions;
