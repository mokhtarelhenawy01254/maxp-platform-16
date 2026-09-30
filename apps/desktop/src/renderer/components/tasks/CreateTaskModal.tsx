import React, { useState } from 'react';
import {
  X,
  Plus,
  Camera,
  Paperclip,
  Trash2,
  Calendar,
  Users,
  Repeat,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
  UserCheck,
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

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  users: CompanyUser[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  users,
}) => {
  const getDefaultDueDate = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [watchers, setWatchers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [projectName, setProjectName] = useState('');
  const [templates, setTemplates] = useState<{ name: string; title: string; description: string; priority: string; estimatedMinutes: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('maxp_task_templates') || '[]'); } catch { return []; }
  }, []);

  const saveAsTemplate = (): void => {
    if (!title.trim()) return;
    try {
      const next = [...templates, { name: title.trim().slice(0, 24), title: title.trim(), description: description.trim(), priority, estimatedMinutes }];
      localStorage.setItem('maxp_task_templates', JSON.stringify(next.slice(-6)));
      setTemplates(next.slice(-6));
    } catch {}
  };

  const applyTemplate = (tpl: typeof templates[number]): void => {
    setTitle(tpl.title);
    setDescription(tpl.description || '');
    setPriority((tpl.priority as any) || 'MEDIUM');
    setEstimatedMinutes(tpl.estimatedMinutes || 60);
  };
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringRule, setRecurringRule] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addWatcher = (userId: string) => {
    if (userId && !watchers.includes(userId)) {
      setWatchers((prev) => [...prev, userId]);
    }
  };

  const removeWatcher = (userId: string) => {
    setWatchers((prev) => prev.filter((id) => id !== userId));
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
        setAttachments((prev) => [...prev, newAtt]);
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
        setAttachments((prev) => [
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

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Natural-language quick add — parsed synchronously at submit:
  // dates (بكرة / بعد يومين / بعد 3 أيام / بعد أسبوع / weekday) and priority (عاجل).
  const parseQuickAdd = (rawTitle: string): { title: string; dueDate?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' } => {
    let clean = rawTitle;
    let dueISO: string | undefined;
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined;

    const base = new Date();
    const addDays = (n: number): Date => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
    const setEndOfDay = (d: Date): string => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0).toISOString().slice(0, 10);
    const weekdays: [RegExp, number][] = [
      [/الأحد|الاحد/, 0], [/الإثنين|الاثنين|الاتنين/, 1], [/الثلاثاء|التلات/, 2],
      [/الأربعاء|الاربع/, 3], [/الخميس/, 4], [/الجمعة|الجمعه/, 5], [/السبت/, 6],
    ];

    const afterDays = rawTitle.match(/بعد\s*(يومين|[0-9]+\s*(?:أيام|يوم))/);
    const afterWeek = rawTitle.match(/بعد\s*(أسبوعين|[0-9]+\s*(?:أسابيع|أسبوع))/);
    const weekdayHit = weekdays.find(([re]) => re.test(rawTitle));

    let due: Date | null = null;
    if (/بكرة|بكره|غدًا|غدا/.test(rawTitle)) due = addDays(1);
    else if (afterDays) {
      const m = afterDays[1];
      due = addDays(m.includes('يومين') ? 2 : (parseInt(m.replace(/[^0-9]/g, ''), 10) || 1));
    } else if (afterWeek) {
      const m = afterWeek[1];
      due = addDays(m.includes('أسبوعين') ? 14 : (parseInt(m.replace(/[^0-9]/g, ''), 10) || 7));
    } else if (weekdayHit) {
      let diff = (weekdayHit[1] - base.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      due = addDays(diff);
    }

    if (due) {
      dueISO = setEndOfDay(due);
      clean = clean
        .replace(/بعد\s*(يومين|[0-9]+\s*(?:أيام|يوم|أسبوع|أسابيع|أسبوعين|أسابيع))/g, '')
        .replace(/بكرة|بكره|غدًا|غدا/g, '');
      weekdays.forEach(([re]) => { clean = clean.replace(re, ''); });
      clean = clean.replace(/\s{2,}/g, ' ').replace(/\s+([.!؟?])/g, '$1').trim();
    }

    if (/عاجل|مستعجل|ضروري|فورًا|فورا/.test(rawTitle)) {
      priority = 'URGENT';
      clean = clean.replace(/عاجل|مستعجل|ضروري|فورًا|فورا/g, '').replace(/\s{2,}/g, ' ').trim();
    }

    return { title: clean.trim() || rawTitle, dueDate: dueISO, priority };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان المهمة');
      return;
    }

    const quick = parseQuickAdd(title.trim());
    const finalTitle = quick.title;
    const finalDue = quick.dueDate || (dueDate ? new Date(dueDate).toISOString().slice(0, 10) : '');
    const finalPriority = quick.priority || priority;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create task
      const createRes = await window.electronAPI.createTask({
        title: finalTitle,
        description: description.trim() || finalTitle,
        priority: finalPriority,
        assignedTo: assignedTo || undefined,
        dueDate: finalDue ? new Date(finalDue).toISOString() : undefined,
        estimatedMinutes: Number(estimatedMinutes) || 60,
        projectName: projectName.trim() || undefined,
        isRecurring,
        recurringRule: isRecurring ? recurringRule : undefined,
        watchers,
      });

      if (!createRes.success || !createRes.task?.id) {
        throw new Error(createRes.error || 'فشل إنشاء المهمة في السيرفر');
      }

      if (finalPriority === 'URGENT') {
        audioAlerts.playUrgentAlert();
      } else {
        audioAlerts.playTaskStart();
      }

      const newTaskId = createRes.task.id;

      // 2. Upload attachments if any
      for (const att of attachments) {
        try {
          await window.electronAPI.uploadTaskAttachment({
            taskId: newTaskId,
            base64Data: att.base64Data,
            originalName: att.fileName,
            mimeType: att.mimeType,
          });
        } catch (uploadErr) {
          console.warn('[Task Modal] Attachment upload skipped:', uploadErr);
        }
      }

      // Reset form & notify
      setTitle('');
      setProjectName('');
      setDescription('');
      setAssignedTo('');
      setWatchers([]);
      setAttachments([]);
      setIsRecurring(false);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        {/* Modal Header */}
        <div style={modalStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="var(--accent-blue)" />
            <span style={modalStyles.title}>إسناد وتكليف مهمة عمل جديدة</span>
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        {error && <div style={modalStyles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={modalStyles.form}>
        {templates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>قوالب:</span>
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(tpl)}
                title={tpl.title}
                style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-blue)', backgroundColor: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', borderRadius: 10, padding: '2px 9px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {tpl.name}
              </button>
            ))}
            <button
              type="button"
              onClick={saveAsTemplate}
              title="حفظ البيانات الحالية كقالب"
              style={{ fontSize: 10.5, color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border-default)', borderRadius: 10, padding: '2px 9px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + حفظ كقالب
            </button>
          </div>
        )}
        {templates.length === 0 && (
          <button
            type="button"
            onClick={saveAsTemplate}
            style={{ fontSize: 10.5, color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border-default)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, alignSelf: 'flex-start' }}
            title="احفظ المهمة الحالية كقالب للاستخدام لاحقًا"
          >
            + حفظ الحقول الحالية كقالب
          </button>
        )}
          {/* Title */}
          <div>
            <label style={modalStyles.label}>عنوان المهمة *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مراجعة شحنات بوسطة وتأكيد المرتجعات…"
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
              placeholder="اكتب تعليمات أو ملاحظات توضيحية لزميلك…"
              rows={3}
              style={{ ...modalStyles.input, resize: 'vertical' }}
            />
          </div>

          {/* Assignee & Priority (2 columns) */}
          <div style={modalStyles.row2}>
            <div>
              <label style={modalStyles.label}>تكليف عضو فريق العمل</label>
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
              <label style={{ ...modalStyles.label }}>المشروع</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="مثال: Swan Store (اختياري)"
                style={{ ...modalStyles.input, marginBottom: 12 }}
              />
              <label style={{ ...modalStyles.label }}>مستوى الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={modalStyles.select}
              >
                <option value="URGENT">عاجل وفوري (Urgent)</option>
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

          {/* Estimated Duration in Minutes */}
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
                    border: estimatedMinutes === m ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                    background: estimatedMinutes === m ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
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

          {/* Due Date & Recurring */}
          <div style={modalStyles.row2}>
            <div>
              <label style={modalStyles.label}>تاريخ ووقت الاستحقاق</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={modalStyles.input}
              />
            </div>

            <div>
              <label style={modalStyles.label}>نمط التكرار التلقائي</label>
              <div style={modalStyles.recurringWrap}>
                <label style={modalStyles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    style={{ accentColor: 'var(--accent-blue)' }}
                  />
                  <span>مهمة متكررة</span>
                </label>
                {isRecurring && (
                  <select
                    value={recurringRule}
                    onChange={(e) => setRecurringRule(e.target.value as any)}
                    style={{ ...modalStyles.select, flex: 1, padding: '4px 8px' }}
                  >
                    <option value="DAILY">يومياً</option>
                    <option value="WEEKLY">أسبوعياً</option>
                    <option value="MONTHLY">شهرياً</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Attachments & Screen Snippet */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={modalStyles.label}>المرفقات والصور ({attachments.length})</label>
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
                  <span>رفع صورة / ملف</span>
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

            {/* Attachments preview list */}
            {attachments.length > 0 && (
              <div style={modalStyles.attachmentList}>
                {attachments.map((att, i) => (
                  <div key={i} style={modalStyles.attachmentChip}>
                    {att.previewUrl ? (
                      <img src={att.previewUrl} alt="" style={modalStyles.thumb} />
                    ) : (
                      <Paperclip size={12} color="var(--text-muted)" />
                    )}
                    <span style={modalStyles.attName}>{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      style={modalStyles.removeAttBtn}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div style={modalStyles.footer}>
            <button type="button" onClick={onClose} style={modalStyles.cancelBtn}>
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={modalStyles.submitBtn}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{isSubmitting ? 'جاري الحفظ والرفع…' : 'إسناد المهمة الآن'}</span>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)',
  },
  modal: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: 12,
    width: '92%',
    maxWidth: 580,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-default)',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
  },
  form: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    fontSize: 12,
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    fontSize: 12,
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  recurringWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 33,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionSmallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  attachmentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    maxHeight: 100,
    overflowY: 'auto',
    padding: 6,
    backgroundColor: 'var(--bg-input)',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
  },
  attachmentChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 11,
    maxWidth: 220,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 2,
    objectFit: 'cover',
  },
  attName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--text-secondary)',
    fontSize: 10,
  },
  removeAttBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-red)',
    cursor: 'pointer',
    padding: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTop: '1px solid var(--border-subtle)',
    marginTop: 4,
  },
  cancelBtn: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-muted)',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitBtn: {
    backgroundColor: 'var(--accent-blue)',
    border: 'none',
    color: '#ffffff',
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  errorAlert: {
    backgroundColor: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red-dim)',
    padding: '8px 12px',
    margin: '10px 18px 0',
    borderRadius: 6,
    fontSize: 12,
  },
};

export default CreateTaskModal;
