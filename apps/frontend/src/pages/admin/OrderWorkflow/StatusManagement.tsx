import { useTranslation } from "react-i18next";
import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Lock,
  Ban,
  Bell,
  AlertCircle,
  X,
  Tag,
} from 'lucide-react';
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
    } catch (error: any) {
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
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || error.message || t('orderSettings.k_49'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">{t('orderSettings.k_50')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('orderSettings.k_51')}</p>
        </div>
        <button
          onClick={() => setEditingStatus({ name: '', code: '', color: '#3b82f6', sortOrder: 0 })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('orderSettings.k_53')}
        </button>
      </div>

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <div
            key={status.id}
            className="bg-card border border-border/70 rounded-xl p-4 hover:border-primary/40 transition-colors shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-white shadow-xs"
                style={{ backgroundColor: status.color || '#3b82f6' }}
              >
                {status.code}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingStatus(status)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  title="تعديل الحالة"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(status)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="حذف الحالة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground">{status.name}</h3>
              {status.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{status.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
              {status.isTerminal && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-medium">
                  <Ban className="w-3 h-3" /> {t('orderSettings.k_144')}
                </span>
              )}
              {status.lockAfterEntry && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground border border-border/70 px-2 py-0.5 rounded-md font-medium">
                  <Lock className="w-3 h-3" /> {t('orderSettings.k_145')}
                </span>
              )}
              {status.requiresApprovalToExit && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {t('orderSettings.k_146')}
                </span>
              )}
              {status.notifyCustomer === false && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground border border-border/70 px-2 py-0.5 rounded-md font-medium">
                  <Bell className="w-3 h-3" /> {t('orderSettings.k_147')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Edit/Create */}
      {editingStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground">
                {editingStatus.id ? t('orderSettings.k_52') : t('orderSettings.k_53')}
              </h2>
              <button
                onClick={() => { setEditingStatus(null); setSaveError(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('orderSettings.k_54')}</label>
                <input
                  required
                  type="text"
                  value={editingStatus.name || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border/70 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                  placeholder={t('orderSettings.k_55')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('orderSettings.k_56')}</label>
                <input
                  required
                  type="text"
                  value={editingStatus.code || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-lg border border-border/70 bg-background font-mono text-sm text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                  placeholder={t('orderSettings.k_57')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('orderSettings.k_58')}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingStatus.color || '#3b82f6'}
                      onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                      className="h-9 w-9 rounded-lg border border-border/70 p-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingStatus.color || '#3b82f6'}
                      onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                      className="flex-1 p-2 rounded-lg border border-border/70 bg-background font-mono text-xs text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('orderSettings.k_59')}</label>
                  <input
                    type="number"
                    value={editingStatus.sortOrder ?? 0}
                    onChange={(e) => setEditingStatus({ ...editingStatus, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-lg border border-border/70 bg-background font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('orderSettings.k_60')}</label>
                <textarea
                  value={editingStatus.description || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground"
                  placeholder={t('orderSettings.k_61')}
                  rows={2}
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStatus.isTerminal || false}
                    onChange={(e) => setEditingStatus({ ...editingStatus, isTerminal: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t('orderSettings.k_62')}</p>
                    <p className="text-muted-foreground">{t('orderSettings.k_63')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStatus.lockAfterEntry || false}
                    onChange={(e) => setEditingStatus({ ...editingStatus, lockAfterEntry: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t('orderSettings.k_64')}</p>
                    <p className="text-muted-foreground">{t('orderSettings.k_65')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStatus.requiresApprovalToExit || false}
                    onChange={(e) => setEditingStatus({ ...editingStatus, requiresApprovalToExit: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{t('orderSettings.k_66')}</p>
                    <p className="text-muted-foreground">{t('orderSettings.k_67')}</p>
                  </div>
                </label>
              </div>

              {saveError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {saveError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition"
                >
                  {t('orderSettings.k_149')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingStatus(null); setSaveError(null); }}
                  className="px-4 py-2 border border-border/70 rounded-lg text-xs hover:bg-muted/40 transition"
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-destructive">{t('orderSettings.k_69')}</h3>
            <p className="text-xs text-foreground">
              {t('orderSettings.k_150')} <strong className="font-bold">"{deleteTarget.name}"</strong>{t('orderSettings.k_151')}
            </p>
            {deleteError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-semibold hover:bg-destructive/90 transition"
              >
                {t('orderSettings.k_69')}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="px-4 py-2 border border-border/70 rounded-lg text-xs hover:bg-muted/40 transition"
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
