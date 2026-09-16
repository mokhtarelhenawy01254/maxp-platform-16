import React, { useState, useEffect, useCallback } from 'react';
import SettingsModal from '../components/SettingsModal';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [trackerState, setTrackerState] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const [state, summary] = await Promise.all([
        window.electronAPI.getTrackerState(),
        window.electronAPI.getDailySummary(),
      ]);
      setTrackerState(state);
      setDailySummary(summary);
    } catch {}
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 10_000); // Refresh every 10s

    window.electronAPI.onTrackerStateUpdate((state) => {
      setTrackerState((prev: any) => ({ ...prev, ...state }));
    });

    return () => clearInterval(interval);
  }, [refreshState]);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleToggle = async () => {
    await window.electronAPI.toggleTracking();
    refreshState();
  };

  const handlePauseResume = async () => {
    if (trackerState?.isPaused) {
      await window.electronAPI.resumeTracking();
    } else {
      await window.electronAPI.pauseTracking();
    }
    refreshState();
  };

  const isActive = trackerState?.isTracking && !trackerState?.isPaused;
  const statusColor = isActive ? '#22c55e' : trackerState?.isPaused ? '#eab308' : '#71717a';
  const statusText = isActive ? 'Tracking Active' : trackerState?.isPaused ? 'Paused' : 'Stopped';

  const activeTime = dailySummary?.total_active_seconds ?? 0;
  const idleTime = dailySummary?.total_idle_seconds ?? 0;
  const mouseEvents = dailySummary?.total_mouse_events ?? 0;
  const keyboardEvents = dailySummary?.total_keyboard_events ?? 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.userName}>
            {user?.firstName ?? user?.name ?? 'User'}
          </div>
          <div style={styles.statusRow}>
            <span style={{ ...styles.statusDot, background: statusColor }} />
            <span style={styles.statusText}>{statusText}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSettings(true)} style={styles.logoutBtn}>Settings</button>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Control */}
      <div style={styles.controlRow}>
        <button
          onClick={handleToggle}
          style={{
            ...styles.mainBtn,
            background: trackerState?.isTracking ? '#dc2626' : '#22c55e',
          }}
          onMouseDown={(e) => { (e.target as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
        >
          {trackerState?.isTracking ? 'Stop' : 'Start'}
        </button>

        {trackerState?.isTracking && (
          <button
            onClick={handlePauseResume}
            style={styles.secondaryBtn}
            onMouseDown={(e) => { (e.target as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {trackerState?.isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>

      {/* Today Stats */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Today</div>
        <div style={styles.statsGrid}>
          <StatCard label="Active Time" value={formatTime(activeTime)} color="#22c55e" />
          <StatCard label="Idle Time" value={formatTime(idleTime)} color="#eab308" />
          <StatCard label="Mouse Events" value={mouseEvents.toLocaleString()} color="#3b82f6" />
          <StatCard label="Keyboard Events" value={keyboardEvents.toLocaleString()} color="#8b5cf6" />
        </div>
      </div>

      {/* Current Activity */}
      {trackerState?.isTracking && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Current</div>
          <div style={styles.currentInfo}>
            {trackerState?.currentApp && (
              <div style={styles.currentItem}>
                <span style={styles.currentLabel}>App</span>
                <span style={styles.currentValue}>{trackerState.currentApp}</span>
              </div>
            )}
            {trackerState?.currentUrl && (
              <div style={styles.currentItem}>
                <span style={styles.currentLabel}>URL</span>
                <span style={styles.currentValue}>{trackerState.currentUrl}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Footer */}
      <div style={styles.footer}>
        MaxP Monitor v1.0.0
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={statStyles.card}>
    <div style={{ ...statStyles.value, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={statStyles.label}>{label}</div>
  </div>
);

const statStyles: Record<string, React.CSSProperties> = {
  card: {
    background: '#121214',
    borderRadius: 8,
    padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  label: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#09090b',
    padding: 16,
    gap: 16,
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fafafa',
    letterSpacing: '-0.02em',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  statusText: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    color: '#a1a1aa',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 160ms ease-out',
  },
  controlRow: {
    display: 'flex',
    gap: 8,
  },
  mainBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 8,
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 160ms ease-out',
  },
  secondaryBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 500,
    color: '#a1a1aa',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 160ms ease-out',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#52525b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  currentInfo: {
    background: '#121214',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  currentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  currentValue: {
    fontSize: 13,
    color: '#d4d4d8',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center' as const,
    fontSize: 11,
    color: '#3f3f46',
    paddingTop: 8,
  },
};

export default DashboardPage;
