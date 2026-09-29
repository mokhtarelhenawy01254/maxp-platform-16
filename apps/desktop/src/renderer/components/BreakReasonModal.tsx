import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Utensils,
  PhoneCall,
  Sparkles,
  Plus,
  Trash2,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface BreakReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, durationMinutes: number) => void;
  breakBalanceMinutes?: number;
}

const DEFAULT_REASONS = [
  { id: 'prayer', label: 'صلاة', icon: Sparkles, defaultMinutes: 15 },
  { id: 'meal', label: 'أكل / غداء', icon: Utensils, defaultMinutes: 30 },
  { id: 'tea', label: 'شاي / قهوة', icon: Coffee, defaultMinutes: 10 },
  { id: 'call', label: 'مكالمة هاتفية', icon: PhoneCall, defaultMinutes: 15 },
];

export const BreakReasonModal: React.FC<BreakReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  breakBalanceMinutes = 45,
}) => {
  const [selectedReason, setSelectedReason] = useState('صلاة');
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [customReasons, setCustomReasons] = useState<string[]>([]);
  const [newReasonInput, setNewReasonInput] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Load custom reasons from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('maxp_custom_break_reasons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomReasons(parsed);
        }
      }
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleAddCustomReason = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReasonInput.trim();
    if (!trimmed) return;

    if (
      !DEFAULT_REASONS.some((r) => r.label === trimmed) &&
      !customReasons.includes(trimmed)
    ) {
      const updated = [...customReasons, trimmed];
      setCustomReasons(updated);
      try {
        localStorage.setItem('maxp_custom_break_reasons', JSON.stringify(updated));
      } catch {}
    }

    setSelectedReason(trimmed);
    setNewReasonInput('');
    setShowAddCustom(false);
  };

  const handleDeleteCustomReason = (reasonToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customReasons.filter((r) => r !== reasonToDelete);
    setCustomReasons(updated);
    try {
      localStorage.setItem('maxp_custom_break_reasons', JSON.stringify(updated));
    } catch {}
    if (selectedReason === reasonToDelete) {
      setSelectedReason('صلاة');
    }
  };

  const handleStart = () => {
    onConfirm(selectedReason, selectedDuration);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={styles.headerIcon}>
              <Coffee size={18} color="var(--accent-blue)" />
            </div>
            <div>
              <h3 style={styles.title}>تحديد نوع ومدة الاستراحة</h3>
              <p style={styles.subtitle}>
                الرصيد الرسمي المتبقي اليوم: {breakBalanceMinutes} دقيقة
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Reasons Grid */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>اختر نوع الاستراحة:</div>
          <div style={styles.reasonsGrid}>
            {DEFAULT_REASONS.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedReason === r.label;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedReason(r.label);
                    setSelectedDuration(r.defaultMinutes);
                  }}
                  style={{
                    ...styles.reasonCard,
                    borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-default)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#16161b',
                  }}
                >
                  <Icon size={18} color={isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                  <span
                    style={{
                      ...styles.reasonLabel,
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {r.label}
                  </span>
                </button>
              );
            })}

            {/* Custom Saved Reasons */}
            {customReasons.map((custom, idx) => {
              const isSelected = selectedReason === custom;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedReason(custom)}
                  style={{
                    ...styles.reasonCard,
                    borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-default)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#16161b',
                    position: 'relative',
                  }}
                >
                  <Sparkles size={16} color={isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                  <span
                    style={{
                      ...styles.reasonLabel,
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {custom}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustomReason(custom, e)}
                    style={styles.deleteCustomBtn}
                    title="حذف هذا السبب"
                  >
                    <Trash2 size={12} color="var(--accent-red)" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Custom Reason Inline */}
          {showAddCustom ? (
            <form onSubmit={handleAddCustomReason} style={styles.addForm}>
              <input
                type="text"
                value={newReasonInput}
                onChange={(e) => setNewReasonInput(e.target.value)}
                placeholder="أدخل نوع الاستراحة المخصص (مثال: اجتماع خارجي)..."
                autoFocus
                style={styles.input}
              />
              <button type="submit" style={styles.saveCustomBtn}>
                تثبيت في القائمة
              </button>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                style={styles.cancelCustomBtn}
              >
                إلغاء
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              style={styles.addCustomTrigger}
            >
              <Plus size={13} />
              <span>إضافة سبب استراحة مخصص وتثبيته في قائمتك</span>
            </button>
          )}
        </div>

        {/* Expected Duration Picker */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>المدة المتوقعة (دقائق):</div>
          <div style={styles.durationsRow}>
            {[10, 15, 20, 30, 45].map((mins) => {
              const isSelected = selectedDuration === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSelectedDuration(mins)}
                  style={{
                    ...styles.durationBtn,
                    borderColor: isSelected ? 'var(--accent-green)' : 'var(--border-default)',
                    background: isSelected ? 'var(--accent-green-bg)' : '#16161b',
                    color: isSelected ? 'var(--accent-green)' : 'var(--text-muted)',
                  }}
                >
                  <Clock size={12} />
                  <span>{mins} دقيقة</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            إلغاء
          </button>
          <button type="button" onClick={handleStart} style={styles.confirmBtn}>
            <CheckCircle2 size={16} />
            <span>بدء استراحة «{selectedReason}» الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid var(--border-subtle)',
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 11,
    color: 'var(--text-dim)',
    margin: '2px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  reasonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  reasonCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    cursor: 'pointer',
    textAlign: 'right',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  reasonLabel: {
    fontSize: 12,
    flex: 1,
  },
  deleteCustomBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  addCustomTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1px dashed var(--border-strong)',
    borderRadius: 6,
    color: 'var(--accent-blue)',
    padding: '7px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 2,
  },
  addForm: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  input: {
    flex: 1,
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '6px 10px',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontFamily: 'inherit',
    outline: 'none',
  },
  saveCustomBtn: {
    background: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  cancelCustomBtn: {
    background: 'var(--bg-hover)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  durationsRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  durationBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-default)',
    fontSize: 11,
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 140ms ease-out',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTop: '1px solid var(--border-subtle)',
  },
  cancelBtn: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
};

export default BreakReasonModal;
