import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  Volume2,
  Monitor,
  X,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
  Sparkles,
  Moon,
  Sun,
  Type,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

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
  const { mode, setTheme, fontSize, setFontSize } = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  // Auto-updater state
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    status: 'idle' | 'checking' | 'dev' | 'update-available' | 'downloaded' | 'up-to-date' | 'error';
    message?: string;
    version?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (isOpen) {
      loadPrefs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((status: any) => {
      if (status.stage === 'checking') {
        setIsCheckingUpdate(true);
        setUpdateResult({ status: 'checking' });
      } else if (status.stage === 'available') {
        setIsCheckingUpdate(false);
        setUpdateResult({
          status: 'update-available',
          version: status.version,
          message: `يتوفر إصدار جديد v${status.version}. جاري التنزيل تلقائياً في الخلفية...`,
        });
      } else if (status.stage === 'downloading') {
        setIsCheckingUpdate(false);
        setUpdateResult({
          status: 'update-available',
          message: `جاري تنزيل التحديث... (${status.percent || 0}%)`,
        });
      } else if (status.stage === 'downloaded') {
        setIsCheckingUpdate(false);
        setUpdateResult({
          status: 'downloaded',
          version: status.version,
          message: `تم تنزيل التحديث v${status.version} بنجاح! جاهز للتثبيت الفوري.`,
        });
      } else if (status.stage === 'up-to-date') {
        setIsCheckingUpdate(false);
        setUpdateResult({
          status: 'up-to-date',
          message: `البرنامج على أحدث إصدار v${status.version || currentVersion}.`,
        });
      } else if (status.stage === 'error') {
        setIsCheckingUpdate(false);
        setUpdateResult({
          status: 'error',
          message: status.message || 'تعذر الاتصال بخادم التحديثات',
        });
      }
    });
    return () => unsub();
  }, [currentVersion]);

  const loadPrefs = async () => {
    try {
      const [s, sys] = await Promise.all([
        window.electronAPI.getSettings().catch(() => null),
        window.electronAPI.getSystemInfo().catch(() => null),
      ]);
      if (s) {
        setPrefs({
          autoLaunchEnabled: s.autoLaunchEnabled === true,
          soundAlerts: s.soundAlerts === true,
          idleReminder: s.idleReminder === true,
        });
      }
      if (sys?.appVersion) {
        setCurrentVersion(sys.appVersion);
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

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateResult({ status: 'checking' });
    try {
      const res = await window.electronAPI.checkForUpdates();
      setUpdateResult({
        status: res.status,
        message: res.message,
        version: res.latestVersion || res.currentVersion,
      });
    } catch (err: any) {
      setUpdateResult({
        status: 'error',
        message: err?.message || 'تعذر الاتصال بخادم التحديثات',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={styles.headerIcon}>
              <ShieldCheck size={16} color="var(--accent-green)" />
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
                <Bell size={13} color="var(--accent-green)" />
                <span style={styles.sectionTitle}>التفضيلات الشخصية</span>
              </div>
              <span style={styles.savedBadge}>تُطبّق فوراً على هذا الجهاز</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              {/* Auto Launch — wired to app.setLoginItemSettings */}
              <label style={styles.toggleRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={14} color="var(--text-muted)" />
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
                  <Volume2 size={14} color="var(--text-muted)" />
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
                  <Bell size={14} color="var(--text-muted)" />
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

          {/* Appearance / Theme Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {mode === 'dark' ? <Moon size={13} color="var(--accent-blue)" /> : <Sun size={13} color="var(--accent-yellow)" />}
                <span style={styles.sectionTitle}>المظهر</span>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: mode === 'dark' ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                  background: mode === 'dark' ? 'var(--accent-blue-bg)' : 'var(--bg-input)',
                  color: mode === 'dark' ? 'var(--accent-blue)' : 'var(--text-dim)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <Moon size={14} />
                <span>داكن</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: mode === 'light' ? '1px solid var(--accent-yellow)' : '1px solid var(--border-default)',
                  background: mode === 'light' ? 'rgba(234,179,8,0.08)' : 'var(--bg-input)',
                  color: mode === 'light' ? '#ca8a04' : 'var(--text-dim)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <Sun size={14} />
                <span>فاتح</span>
              </button>
            </div>
          </div>

          {/* Typography & Font Size Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Type size={13} color="var(--accent-blue)" />
                <span style={styles.sectionTitle}>حجم الخط وكثافة العرض</span>
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              تحكم في مقياس النصوص لعرض مريح يناسب شاشة جهازك
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setFontSize('compact')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: fontSize === 'compact' ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                  background: fontSize === 'compact' ? 'var(--accent-blue-bg)' : 'var(--bg-input)',
                  color: fontSize === 'compact' ? 'var(--accent-blue)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>مدمج</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>شاشات اللابتوب</span>
              </button>
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: fontSize === 'normal' ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                  background: fontSize === 'normal' ? 'var(--accent-blue-bg)' : 'var(--bg-input)',
                  color: fontSize === 'normal' ? 'var(--accent-blue)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>قياسي</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>الموصى به</span>
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: fontSize === 'large' ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                  background: fontSize === 'large' ? 'var(--accent-blue-bg)' : 'var(--bg-input)',
                  color: fontSize === 'large' ? 'var(--accent-blue)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>كبير</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>قراءة أوضح</span>
              </button>
            </div>
          </div>

          {/* Software Updates Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="var(--accent-blue)" />
                <span style={styles.sectionTitle}>تحديثات البرنامج</span>
              </div>
              <span style={styles.versionBadge}>v{currentVersion}</span>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={styles.toggleTitle}>التحقق من التحديثات</div>
                  <div style={styles.toggleDesc}>
                    التأكد من تشغيل أحدث حزمة ميزات وأمان لمنصة MaxP
                  </div>
                </div>
                <button
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  style={{
                    ...styles.checkUpdateBtn,
                    opacity: isCheckingUpdate ? 0.7 : 1,
                  }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <RefreshCw
                    size={12}
                    style={{
                      animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  <span>{isCheckingUpdate ? 'جاري الفحص…' : 'فحص الآن'}</span>
                </button>
              </div>

              {/* Status Feedback banner */}
              {updateResult.status !== 'idle' && (
                <div
                  style={{
                    ...styles.updateAlert,
                    background:
                      updateResult.status === 'update-available'
                        ? 'rgba(56, 189, 248, 0.1)'
                        : updateResult.status === 'up-to-date' || updateResult.status === 'dev'
                        ? 'var(--accent-green-bg)'
                        : updateResult.status === 'error'
                        ? 'var(--accent-red-bg)'
                        : 'var(--border-subtle)',
                    borderColor:
                      updateResult.status === 'update-available'
                        ? 'rgba(56, 189, 248, 0.25)'
                        : updateResult.status === 'up-to-date' || updateResult.status === 'dev'
                        ? 'var(--accent-green-border)'
                        : updateResult.status === 'error'
                        ? 'var(--accent-red-border)'
                        : 'var(--border-strong)',
                  }}
                >
                  {updateResult.status === 'checking' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>جاري الاتصال بخادم التحديثات…</span>
                    </div>
                  )}

                  {updateResult.status === 'update-available' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}>
                      <Download size={13} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{updateResult.message}</span>
                    </div>
                  )}

                  {updateResult.status === 'downloaded' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}>
                        <CheckCircle2 size={13} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{updateResult.message}</span>
                      </div>
                      <button
                        onClick={() => window.electronAPI.quitAndInstallUpdate()}
                        style={{
                          background: 'var(--accent-green)',
                          color: 'var(--text-inverse)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <span>إعادة التشغيل وتثبيت التحديث الآن</span>
                      </button>
                    </div>
                  )}

                  {(updateResult.status === 'up-to-date' || updateResult.status === 'dev') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}>
                      <CheckCircle2 size={13} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{updateResult.message}</span>
                    </div>
                  )}

                  {updateResult.status === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-red-dim)' }}>
                      <AlertCircle size={13} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{updateResult.message}</span>
                    </div>
                  )}
                </div>
              )}
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
              background: saved ? 'var(--accent-green)' : 'var(--btn-primary-bg)',
              color: saved ? '#ffffff' : 'var(--btn-primary-text)',
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
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
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
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: 14,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
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
    background: 'var(--bg-topbar)',
    border: '1px solid var(--border-subtle)',
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
    color: 'var(--text-secondary)',
  },
  savedBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'var(--border-subtle)',
    border: '1px solid var(--border-strong)',
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
    color: 'var(--text-primary)',
  },
  toggleDesc: {
    fontSize: 11,
    color: 'var(--text-dim)',
    marginTop: 2,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--accent-green)',
    cursor: 'pointer',
    flexShrink: 0,
    marginRight: 8,
  },
  versionBadge: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: 'var(--accent-blue)',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 6,
    padding: '2px 7px',
  },
  checkUpdateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--border-subtle)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 7,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  updateAlert: {
    borderRadius: 8,
    border: '1px solid',
    padding: '8px 12px',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'all 200ms ease-out',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: 12,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  saveBtn: {
    background: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
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
