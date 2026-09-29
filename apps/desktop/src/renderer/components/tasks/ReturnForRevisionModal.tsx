import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Loader2,
  User,
  Sparkles,
  Send,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface ReturnForRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  task: any;
}

const PRESET_REASONS = [
  'تعديل في التصميم والألوان',
  'استكمال بيانات أو حقول ناقصة',
  'تصحيح أرقام وحسابات غير مطابقة',
  'إعادة الصياغة اللغوية والتدقيق',
  'فحص المرفقات والروابط المفقودة',
];

export const ReturnForRevisionModal: React.FC<ReturnForRevisionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  task,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !task) return null;

  const assigneeName =
    task.assignedToName ||
    task.assignee?.name ||
    `${task.assignee?.firstName || ''} ${task.assignee?.lastName || ''}`.trim() ||
    task.assignee?.email ||
    'الموظف المكلف';

  const handleAddPreset = (preset: string) => {
    setReason((prev) => {
      if (!prev.trim()) return preset;
      if (prev.includes(preset)) return prev;
      return `${prev} — ${preset}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب الإرجاع أو الملاحظات المطلوبة ليتمكن الموظف من تصحيحها');
      return;
    }

    setLoading(true);
    setError('');
    try {
      audioAlerts.playTaskReopen();
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل في إعادة المهمة للتعديل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <div style={styles.iconWrap}>
              <RotateCcw size={15} color="var(--accent-yellow)" />
            </div>
            <div>
              <div style={styles.title}>طلب تعديلات وإعادة المهمة</div>
              <div style={styles.subtitle}>
                سيتم إرجاع المهمة لحالة العمل وتنبيه الموظف بملاحظاتك
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} title="إلغاء">
            <X size={14} color="var(--text-muted)" />
          </button>
        </div>

        {/* Task Info Context Strip */}
        <div style={styles.taskContextBox}>
          <div style={styles.taskTitleRow}>
            <span style={styles.contextLabel}>المهمة:</span>
            <span style={styles.contextTitle} title={task.title}>{task.title}</span>
          </div>
          <div style={styles.assigneeRow}>
            <User size={11} color="var(--accent-blue)" />
            <span style={styles.assigneeLabel}>المكلف بالتنفيذ:</span>
            <span style={styles.assigneeName}>{assigneeName}</span>
          </div>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span>ملاحظات التعديل والتوجيهات المطلوبة</span>
              <span style={styles.requiredStar}>*</span>
            </label>

            {/* Quick preset chips */}
            <div style={styles.presetsRow}>
              <span style={styles.presetsHint}>نماذج سريعة:</span>
              {PRESET_REASONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAddPreset(p)}
                  style={styles.presetChip}
                >
                  + {p}
                </button>
              ))}
            </div>

            <textarea
              style={styles.textarea}
              placeholder="اكتب التوجيهات والتعديلات بالتفصيل ليتمكن الموظف من مراجعتها فوراً (مثال: يرجى ضبط أبعاد التصميم لتناسب مقاس 1080x1350 وتحديث التاريخ)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={4}
              autoFocus
            />
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={styles.cancelBtn}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              style={styles.submitBtn}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>جاري الإرجاع…</span>
                </>
              ) : (
                <>
                  <RotateCcw size={13} />
                  <span>إعادة للتعديل وتنبيه الموظف</span>
                </>
              )}
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
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 13.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContextBox: {
    margin: '12px 18px 0',
    padding: '9px 12px',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  taskTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  contextLabel: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  contextTitle: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  assigneeLabel: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
  assigneeName: {
    fontSize: 11,
    color: 'var(--accent-blue)',
    fontWeight: 600,
  },
  errorAlert: {
    margin: '10px 18px 0',
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: 11.5,
  },
  form: {
    padding: '14px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  requiredStar: {
    color: 'var(--accent-red)',
  },
  presetsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  presetsHint: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginLeft: 2,
  },
  presetChip: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#fbbf24',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  textarea: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: 90,
    lineHeight: 1.5,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    padding: '7px 14px',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '7px 16px',
    borderRadius: 6,
    backgroundColor: 'var(--accent-yellow)',
    border: 'none',
    color: '#000000',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
    transition: 'transform 160ms ease-out',
  },
};
