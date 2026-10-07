import React, { useState } from 'react';
import { X, Banknote, Calendar, FileText, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdvanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  baseSalary?: number;
}

export const AdvanceRequestModal: React.FC<AdvanceRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  baseSalary = 5000,
}) => {
  const maxAdvance = Math.round(baseSalary * 0.5);
  const [amount, setAmount] = useState<number>(Math.min(1000, maxAdvance));
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('يرجى إدخال مبلغ سلفة صحيح.');
      return;
    }
    if (!reason.trim()) {
      setError('يرجى توضيح سبب طلب السلفة.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await window.electronAPI.createAdvanceRequest({
        amount: Number(amount),
        reason: reason.trim(),
        repaymentType: installmentsCount > 1 ? 'INSTALLMENTS' : 'SALARY_DEDUCTION',
        installmentsCount: Number(installmentsCount),
      });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(res?.error || 'تعذر تقديم طلب السلفة، يرجى مراجعة إدارة الموارد البشرية.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع أثناء إرسال طلب السلفة.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthlyDeduction = installmentsCount > 0 ? Math.round(amount / installmentsCount) : amount;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.iconWrapper}>
              <Banknote size={16} color="var(--accent-green)" />
            </div>
            <div>
              <h3 style={styles.title}>طلب سلفة على الراتب</h3>
              <p style={styles.subtitle}>
                الحد الأقصى المتاح لك تقديرياً:{' '}
                <strong style={{ color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>
                  {maxAdvance.toLocaleString('ar-EG')} ج.م
                </strong>
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={styles.body}>
          {error && (
            <div style={styles.alertError}>
              <AlertCircle size={14} style={{ shrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={styles.alertSuccess}>
              <CheckCircle2 size={14} style={{ shrink: 0 }} />
              <span>تم إرسال طلب السلفة بنجاح إلى الإدارة المالية والـ HR!</span>
            </div>
          )}

          {/* Amount input */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Banknote size={13} color="var(--text-muted)" />
              <span>مبلغ السلفة المطلوب (ج.م)</span>
            </label>
            <input
              type="number"
              min={100}
              max={maxAdvance * 2}
              step={100}
              style={styles.input}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>

          {/* Installments selector */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Calendar size={13} color="var(--text-muted)" />
              <span>خطة السداد والتقسيط</span>
            </label>
            <select
              style={styles.select}
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(Number(e.target.value))}
            >
              <option value={1}>خصم كامل من راتب الشهر الجاري ({amount.toLocaleString('ar-EG')} ج.م)</option>
              <option value={2}>على شهرين ({monthlyDeduction.toLocaleString('ar-EG')} ج.م / شهر)</option>
              <option value={3}>على 3 أشهر ({monthlyDeduction.toLocaleString('ar-EG')} ج.م / شهر)</option>
              <option value={4}>على 4 أشهر ({monthlyDeduction.toLocaleString('ar-EG')} ج.م / شهر)</option>
            </select>
          </div>

          {/* Reason */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FileText size={13} color="var(--text-muted)" />
              <span>سبب طلب السلفة</span>
            </label>
            <textarea
              style={styles.textarea}
              placeholder="اكتب بإيجاز سبب السلفة أو الظرف الطارئ..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Summary Box */}
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span style={{ color: 'var(--text-muted)' }}>القسط الشهري المستقطع:</span>
              <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {monthlyDeduction.toLocaleString('ar-EG')} ج.م
              </strong>
            </div>
            <div style={styles.summaryRow}>
              <span style={{ color: 'var(--text-muted)' }}>مدة السداد:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {installmentsCount === 1 ? 'دفعة واحدة مع أقرب مسير' : `${installmentsCount} أشهر متتالية`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
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
              disabled={submitting}
            >
              <Send size={13} />
              <span>{submitting ? 'جاري الإرسال…' : 'تأكيد إرسال الطلب'}</span>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    background: 'var(--bg-card, #121214)',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
    borderRadius: 14,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
    background: 'var(--bg-card-header, rgba(255, 255, 255, 0.02))',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary, #fff)',
    margin: 0,
  },
  subtitle: {
    fontSize: 11,
    color: 'var(--text-muted, #888)',
    margin: '2px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted, #888)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#ef4444',
    fontSize: 12,
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#10b981',
    fontSize: 12,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary, #ccc)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text-primary, #fff)',
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: 'var(--bg-input, #18181b)',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text-primary, #fff)',
    fontSize: 12,
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text-primary, #fff)',
    fontSize: 12,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  summaryBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed var(--border-subtle, rgba(255, 255, 255, 0.12))',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 11,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
    borderRadius: 8,
    padding: '8px 16px',
    color: 'var(--text-muted, #888)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'var(--accent-green, #10b981)',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '8px 18px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};

export default AdvanceRequestModal;
