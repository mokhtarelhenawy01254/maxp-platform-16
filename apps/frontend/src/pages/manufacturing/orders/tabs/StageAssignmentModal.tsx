import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle, RotateCw } from 'lucide-react';
import {
  ProductionStage,
  PartnerFactory,
  manufacturingApi,
} from '../../manufacturingApi';

interface StageAssignmentModalProps {
  orderId: string;
  stage: ProductionStage;
  onClose: () => void;
  onSuccess: () => void;
}

export const StageAssignmentModal: React.FC<StageAssignmentModalProps> = ({
  orderId,
  stage,
  onClose,
  onSuccess,
}) => {
  const [executionEntity, setExecutionEntity] = useState<'INTERNAL' | 'EXTERNAL'>(
    stage.executionEntity || 'INTERNAL'
  );
  const [partnerFactoryId, setPartnerFactoryId] = useState<string>(
    stage.partnerFactoryId || ''
  );
  const [factories, setFactories] = useState<PartnerFactory[]>([]);
  const [loadingFactories, setLoadingFactories] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadFactories = async () => {
      try {
        setLoadingFactories(true);
        const data = await manufacturingApi.listPartnerFactories({ isActive: true });
        if (mounted) setFactories(data);
      } catch (err: any) {
        if (mounted) setError('فشل تحميل قائمة المصانع الشركاء');
      } finally {
        if (mounted) setLoadingFactories(false);
      }
    };
    loadFactories();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (executionEntity === 'EXTERNAL' && !partnerFactoryId) {
      setError('يرجى اختيار المصنع الشريك لجهة التنفيذ الخارجي');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await manufacturingApi.assignStageExecution(orderId, stage.id, {
        executionEntity,
        partnerFactoryId: executionEntity === 'EXTERNAL' ? partnerFactoryId : null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحديث جهة التنفيذ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden text-foreground">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              تحديد جهة التنفيذ: {stage.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-foreground mb-1.5">
              جهة التشغيل والتنفيذ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecutionEntity('INTERNAL')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  executionEntity === 'INTERNAL'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                تنفيذ داخلي (صالتنا)
              </button>
              <button
                type="button"
                onClick={() => setExecutionEntity('EXTERNAL')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  executionEntity === 'EXTERNAL'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                تنفيذ خارجي (مصنع شريك)
              </button>
            </div>
          </div>

          {executionEntity === 'EXTERNAL' && (
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                المصنع الشريك / مقاول الباطن <span className="text-destructive">*</span>
              </label>
              {loadingFactories ? (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ تحميل المصانع...</span>
                </div>
              ) : factories.length === 0 ? (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  لا يوجد مصانع شركاء نشطة. يرجى إضافة وتفعيل مصنع شريك أولاً من تبويب «المصانع الشركاء».
                </div>
              ) : (
                <select
                  value={partnerFactoryId}
                  onChange={(e) => setPartnerFactoryId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- اختر المصنع الشريك --</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.specialty ? `(${f.specialty})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || (executionEntity === 'EXTERNAL' && !partnerFactoryId)}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/95 disabled:opacity-40 flex items-center gap-2"
            >
              {saving && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>تأكيد الإسناد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
