import React from 'react';
import {
    ShieldExclamationIcon,
    UserGroupIcon,
    FingerPrintIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const OverridePermissions: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">صلاحيات التجاوز (Override)</h2>
                <p className="text-slate-500 text-sm">إدارة الصلاحيات التي تسمح بتجاوز قيود المسار والتحكم الكامل في الحالات</p>
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
                            الأدوار التي تملك حق التجاوز حالياً:
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <FingerPrintIcon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="font-bold">مالك الشركة (OWNER)</span>
                                </div>
                                <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                            </li>
                            <li className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 opacity-80">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <UserGroupIcon className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <span className="font-bold">مدير النظام (SUPER_ADMIN)</span>
                                </div>
                                <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                            </li>
                        </ul>
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
