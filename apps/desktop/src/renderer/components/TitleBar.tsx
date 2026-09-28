import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Laptop, Building2, ShieldCheck } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ hostname: string; deviceType?: 'OFFICE' | 'PERSONAL' } | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getDeviceInfo) {
      window.electronAPI.getDeviceInfo().then((info: any) => {
        if (info?.hostname) setDeviceInfo(info);
      }).catch(() => {});
    }

    if (window.electronAPI?.windowIsMaximized) {
      window.electronAPI.windowIsMaximized().then(setIsMaximized).catch(() => {});
    }

    if (window.electronAPI?.onTrackerStateUpdate) {
      const unsub = window.electronAPI.onTrackerStateUpdate((state: any) => {
        if (state?.deviceType) {
          setDeviceInfo((prev) => (prev ? { ...prev, deviceType: state.deviceType } : null));
        }
      });
      return () => unsub?.();
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize?.();
  };

  const handleToggleMaximize = async () => {
    if (window.electronAPI?.windowToggleMaximize) {
      const nowMax = await window.electronAPI.windowToggleMaximize();
      setIsMaximized(nowMax);
    }
  };

  const handleClose = () => {
    window.electronAPI?.windowClose?.();
  };

  return (
    <header style={styles.titleBar}>
      {/* Draggable window area */}
      <div style={styles.dragRegion}>
        <div style={styles.brandRow}>
          <div style={styles.logoDot} />
          <span style={styles.brandTitle}>MaxP Workspace</span>
          {deviceInfo?.hostname && (
            <span style={styles.deviceBadge} title={`الجهاز المتصل: ${deviceInfo.hostname}`}>
              <Laptop size={11} color="var(--text-dim)" />
              <span>{deviceInfo.hostname}</span>
            </span>
          )}
          {deviceInfo?.deviceType === 'OFFICE' ? (
            <span style={styles.officeBadge} title="جهاز مكتب معتمد (كامل الصلاحيات والإشعارات)">
              <Building2 size={11} color="#10b981" />
              <span>جهاز مكتب</span>
            </span>
          ) : deviceInfo?.deviceType === 'PERSONAL' ? (
            <span style={styles.personalBadge} title="جهاز شخصي (صلاحيات مقيدة وإشعارات العمل متوقفة)">
              <ShieldCheck size={11} color="#f59e0b" />
              <span>شخصي (مقيّد)</span>
            </span>
          ) : null}
        </div>
      </div>


      {/* Non-draggable control buttons */}
      <div style={styles.controlsRegion}>
        <button
          type="button"
          onClick={handleMinimize}
          style={styles.controlBtn}
          title="تصغير النافذة"
          aria-label="Minimize"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Minus size={13} color="var(--text-secondary)" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          style={styles.controlBtn}
          title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {isMaximized ? (
            <Copy size={11} color="var(--text-secondary)" />
          ) : (
            <Square size={11} color="var(--text-secondary)" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          style={styles.closeBtn}
          title="إغلاق إلى شريط المهام"
          aria-label="Close"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#ef4444';
            (e.currentTarget as HTMLElement).style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  titleBar: {
    height: 32,
    background: 'var(--bg-topbar)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    userSelect: 'none',
    zIndex: 9999,
    flexShrink: 0,
  },
  dragRegion: {
    flex: 1,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    // @ts-ignore - Electron CSS property
    WebkitAppRegion: 'drag',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green-dim)',
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  deviceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-dim)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    padding: '1px 6px',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  officeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 4,
    padding: '1px 6px',
    marginLeft: 4,
  },
  personalBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 4,
    padding: '1px 6px',
    marginLeft: 4,
  },
  controlsRegion: {

    display: 'flex',
    alignItems: 'center',
    height: '100%',
    // @ts-ignore - Electron CSS property
    WebkitAppRegion: 'no-drag',
  },
  controlBtn: {
    width: 44,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 120ms ease-out',
    padding: 0,
  },
  closeBtn: {
    width: 44,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 120ms ease-out',
    padding: 0,
  },
};

export default TitleBar;
