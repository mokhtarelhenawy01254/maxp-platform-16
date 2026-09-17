import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface CompanyUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  task: any;
  onClose: () => void;
  onUpdated: () => void;
  users: CompanyUser[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdated,
  users,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo || '');
    setPriority((task.priority || 'MEDIUM').toUpperCase());

    // Format dueDate for datetime-local
    if (task.dueDate) {
      try {
        const d = new Date(task.dueDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDueDate(formatted);
      } catch {
        setDueDate('');
      }
    } else {
      setDueDate('');
    }

    const est = task.estimatedMinutes || (task.estimatedHours ? task.estimatedHours * 60 : 60);
    setEstimatedMinutes(est);
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان المهمة');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await window.electronAPI.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || title.trim(),
        priority,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimatedMinutes: Number(estimatedMinutes) || 60,
      });

      if (!res.success) {
        throw new Error(res.error || 'فشل تحديث المهمة في السيرفر');
      }

      if (priority === 'URGENT') {
        audioAlerts.playUrgentAlert();
      } else {
        audioAlerts.playTaskStart();
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث بيانات المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={18} color="#38bdf8" />
            <span style={modalStyles.title}>تعديل بيانات المهمة</span>
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        {error && <div style={modalStyles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          {/* Title */}
          <div>
            <label style={modalStyles.label}>عنوان المهمة *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان المهمة…"
              style={modalStyles.input}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={modalStyles.label}>الوصف والتفاصيل</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تعليمات أو تفاصيل توضيحية للمهمة…"
              rows={3}
              style={{ ...modalStyles.input, resize: 'vertical' }}
            />
          </div>

          {/* Assignee & Priority */}
          <div style={modalStyles.row2}>
            <div>
              <label style={modalStyles.label}>المسؤول عن التنفيذ</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={modalStyles.select}
              >
                <option value="">تكليف نفسي (المستخدم الحالي)</option>
                {users.map((u) => {
                  const label =
                    u.name ||
                    `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
                    u.email ||
                    u.id;
                  return (
                    <option key={u.id} value={u.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={modalStyles.label}>مستوى الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={modalStyles.select}
              >
                <option value="URGENT">🚨 عاجل وفوري (Urgent)</option>
                <option value="HIGH">مرتفع (High)</option>
                <option value="MEDIUM">عادي (Medium)</option>
                <option value="LOW">منخفض (Low)</option>
              </select>
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <label style={modalStyles.label}>وقت الإنجاز المقدر للمهمة (بالدقائق)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEstimatedMinutes(m)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border:
                      estimatedMinutes === m
                        ? '1px solid #38bdf8'
                        : '1px solid rgba(255,255,255,0.1)',
                    background:
                      estimatedMinutes === m ? 'rgba(56, 189, 248, 0.15)' : '#18181b',
                    color: estimatedMinutes === m ? '#38bdf8' : '#a1a1aa',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m} دقيقة
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="مخصص"
                  style={{ ...modalStyles.input, width: 85, padding: '5px 8px', fontSize: 12, textAlign: 'center' }}
                />
                <span style={{ fontSize: 11, color: '#71717a' }}>دقيقة</span>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label style={modalStyles.label}>تاريخ ووقت الاستحقاق</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={modalStyles.input}
            />
          </div>

          {/* Footer Buttons */}
          <div style={modalStyles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={modalStyles.cancelBtn}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={modalStyles.submitBtn}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>جاري الحفظ…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    background: '#121214',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: '#18181b',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fafafa',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    background: '#09090b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    background: '#09090b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.12)',
    borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    fontSize: 12,
    padding: '8px 18px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#a1a1aa',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#0284c7',
    border: 'none',
    color: '#fff',
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};
