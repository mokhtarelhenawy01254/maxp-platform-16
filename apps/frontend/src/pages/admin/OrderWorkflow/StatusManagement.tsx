import { Plus as PlusIcon, Pencil as PencilIcon, Trash2 as TrashIcon, Check as CheckCircleIcon, Lock as LockClosedIcon, Ban as NoSymbolIcon, Bell as BellIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
;
import orderWorkflowService, { OrderStatusDefinition } from '../../../services/orderWorkflowService';

interface Props {
    statuses: OrderStatusDefinition[];
    onUpdate: () => void;
}

const StatusManagement: React.FC<Props> = ({ statuses, onUpdate }) => {
  const { t } = useTranslation();
    const [editingStatus, setEditingStatus] = useState<Partial<OrderStatusDefinition> | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<OrderStatusDefinition | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStatus) return;
        if (!editingStatus.name?.trim()) {
            setSaveError(t('orderSettings.k_46'));
            return;
        }
        if (!editingStatus.code?.trim()) {
            setSaveError(t('orderSettings.k_47'));
            return;
        }
        try {
            setSaveError(null);
            await orderWorkflowService.upsertStatus(editingStatus);
            setEditingStatus(null);
            onUpdate();
        } catch (error) {
            setSaveError(error.message || t('orderSettings.k_48'));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteError(null);
            await orderWorkflowService.deleteStatus(deleteTarget.id);
            setDeleteTarget(null);
            onUpdate();
        } catch (error) {
            setDeleteError(error.response?.data?.message || error.message || t('orderSettings.k_49'));
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('orderSettings.k_50')}</h2>
                    <p className="text-slate-500 text-sm">{t('orderSettings.k_51')}</p>
                </div>
                <button
                    onClick={() => setEditingStatus({ name: '', code: '', color: '#6366f1', sortOrder: 0 })}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    {t('orderSettings.k_53')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statuses.map((status) => (
                    <div
                        key={status.id}
                        className="group relative p-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                                style={{ backgroundColor: status.color }}
                            >
                                {status.code}
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setEditingStatus(status)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(status)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{status.name}</h3>

                        <div className="flex flex-wrap gap-2">
                            {status.isTerminal && (
                                <span className="flex items-center gap-1 text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800">
                                    <NoSymbolIcon className="w-3 h-3" /> {t('orderSettings.k_144')}
                                </span>
                            )}
                            {status.lockAfterEntry && (
                                <span className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                    <LockClosedIcon className="w-3 h-3" /> {t('orderSettings.k_145')}
                                </span>
                            )}
                            {status.requiresApprovalToExit && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                    <CheckCircleIcon className="w-3 h-3" /> {t('orderSettings.k_146')}
                                </span>
                            )}
                            {status.notifyCustomer === false && (
                                <span className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                                    <BellIcon className="w-3 h-3" /> {t('orderSettings.k_147')}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Edit/Create */}
            {editingStatus && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSave} className="p-8">
                            <h2 className="text-2xl font-bold mb-6">{editingStatus.id ? t('orderSettings.k_52') : t('orderSettings.k_53')}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('orderSettings.k_54')}</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingStatus.name}
                                        onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                        placeholder={t('orderSettings.k_55')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('orderSettings.k_56')}</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingStatus.code}
                                        onChange={(e) => setEditingStatus({ ...editingStatus, code: e.target.value.toUpperCase() })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                        placeholder={t('orderSettings.k_57')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('orderSettings.k_58')}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={editingStatus.color}
                                                onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                                                className="h-10 w-10 border-0 p-0 bg-transparent cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={editingStatus.color}
                                                onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                                                className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('orderSettings.k_59')}</label>
                                        <input
                                            type="number"
                                            value={editingStatus.sortOrder}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, sortOrder: parseInt(e.target.value) })}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('orderSettings.k_60')}</label>
                                        <textarea
                                            value={editingStatus.description || ''}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, description: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                            placeholder={t('orderSettings.k_61')}
                                            rows={2}
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={editingStatus.isTerminal}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, isTerminal: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-sm">
                                            <p className="font-bold">{t('orderSettings.k_62')}</p>
                                            <p className="text-slate-500 text-xs">{t('orderSettings.k_63')}</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={editingStatus.lockAfterEntry}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, lockAfterEntry: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-sm">
                                            <p className="font-bold">{t('orderSettings.k_64')}</p>
                                            <p className="text-slate-500 text-xs">{t('orderSettings.k_65')}</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={editingStatus.requiresApprovalToExit}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, requiresApprovalToExit: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-sm">
                                            <p className="font-bold">{t('orderSettings.k_66')}</p>
                                            <p className="text-slate-500 text-xs">{t('orderSettings.k_67')}</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={editingStatus.notifyCustomer ?? true}
                                            onChange={(e) => setEditingStatus({ ...editingStatus, notifyCustomer: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-sm">
                                            <p className="font-bold flex items-center gap-1">
                                                <BellIcon className="w-4 h-4" />
                                                {t('orderSettings.k_148')}
                                            </p>
                                            <p className="text-slate-500 text-xs">{t('orderSettings.k_68')}</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {saveError && (
                                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                                    {saveError}
                                </div>
                            )}

                            <div className="flex gap-4 mt-8">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                                >
                                    {t('orderSettings.k_149')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingStatus(null); setSaveError(null); }}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 transition"
                                >
                                    {t('orderSettings.k_95')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-8">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">{t('orderSettings.k_69')}</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-2">
                            {t('orderSettings.k_150')} <strong>"{deleteTarget.name}"</strong>{t('orderSettings.k_151')}
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            {t('orderSettings.k_152')}
                        </p>
                        {deleteError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                                {deleteError}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition"
                            >
                                {t('orderSettings.k_69')}
                            </button>
                            <button
                                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 transition"
                            >
                                {t('orderSettings.k_95')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusManagement;
