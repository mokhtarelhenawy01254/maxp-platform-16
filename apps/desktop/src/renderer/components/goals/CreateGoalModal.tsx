import React, { useState } from 'react';
import { X, Target, Plus, Check } from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: () => void;
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<number>(5);
  const [unit, setUnit] = useState('مهام');
  const [goalType, setGoalType] = useState('DAILY');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان الهدف');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await window.electronAPI.createGoal({
        title: title.trim(),
        description: description.trim(),
        target: Number(target) || 1,
        unit: unit.trim() || 'مهام',
        goalType,
        priority,
      });

      if (res?.success || res?.id) {
        audioAlerts.playTaskComplete();
        onGoalCreated();
        onClose();
        setTitle('');
        setDescription('');
      } else {
        setError(res?.error || 'فشل في حفظ الهدف');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الهدف');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color="var(--accent-blue)" />
            <span style={styles.title}>إضافة هدف أو مؤشر أداء جديد</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>عنوان الهدف *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: إنجاز 6 مهام تطوير، مراجعة 3 حملات إعلانية…"
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>الوصف أو الملاحظات (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية للهدف…"
              rows={2}
              style={{ ...styles.input, resize: 'none' }}
            />
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>الرقم المستهدف</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>وحدة القياس</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={styles.select}
              >
                <option value="مهام">مهام</option>
                <option value="ساعات">ساعات</option>
                <option value="مشاريع">مشاريع</option>
                <option value="نقاط">نقاط</option>
                <option value="%">% نسبة مئوية</option>
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>نطاق الهدف</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                style={styles.select}
              >
                <option value="DAILY">هدف يومي (اليوم)</option>
                <option value="WEEKLY">هدف أسبوعي</option>
                <option value="MONTHLY">هدف شهري</option>
                <option value="STRATEGIC">هدف استراتيجي</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={styles.select}
              >
                <option value="URGENT">عاجل</option>
                <option value="HIGH">مرتفع</option>
                <option value="MEDIUM">متوسط</option>
                <option value="LOW">منخفض</option>
              </select>
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={styles.submitBtn}
            >
              <Plus size={13} />
              <span>{submitting ? 'جاري الحفظ…' : 'حفظ الهدف'}</span>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    width: 440,
    maxWidth: '90vw',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 3,
  },
  form: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  row: {
    display: 'flex',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
  },
  select: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: 12,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default CreateGoalModal;
