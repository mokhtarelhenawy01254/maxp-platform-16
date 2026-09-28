import React, { useState } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { handoverNotes: string; pendingTasks: string }) => Promise<void>;
  workingSeconds: number;
  clockInTime?: string | null;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  workingSeconds,
  clockInTime,
}) => {
  const [handoverNotes, setHandoverNotes] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hours = Math.floor(workingSeconds / 3600);
  const minutes = Math.floor((workingSeconds % 3600) / 60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ handoverNotes, pendingTasks });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل إغلاق الشيفت');
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
              <Clock size={18} color="#10b981" />
            </div>
            <div>
              <h2 style={styles.title}>قفل الشيفت وتسليم الوردية</h2>
              <p style={styles.subtitle}>توثيق انتهاء دوام اليوم وتسليم المهام للوردية القادمة</p>
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

        {/* Shift Telemetry Summary */}
        <div style={styles.summaryBar}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>إجمالي وقت العمل اليوم</span>
            <span style={styles.statValue}>
              {hours} ساعة و {minutes} دقيقة
            </span>
          </div>
          {clockInTime && (
            <div style={styles.statBox}>
              <span style={styles.statLabel}>وقت تسجيل الحضور</span>
              <span style={styles.statValue}>
                {new Date(clockInTime).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={14} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              <FileText size={14} color="var(--text-secondary)" />
              <span>ملاحظات تسليم الوردية (Handover Notes)</span>
            </label>
            <textarea
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="مثال: تم إنجاز أوردرات الصباح، يرجى متابعة شحنة العميل فلان في الوردية المسائية..."
              rows={3}
              style={styles.textarea}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              <span>مهام معلقة تستوجب المتابعة (اختياري)</span>
            </label>
            <input
              type="text"
              value={pendingTasks}
              onChange={(e) => setPendingTasks(e.target.value)}
              placeholder="أرقام تذاكر أو شحنات معلقة..."
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.warningNote}>
            <span>⚠️ سيتم تسجيل انصرافك وتجميد عداد الساعات المكتبي فور التأكيد لمنع احتساب ساعات إضافية غير مصرح بها.</span>
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
              <CheckCircle2 size={16} />
              <span>{loading ? 'جاري القفل...' : 'تأكيد قفل الشيفت والانصراف'}</span>
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
    maxWidth: 520,
    backgroundColor: '#121214',
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
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
    color: '#a1a1aa',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
  },
  summaryBar: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    padding: '12px 20px',
    backgroundColor: '#0c0c0e',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#71717a',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e4e4e7',
    fontVariantNumeric: 'tabular-nums',
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
    color: '#ef4444',
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
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#09090b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#fafafa',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: '#09090b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#fafafa',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  warningNote: {
    fontSize: 11,
    color: '#f59e0b',
    lineHeight: 1.5,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid rgba(245, 158, 11, 0.2)',
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
    color: '#a1a1aa',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  },
};

export default ShiftHandoverModal;
