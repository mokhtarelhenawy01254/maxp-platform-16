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
  Camera,
  Paperclip,
  Image as ImageIcon,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface CompanyUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AttachmentDraft {
  base64Data: string;
  fileName: string;
  mimeType: string;
  previewUrl: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  task: any;
  onClose: () => void;
  onUpdated: () => void;
  users: CompanyUser[];
  serverUrl?: string;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdated,
  users,
  serverUrl = 'https://maxp.online',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [watchers, setWatchers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [newAttachments, setNewAttachments] = useState<AttachmentDraft[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssignedTo(String(
      task.assignedTo ||
      task.assignedToId ||
      (typeof task.assignee === 'object' ? task.assignee?.id : '') ||
      ''
    ));
    setPriority((task.priority || 'MEDIUM').toUpperCase());
    setExistingAttachments(task.taskAttachments || task.attachments || []);
    setNewAttachments([]);

    const initialWatchers = (task.taskWatchers || task.watchers || [])
      .map((w: any) => w.userId || w.id || w.user?.id)
      .filter(Boolean);
    setWatchers(initialWatchers);

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

    const est = task.estimatedMinutes
      ? Number(task.estimatedMinutes)
      : task.estimatedHours
      ? Number(task.estimatedHours) * 60
      : 0;
    setEstimatedMinutes(est || 60);
  }, [task]);

  if (!isOpen || !task) return null;

  const resolveAttachmentUrl = (rawPath: string) => {
    if (!rawPath) return '';
    if (rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
      return rawPath;
    }
    const cleanRaw = rawPath.trim();
    if (cleanRaw.startsWith('http://') || cleanRaw.startsWith('https://')) {
      return cleanRaw;
    }
    let base = (serverUrl || 'https://maxp.online').trim().replace(/\/$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    let normalized = cleanRaw.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (!normalized.startsWith('/uploads/')) {
      if (normalized.startsWith('/tasks/')) {
        normalized = `/uploads${normalized}`;
      } else {
        normalized = `/uploads/tasks${normalized}`;
      }
    }
    try {
      normalized = encodeURI(decodeURI(normalized));
    } catch {
      normalized = encodeURI(normalized);
    }
    return `${base}${normalized}`;
  };

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    setError(null);
    try {
      const res = await window.electronAPI.captureDesktopSnippet();
      if (res.success && res.dataUrl) {
        const newAtt: AttachmentDraft = {
          base64Data: res.dataUrl,
          fileName: `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
          mimeType: 'image/png',
          previewUrl: res.dataUrl,
        };
        setNewAttachments((prev) => [...prev, newAtt]);
      } else {
        setError(res.error || 'فشل التقاط لقطة الشاشة');
      }
    } catch (err: any) {
      setError(err?.message || 'خطأ أثناء التقاط الشاشة');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setNewAttachments((prev) => [
          ...prev,
          {
            base64Data: result,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            previewUrl: file.type.startsWith('image/') ? result : '',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addWatcher = (userId: string) => {
    if (userId && !watchers.includes(userId)) {
      setWatchers((prev) => [...prev, userId]);
    }
  };

  const removeWatcher = (userId: string) => {
    setWatchers((prev) => prev.filter((id) => id !== userId));
  };

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
        watchers,
      });

      if (!res.success) {
        throw new Error(res.error || 'فشل تحديث المهمة في السيرفر');
      }

      // Upload new attachments if any
      for (const att of newAttachments) {
        try {
          await window.electronAPI.uploadTaskAttachment({
            taskId: task.id,
            base64Data: att.base64Data,
            originalName: att.fileName,
            mimeType: att.mimeType,
          });
        } catch (uploadErr) {
          console.warn('[EditTaskModal] Attachment upload skipped:', uploadErr);
        }
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
            <Edit3 size={18} color="var(--accent-blue)" />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={modalStyles.label}>الوصف والتفاصيل</label>
              {description && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(description);
                    setCopiedDesc(true);
                    setTimeout(() => setCopiedDesc(false), 2000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-card)',
                    color: copiedDesc ? 'var(--accent-green)' : 'var(--text-dim)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  title="نسخ الوصف إلى الحافظة بنقرة واحدة"
                >
                  {copiedDesc ? <Check size={11} color="var(--accent-green)" /> : <Copy size={11} />}
                  <span>{copiedDesc ? 'تم النسخ' : 'نسخ الوصف'}</span>
                </button>
              )}
            </div>
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

          {/* Watchers Section (المتابعون والمراقبون) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={modalStyles.label}>
                المتابعون والمراقبون ({watchers.length})
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                يتلقون إشعارات حية بكافة التحديثات
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addWatcher(e.target.value);
                  }
                }}
                style={modalStyles.select}
              >
                <option value="">+ إضافة زميل أو مدير كمتابع للمهمة…</option>
                {users
                  .filter((u) => u.id !== assignedTo && !watchers.includes(u.id))
                  .map((u) => {
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

            {/* Watchers Chips */}
            {watchers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {watchers.map((wId) => {
                  const u = users.find((x) => x.id === wId);
                  const label =
                    u?.name ||
                    `${u?.firstName || ''} ${u?.lastName || ''}`.trim() ||
                    u?.email ||
                    wId;
                  return (
                    <div
                      key={wId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.28)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11,
                        color: 'var(--accent-blue)',
                      }}
                    >
                      <Eye size={12} color="var(--accent-blue)" />
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => removeWatcher(wId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-red-dim)',
                          cursor: 'pointer',
                          padding: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="إزالة المتابع"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                        ? '1px solid var(--accent-blue)'
                        : '1px solid var(--border-strong)',
                    background:
                      estimatedMinutes === m ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
                    color: estimatedMinutes === m ? 'var(--accent-blue)' : 'var(--text-muted)',
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
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>دقيقة</span>
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

          {/* Attachments Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={modalStyles.label}>
                المرفقات والصور ({existingAttachments.length + newAttachments.length})
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleCaptureScreen}
                  disabled={isCapturing}
                  style={modalStyles.actionSmallBtn}
                  title="التقاط لقطة شاشة للحاسوب وإرفاقها فوراً"
                >
                  <Camera size={13} color="var(--accent-blue)" />
                  <span>{isCapturing ? 'جاري الالتقاط…' : 'لقطة شاشة فورية'}</span>
                </button>

                <label style={modalStyles.actionSmallBtn}>
                  <Paperclip size={13} color="var(--accent-purple)" />
                  <span>إرفاق صورة / ملف</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>المرفقات المحفوظة مسبقاً:</div>
                <div style={modalStyles.attachmentList}>
                  {existingAttachments.map((att: any, i: number) => {
                    const fileUrl = resolveAttachmentUrl(att.filePath || att.fileUrl || att.url || '');
                    const isImg = (att.mimeType || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.fileName || att.originalName || att.filePath || '');
                    return (
                      <div key={att.id || i} style={modalStyles.attachmentChip}>
                        {isImg && fileUrl ? (
                          <img src={fileUrl} alt="" style={modalStyles.thumb} />
                        ) : (
                          <Paperclip size={12} color="var(--text-muted)" />
                        )}
                        <span style={modalStyles.attName} title={att.originalName || att.fileName}>
                          {att.originalName || att.fileName || `مرفق #${i + 1}`}
                        </span>
                        <span style={modalStyles.badgeExisting}>محفوظ</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Draft Attachments */}
            {newAttachments.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--accent-blue)', marginBottom: 4 }}>مرفقات جديدة ستُرفع عند الحفظ:</div>
                <div style={modalStyles.attachmentList}>
                  {newAttachments.map((att, i) => (
                    <div key={i} style={{ ...modalStyles.attachmentChip, borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt="" style={modalStyles.thumb} />
                      ) : (
                        <Paperclip size={12} color="var(--accent-blue)" />
                      )}
                      <span style={modalStyles.attName} title={att.fileName}>{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeNewAttachment(i)}
                        style={modalStyles.removeAttBtn}
                        title="حذف هذا المرفق"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <span>جاري الحفظ والرفع…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>حفظ التعديلات والمرفقات</span>
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
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '92vh',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
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
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
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
    overflowY: 'auto',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  actionSmallBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 9px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 11,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
  },
  attachmentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  attachmentChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    maxWidth: 240,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 3,
    objectFit: 'cover',
    flexShrink: 0,
  },
  attName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
  badgeExisting: {
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 4,
    background: 'var(--border-subtle)',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  removeAttBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-red)',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.12)',
    borderBottom: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red-dim)',
    fontSize: 12,
    padding: '8px 18px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTop: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-muted)',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'var(--accent-blue)',
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
