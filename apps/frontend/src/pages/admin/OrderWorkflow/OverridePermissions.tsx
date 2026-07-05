import React, { useState } from 'react';
import {
    ShieldExclamationIcon,
    UserGroupIcon,
    FingerPrintIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import orderWorkflowService, { OrderWorkflowConfig } from '../../../services/orderWorkflowService';

const AVAILABLE_ROLES = [
    { value: 'OWNER', label: 'مالك الشركة' },
    { value: 'SUPER_ADMIN', label: 'مدير النظام' },
    { value: 'COMPANY_ADMIN', label: 'مدير شركة' },
    { value: 'MANAGER', label: 'مدير' },
    { value: 'AGENT', label: 'موظف / عميل' },
];

interface Props {
    config: OrderWorkflowConfig | null;
    onUpdate: () => void;
}

const OverridePermissions: React.FC<Props> = ({ config, onUpdate }) => {
    const selectedRoles: string[] = config?.overrideRoles
        ? JSON.parse(config.overrideRoles)
        : ['OWNER', 'SUPER_ADMIN'];

    const [draftRoles, setDraftRoles] = useState<string[]>(selectedRoles);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const hasChanges = JSON.stringify([...draftRoles].sort()) !== JSON.stringify([...selectedRoles].sort());

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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">صلاحيات التجاوز (Override)</h2>
                <p className="text-slate-500 text-sm">حدد الأدوار التي تملك صلاحية تجاوز قيود المسار والتحكم الكامل في الحالات</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldExclamationIcon className="w-8 h-8 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">ما هو التجاوز (Override)؟</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            تسمح صلاحية التجاوز للمستخدم الموثوق بتغيير حالة الطلب في حالات الطوارئ أو الاستثناءات، حتى لو كانت القواعد تمنع ذلك (مثلاً: الحالة مغلقة، أو الانتقال غير معرف).
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <UserGroupIcon className="w-5 h-5 text-slate-400" />
                            اختر الأدوار التي تملك حق التجاوز:
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

                        {draftRoles.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">يجب اختيار دور واحد على الأقل</p>
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
                            {saving ? 'جاري الحفظ...' : saved ? '✓ تم الحفظ' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </div>

                <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50">
                    <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-6" />
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-400 mb-4">تحذير أمني</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-500 mb-6 leading-relaxed">
                        صلاحية التجاوز هي صلاحية حساسة جداً. أي عملية تجاوز يتم تسجيلها تلقائياً في سجل الرقابة (Audit Trail) مع اسم المستخدم، الوقت، والسبب المقدم.
                    </p>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-600">لا تعطي هذه الصلاحية إلا لمن تثق بهم تماماً.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-600">عمليات التجاوز تظهر بوضوح في التقارير الإدارية.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverridePermissions;
