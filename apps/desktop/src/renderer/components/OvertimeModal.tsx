import React, { useState } from 'react';
import { X, Zap, AlertCircle, Play } from 'lucide-react';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: string; taskSummary?: string }) => Promise<void>;
  deviceType?: 'OFFICE' | 'PERSONAL';
}

export const OvertimeModal: React.FC<OvertimeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deviceType = 'PERSONAL',
}) => {
  const [reason, setReason] = useState('');
  const [taskSummary, setTaskSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب أو مهمة العمل الإضافي');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm({ reason: reason.trim(), taskSummary: taskSummary.trim() || undefined });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل بدء الوردية الإضافية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrap}>
              <Zap size={18} color="var(--accent-orange)" />
            </div>
            <div>
              <h2 style={styles.title}>بدء وردية إضافية (Overtime)</h2>
              <p style={styles.subtitle}>
                {deviceType === 'PERSONAL'
                  ? 'العمل خارج المقر من جهازك الشخصي مع توثيق الساعات بشكل مستقل'
                  : 'العمل ساعات إضافية بعد انتهاء الشيفت الأساسي'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            disabled={loading}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={14} color="var(--accent-red)" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              <span>سبب العمل الإضافي / المهمة المطلوبة *</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: متابعة شحنات عاجلة، دعم عميل متعثر..."
              style={styles.input}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              <span>تفاصيل إضافية أو روابط التذاكر (اختياري)</span>
            </label>
            <textarea
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="أي ملاحظات تخص ما ستقوم بإنجازه خلال هذه الوردية..."
              rows={2}
              style={styles.textarea}
              disabled={loading}
            />
          </div>

          <div style={styles.infoBox}>
            <p style={styles.infoTitle}>📌 كيف تُحسب ساعات الوردية الإضافية؟</p>
            <p style={styles.infoDesc}>
              يتم حفظ وقت البداية والنهاية في سجل مستقل (Overtime Log) ولا يُخلط مع ساعات الدوام المكتبي
              الأساسية. ستظهر الساعات للمدير للمراجعة والاعتماد في مسير الرواتب.
            </p>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              <Play size={15} />
              <span>{loading ? 'جاري البدء...' : 'بدء الوردية الإضافية الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
    direction: 'rtl',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    border: '1px solid rgba(249, 115, 22, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: '#f4f4f5',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 20px 0',
    padding: '8px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    color: 'var(--accent-red)',
    fontSize: 12,
  },
  form: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#d4d4d8',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  infoBox: {
    fontSize: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: '10px 12px',
  },
  infoTitle: {
    margin: '0 0 4px',
    fontWeight: 600,
    color: '#60a5fa',
  },
  infoDesc: {
    margin: 0,
    color: '#93c5fd',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    backgroundColor: 'var(--accent-orange)',
    border: 'none',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
  },
};

export default OvertimeModal;
