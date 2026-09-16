import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Bell,
  Volume2,
  Monitor,
  X,
  Clock,
  Coffee,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  isAdmin?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin = false,
}) => {
  const [idleTimeout, setIdleTimeout] = useState(5);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);

  // Employee personal preferences
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [idleReminder, setIdleReminder] = useState(true);
  const [autoLaunch, setAutoLaunch] = useState(true);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI.getSettings();
      if (s) {
        if (s.idleTimeoutMinutes) setIdleTimeout(s.idleTimeoutMinutes);
        if (s.trackingStartHour !== undefined) setStartHour(s.trackingStartHour);
        if (s.trackingEndHour !== undefined) setEndHour(s.trackingEndHour);
      }

      const savedSound = localStorage.getItem('maxp_pref_sound');
      if (savedSound !== null) setSoundAlerts(savedSound === 'true');

      const savedIdle = localStorage.getItem('maxp_pref_idle_remind');
      if (savedIdle !== null) setIdleReminder(savedIdle === 'true');

      const savedAuto = localStorage.getItem('maxp_pref_autolaunch');
      if (savedAuto !== null) setAutoLaunch(savedAuto === 'true');
    } catch {}
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('maxp_pref_sound', String(soundAlerts));
      localStorage.setItem('maxp_pref_idle_remind', String(idleReminder));
      localStorage.setItem('maxp_pref_autolaunch', String(autoLaunch));

      if (isAdmin) {
        await window.electronAPI.updateSettings({
          idleTimeoutMinutes: idleTimeout,
          trackingStartHour: startHour,
          trackingEndHour: endHour,
        });
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={styles.headerIcon}>
              <ShieldCheck size={16} color="#22c55e" />
            </div>
            <div>
              <h2 style={styles.title}>
                {isAdmin ? 'إعدادات المنظومة والسياسات' : 'إعدادات وتفضيلات التطبيق'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>

        <div style={styles.content}>
          {/* Section 1: Corporate Policies (Locked for Employees) */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} color="#a1a1aa" />
                <span style={styles.sectionTitle}>
                  {isAdmin ? 'سياسات التوثيق المركزية' : 'سياسات العمل المعتمدة (للقراءة فقط)'}
                </span>
              </div>
              <span style={styles.lockedBadge}>
                {isAdmin ? 'صلاحية الإدارة' : 'سياسة إدارية مقفلة 🔒'}
              </span>
            </div>

            {isAdmin ? (
              // Admin Editable Policy Fields
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                <div style={styles.field}>
                  <label style={styles.label}>مهلة احتساب الخمول (بالدقائق)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    style={styles.input}
                  />
                  <span style={styles.hint}>المدة بدون إدخال قبل وسم الجلسة كفترة توقف</span>
                </div>

                <div style={styles.rowFields}>
                  <div style={styles.field}>
                    <label style={styles.label}>ساعة بدء الدوام (24h)</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={startHour}
                      onChange={(e) => setStartHour(Number(e.target.value))}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>ساعة انتهاء الدوام (24h)</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={endHour}
                      onChange={(e) => setEndHour(Number(e.target.value))}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Employee Read-Only Badges
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div style={styles.readOnlyRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#38bdf8" />
                    <div>
                      <div style={styles.readOnlyLabel}>مهلة احتساب الخمول التلقائي</div>
                      <div style={styles.readOnlyDesc}>
                        يتم تفعيل وضع التوقف تلقائياً بعد عدم تفاعل الماوس أو الكيبورد
                      </div>
                    </div>
                  </div>
                  <div style={styles.policyPill}>{idleTimeout} دقائق</div>
                </div>

                <div style={styles.readOnlyRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Coffee size={14} color="#22c55e" />
                    <div>
                      <div style={styles.readOnlyLabel}>ساعات الدوام الرسمي المعتمد</div>
                      <div style={styles.readOnlyDesc}>
                        النطاق الزمني المعتمد لتوثيق الجلسات والإنتاجية
                      </div>
                    </div>
                  </div>
                  <div style={styles.policyPill}>
                    {String(startHour).padStart(2, '0')}:00 - {String(endHour).padStart(2, '0')}:00
                  </div>
                </div>

                <div style={styles.policyNote}>
                  تُدار مهل الخمول ومواعيد الدوام مركزياً من قبل إدارة المنظومة لضمان عدالة التقييم.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Personal Preferences (Always Editable) */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={13} color="#22c55e" />
                <span style={styles.sectionTitle}>التفضيلات الشخصية للتطبيق</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              {/* Sound Alerts */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Volume2 size={14} color="#a1a1aa" />
                  <div>
                    <div style={styles.toggleTitle}>تنبيه صوتي للاستراحة</div>
                    <div style={styles.toggleDesc}>
                      إصدار رنين ناعم عند بدء وضع الاستراحة أو استئناف العمل
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  style={styles.checkbox}
                />
              </label>

              {/* Idle Reminder */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} color="#a1a1aa" />
                  <div>
                    <div style={styles.toggleTitle}>تذكير لطيف عند الخمول الممتد</div>
                    <div style={styles.toggleDesc}>
                      إشعار مكتبي تذكيري في حال نسيت تفعيل الاستراحة أو استئناف المهام
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={idleReminder}
                  onChange={(e) => setIdleReminder(e.target.checked)}
                  style={styles.checkbox}
                />
              </label>

              {/* Auto Launch with Windows */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={14} color="#a1a1aa" />
                  <div>
                    <div style={styles.toggleTitle}>التشغيل التلقائي مع بدء ويندوز</div>
                    <div style={styles.toggleDesc}>
                      بدء التطبيق في الخلفية لضمان احتساب ساعات عملك دون انقطاع
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoLaunch}
                  onChange={(e) => setAutoLaunch(e.target.checked)}
                  style={styles.checkbox}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            style={styles.cancelBtn}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            style={{
              ...styles.saveBtn,
              background: saved ? '#22c55e' : '#fafafa',
              color: saved ? '#ffffff' : '#09090b',
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {saved ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>تم الحفظ</span>
              </span>
            ) : (
              'حفظ التفضيلات'
            )}
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
    background: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 25px 40px -10px rgba(0, 0, 0, 0.7)',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: 14,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: '#fafafa',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    transition: 'color 120ms ease-out',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionCard: {
    background: '#0c0c0e',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 14,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#d4d4d8',
  },
  lockedBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#a1a1aa',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '2px 6px',
  },
  readOnlyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#fafafa',
  },
  readOnlyDesc: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  policyPill: {
    fontSize: 11,
    fontWeight: 600,
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 6,
    padding: '3px 8px',
    fontVariantNumeric: 'tabular-nums',
  },
  policyNote: {
    fontSize: 10.5,
    color: '#52525b',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px dashed rgba(255, 255, 255, 0.06)',
    lineHeight: 1.4,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '4px 0',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#fafafa',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: '#22c55e',
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  rowFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  label: {
    fontSize: 11.5,
    fontWeight: 500,
    color: '#a1a1aa',
  },
  input: {
    background: '#09090b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
  },
  hint: {
    fontSize: 10.5,
    color: '#71717a',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  saveBtn: {
    background: '#fafafa',
    color: '#09090b',
    border: 'none',
    borderRadius: 8,
    padding: '7px 18px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 160ms ease-out',
  },
};

export default SettingsModal;
