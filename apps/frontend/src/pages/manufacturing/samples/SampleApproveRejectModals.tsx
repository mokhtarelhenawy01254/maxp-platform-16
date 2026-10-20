import React, { useState } from 'react';

interface ApproveModalProps {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

export const SampleApproveModal: React.FC<ApproveModalProps> = ({ isOpen, loading, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-3 shadow-xl animate-in zoom-in-95">
        <h3 className="text-sm font-bold text-foreground">اعتماد العينة</h3>
        <p className="text-xs text-muted-foreground">
          تأكيد مطابقة العينة للمواصفات الفنية لتكون جاهزة للتحويل لأمر تشغيل كامل.
        </p>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات الاعتماد (اختياري)..."
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none resize-none focus:ring-1 focus:ring-emerald-500"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'جاري الاعتماد...' : 'تأكيد الاعتماد'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RejectModalProps {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const SampleRejectModal: React.FC<RejectModalProps> = ({ isOpen, loading, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('سبب الرفض إلزامي لرفض العينة');
      return;
    }
    setError(null);
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-3 shadow-xl animate-in zoom-in-95">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">رفض العينة</h3>
        <p className="text-xs text-muted-foreground">
          يرجى تسجيل سبب الرفض بوضوح (إلزامي للتوثيق وتعديل الباترون/الخامة).
        </p>
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
        <textarea
          rows={3}
          required
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder="اكتب سبب الرفض هنا بالتفصيل..."
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none resize-none focus:ring-1 focus:ring-rose-500"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? 'جاري الرفض...' : 'تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
};
