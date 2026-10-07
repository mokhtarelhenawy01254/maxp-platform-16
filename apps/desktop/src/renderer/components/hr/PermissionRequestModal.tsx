import React, { useState } from 'react';
import { X, Clock, Calendar, FileText, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  remainingMinutes?: number;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  remainingMinutes = 120,
}) => {
  const [type, setType] = useState('PERSONAL_DURING_DAY');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب الإذن بوضوح.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await window.electronAPI.createPermissionRequest({
        type,
        date,
        durationMinutes,
        reason: reason.trim(),
      });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(res?.error || 'تعذر تقديم طلب الإذن، يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع أثناء إرسال الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.iconWrapper}>
              <Clock size={16} color="var(--accent-blue)" />
            </div>
            <div>
              <h3 style={styles.title}>طلب إذن عمل جديد</h3>
              <p style={styles.subtitle}>
                الرصيد المتبقي لك هذا الشهر:{' '}
                <strong style={{ color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>
                  {remainingMinutes} دقيقة
                </strong>{' '}
                ({(remainingMinutes / 60).toFixed(1)} ساعة)
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={14} color="var(--accent-red)" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <CheckCircle2 size={14} color="var(--accent-green)" />
              <span>تم إرسال طلب الإذن بنجاح! بانتظار اعتماد الإدارة.</span>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>نوع الإذن المطلوب</label>
            <select
              style={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
            >
              <option value="PERSONAL_DURING_DAY">إذن شخصي أثناء الوردية (خروج وعودة)</option>
              <option value="LATE_ARRIVAL">تأخير صباحي عن موعد الحضور</option>
              <option value="EARLY_LEAVE">انصراف مبكر قبل نهاية الوردية</option>
            </select>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>التاريخ</label>
              <input
                type="date"
                style={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>المدة المطلوبة</label>
              <select
                style={styles.select}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                disabled={submitting}
              >
                <option value={30}>30 دقيقة (نصف ساعة)</option>
                <option value={60}>60 دقيقة (ساعة كاملة)</option>
                <option value={90}>90 دقيقة (ساعة ونصف)</option>
                <option value={120}>120 دقيقة (ساعتان - الحد الأقصى)</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>سبب الإذن والملاحظات</label>
            <textarea
              style={styles.textarea}
              placeholder="اكتب سبب طلب الإذن بوضوح للإدارة..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Footer Controls */}
          <div style={styles.footer}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={submitting || success}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Send size={13} />
              <span>{submitting ? 'جاري الإرسال…' : 'إرسال الطلب للاعتماد'}</span>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '92%',
    maxWidth: 460,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    animation: 'fadeIn 160ms ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    color: 'var(--accent-red)',
    fontSize: 12,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 6,
    color: 'var(--accent-green)',
    fontSize: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  select: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
  },
  input: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  textarea: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'var(--accent-blue)',
    border: 'none',
    color: '#fff',
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'transform 160ms ease-out',
  },
};

export default PermissionRequestModal;
