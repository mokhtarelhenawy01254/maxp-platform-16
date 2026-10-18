import React, { useState } from 'react';
import { Truck, CheckCircle2, PackageCheck, X, AlertCircle, RotateCw } from 'lucide-react';
import {
  ProductionStage,
  manufacturingApi,
} from '../../manufacturingApi';

interface StageEventModalProps {
  orderId: string;
  stage: ProductionStage;
  event: 'SENT' | 'ACK_RECEIPT' | 'COMPLETED';
  onClose: () => void;
  onSuccess: () => void;
}

export const StageEventModal: React.FC<StageEventModalProps> = ({
  orderId,
  stage,
  event,
  onClose,
  onSuccess,
}) => {
  const [at, setAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getEventMeta = () => {
    switch (event) {
      case 'SENT':
        return {
          title: 'تسجيل إرسال المرحلة للمصنع',
          subtitle: `إرسال قطع المرحلة إلى: ${stage.partnerFactory?.name || 'المصنع الشريك'}`,
          icon: Truck,
          placeholder: 'مثال: تم تسليم 500 قطعة لمندوب الورشة مع بوليصة استلام رقم 102...',
          btnText: 'تأكيد الإرسال',
        };
      case 'ACK_RECEIPT':
        return {
          title: 'تأكيد استلام المصنع للمرحلة',
          subtitle: `تأكيد وصول وفحص الشحنة لدى: ${stage.partnerFactory?.name || 'المصنع الشريك'}`,
          icon: CheckCircle2,
          placeholder: 'مثال: أكد المصنع استلام الشحنة كاملة ومطابقة للمواصفات...',
          btnText: 'تأكيد الاستلام',
        };
      case 'COMPLETED':
        return {
          title: 'تأكيد إتمام واستلام المرحلة',
          subtitle: `استلام القطع التامة وفحص الجودة من: ${stage.partnerFactory?.name || 'المصنع الشريك'}`,
          icon: PackageCheck,
          placeholder: 'مثال: تم فحص العينات واستلام الشحنة وإغلاق المرحلة بنجاح...',
          btnText: 'تأكيد إتمام المرحلة',
        };
    }
  };

  const meta = getEventMeta();
  const Icon = meta.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await manufacturingApi.recordStageFactoryEvent(orderId, stage.id, {
        event,
        at: at ? new Date(at).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تسجيل الحدث للمرحلة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden text-foreground">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">{meta.title}</h3>
              <p className="text-[11px] text-muted-foreground">{meta.subtitle}</p>
            </div>
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
            <label className="block font-semibold text-foreground mb-1">
              تاريخ وتوقيت الحدث
            </label>
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              ملاحظات وبيانات الشحنة (اختياري)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20"
            />
          </div>

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
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/95 disabled:opacity-40 flex items-center gap-2"
            >
              {saving && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{meta.btnText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
