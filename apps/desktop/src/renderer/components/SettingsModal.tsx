import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [idleTimeout, setIdleTimeout] = useState(5);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);
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
    } catch {}
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.updateSettings({
        idleTimeoutMinutes: idleTimeout,
        trackingStartHour: startHour,
        trackingEndHour: endHour,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        <div style={styles.content}>
          <div style={styles.field}>
            <label style={styles.label}>Idle Timeout (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(Number(e.target.value))}
              style={styles.input}
            />
            <span style={styles.hint}>Time with no input before marking as idle</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Work Start Hour (24h)</label>
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
            <label style={styles.label}>Work End Hour (24h)</label>
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

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={styles.saveBtn}>
            {saved ? 'Saved!' : 'Save Changes'}
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
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    background: '#121214',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fafafa',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#71717a',
    fontSize: 20,
    cursor: 'pointer',
    padding: '0 4px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
  },
  input: {
    background: '#09090b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
  },
  hint: {
    fontSize: 11,
    color: '#52525b',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    color: '#a1a1aa',
    cursor: 'pointer',
  },
  saveBtn: {
    background: '#fafafa',
    color: '#09090b',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default SettingsModal;
