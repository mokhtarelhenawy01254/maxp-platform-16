import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  Volume2,
  Monitor,
  X,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Prefs {
  autoLaunchEnabled: boolean;
  soundAlerts: boolean;
  idleReminder: boolean;
}

const DEFAULT_PREFS: Prefs = {
  autoLaunchEnabled: true,
  soundAlerts: true,
  idleReminder: true,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPrefs();
    }
  }, [isOpen]);

  const loadPrefs = async () => {
    try {
      const s = await window.electronAPI.getSettings();
      if (s) {
        setPrefs({
          autoLaunchEnabled: s.autoLaunchEnabled === true,
          soundAlerts: s.soundAlerts === true,
          idleReminder: s.idleReminder === true,
        });
      }
    } catch {}
  };

  const toggle = (key: keyof Prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.updateSettings({ ...prefs });
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
            <h2 style={styles.title}>إعدادات التطبيق</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={13} color="#22c55e" />
                <span style={styles.sectionTitle}>التفضيلات الشخصية</span>
              </div>
              <span style={styles.savedBadge}>تُطبّق فوراً على هذا الجهاز</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              {/* Auto Launch — wired to app.setLoginItemSettings */}
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
                  checked={prefs.autoLaunchEnabled}
                  onChange={() => toggle('autoLaunchEnabled')}
                  style={styles.checkbox}
                />
              </label>

              {/* Sound Alerts — wired to notification sound */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Volume2 size={14} color="#a1a1aa" />
                  <div>
                    <div style={styles.toggleTitle}>تنبيه صوتي للاستراحة</div>
                    <div style={styles.toggleDesc}>
                      رنين عند بدء وضع الاستراحة أو استئناف العمل أو توثيق الحضور
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.soundAlerts}
                  onChange={() => toggle('soundAlerts')}
                  style={styles.checkbox}
                />
              </label>

              {/* Idle Reminder — wired to extended-idle notification */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} color="#a1a1aa" />
                  <div>
                    <div style={styles.toggleTitle}>تذكير عند الخمول الممتد</div>
                    <div style={styles.toggleDesc}>
                      إشعار بعد 10 دقائق خمول متواصل لتذكيرك باستئناف العمل أو تفعيل الاستراحة
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.idleReminder}
                  onChange={() => toggle('idleReminder')}
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
  savedBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#a1a1aa',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '2px 6px',
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
    flexShrink: 0,
    marginRight: 8,
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
