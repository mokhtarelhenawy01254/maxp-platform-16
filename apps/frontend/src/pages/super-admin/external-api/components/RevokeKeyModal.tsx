import React, { useState } from 'react';
import { ExternalApiCredential } from '../types';
import { ShieldAlert, X } from 'lucide-react';

interface Props {
  credential: ExternalApiCredential | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (credentialId: string, reason: string) => Promise<void>;
  submitting: boolean;
}

export const RevokeKeyModal: React.FC<Props> = ({
  credential,
  isOpen,
  onClose,
  onConfirm,
  submitting
}) => {
  const [reason, setReason] = useState('إلغاء فوري من لوحة السوبر أدمن');

  if (!isOpen || !credential) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(credential.id, reason.trim() || 'إلغاء فوري من لوحة السوبر أدمن');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-card p-6 shadow-2xl space-y-5 text-right">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
            <h2 className="text-base font-bold">تأكيد إلغاء المفتاح فورًا</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          هل أنت متأكد من رغبتك في إلغاء المفتاح <span className="font-bold text-foreground">«{credential.name}»</span> ({credential.keyPrefixMasked})؟
          سيتم رفض جميع الطلبات القادمة باستخدامه بكود <code className="font-mono text-rose-500 font-bold">401 Unauthorized</code> على الفور بدون أي تأخير.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">سبب الإلغاء</label>
            <input
              type="text"
              required
              placeholder="مثال: انتهاء مشروع الحملة / اشتباه تسريب..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'جاري الإلغاء...' : 'تأكيد الإلغاء الفوري'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
