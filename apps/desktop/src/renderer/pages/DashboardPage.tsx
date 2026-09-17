import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Play, Clock, CheckCircle2 } from 'lucide-react';
import Sidebar, { TabId } from '../components/Sidebar';
import CockpitTab from './CockpitTab';
import TasksTab from './TasksTab';
import AppsTimelineTab from './AppsTimelineTab';
import AttendanceAuditTab from './AttendanceAuditTab';
import SystemStatusTab from './SystemStatusTab';
import SettingsModal from '../components/SettingsModal';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const roleStr = String(user?.role || '').toUpperCase();
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleStr);

  const [activeTab, setActiveTabState] = useState<TabId>(() => {
    try {
      const saved = (localStorage.getItem('maxp_active_tab') as TabId) || 'tasks';
      if (!isAdmin && (saved === 'attendance' || saved === 'system')) {
        return 'tasks';
      }
      return saved;
    } catch {
      return 'tasks';
    }
  });

  const setActiveTab = (tab: TabId) => {
    if (!isAdmin && (tab === 'attendance' || tab === 'system')) {
      setActiveTabState('tasks');
      return;
    }
    setActiveTabState(tab);
    try {
      localStorage.setItem('maxp_active_tab', tab);
    } catch {}
  };

  const [trackerState, setTrackerState] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [clockInDisplay, setClockInDisplay] = useState<string | null>(null);

  // Auto-redirect if non-admin somehow lands on restricted tab
  useEffect(() => {
    if (!isAdmin && (activeTab === 'attendance' || activeTab === 'system')) {
      setActiveTab('tasks');
    }
  }, [isAdmin, activeTab]);

  // Load attendance clock-in time for affirmative top-bar badge
  useEffect(() => {
    const fetchClockIn = async () => {
      try {
        const audit = await window.electronAPI.getAttendanceAudit();
        if (audit?.clockInTime) {
          const timeStr = new Date(audit.clockInTime).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setClockInDisplay(timeStr);
        }
      } catch {}
    };
    fetchClockIn();
    const interval = setInterval(fetchClockIn, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  const isPaused = trackerState?.isPaused ?? false;

  const handleToggleBreak = async () => {
    setBreakLoading(true);
    try {
      if (isPaused) {
        await window.electronAPI.resumeTracking();
      } else {
        await window.electronAPI.pauseTracking();
      }
      await refreshState();
    } catch (err) {
      console.error('Break toggle error:', err);
    } finally {
      setBreakLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 10_000); // 10s poll

    window.electronAPI.onTrackerStateUpdate((state) => {
      setTrackerState((prev: any) => ({ ...prev, ...state }));
    });

    return () => clearInterval(interval);
  }, [refreshState]);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0 ث';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h === 0) {
      return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
    }
    return `${h} س ${m} د`;
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'cockpit':
        return isAdmin ? 'النشاط المباشر والعدادات' : 'النشاط وساعات العمل';
      case 'tasks':
        return 'المهام اليومية ومعدل الإنجاز';
      case 'apps':
        return 'سجل البرامج والمواقع';
      case 'attendance':
        return 'مطابقة الحضور والنشاط';
      case 'system':
        return 'حالة السحابة والجهاز';
      default:
        return 'بيئة العمل';
    }
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar Navigation Rail */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={onLogout}
        isOnline={true}
      />

      {/* Main Surface Chassis */}
      <main style={styles.main}>
        {/* Unified Top Control Bar */}
        <header style={styles.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={styles.pageTitle}>{getTabTitle()}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {clockInDisplay && (
              <div style={styles.clockInBadge} title="تسجيل حضور اليوم موثق في السحابة">
                <Clock size={12} color="#22c55e" />
                <span>حضور اليوم: {clockInDisplay}</span>
              </div>
            )}

            {isPaused ? (
              <div style={styles.breakStatusGroup}>
                <div style={styles.breakActiveChip}>
                  <Coffee size={13} color="#eab308" />
                  <span>استراحة رسمية جارية</span>
                </div>
                <button
                  onClick={handleToggleBreak}
                  disabled={breakLoading}
                  style={styles.resumeWorkBtn}
                  title="استئناف توثيق العمل والإنتاجية"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Play size={13} fill="#22c55e" color="#22c55e" />
                  <span>استئناف العمل</span>
                </button>
              </div>
            ) : (
              <div style={styles.breakStatusGroup}>
                <div style={styles.enforcedChip}>
                  <span style={styles.greenDot} />
                  <span>جلسة العمل موثقة ونشطة</span>
                </div>
                <button
                  onClick={handleToggleBreak}
                  disabled={breakLoading}
                  style={styles.startBreakBtn}
                  title="بدء استراحة رسمية مسموحة (صلاة / غداء)"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Coffee size={13} color="#a1a1aa" />
                  <span>استراحة رسمية</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div style={styles.contentArea}>
          {activeTab === 'cockpit' && (
            <CockpitTab
              trackerState={trackerState}
              dailySummary={dailySummary}
              formatTime={formatTime}
              onToggleBreak={handleToggleBreak}
              user={user}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'tasks' && <TasksTab />}

          {activeTab === 'apps' && (
            <AppsTimelineTab formatTime={formatTime} />
          )}

          {activeTab === 'attendance' && (
            <AttendanceAuditTab formatTime={formatTime} />
          )}

          {activeTab === 'system' && <SystemStatusTab />}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        isAdmin={isAdmin}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    background: '#09090b',
    color: '#fafafa',
    overflow: 'hidden',
    userSelect: 'none',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
    background: '#09090b',
  },
  topBar: {
    height: 58,
    minHeight: 58,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: '#0c0c0e',
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fafafa',
    letterSpacing: '-0.01em',
  },
  breakStatusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  clockInBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.22)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#d4d4d8',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  enforcedChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.22)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#22c55e',
    fontWeight: 600,
  },
  breakActiveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.28)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#eab308',
    fontWeight: 600,
  },
  startBreakBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#18181b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: '#d4d4d8',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  resumeWorkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    borderRadius: 8,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 600,
    color: '#22c55e',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)',
  },
  contentArea: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
  },
};

export default DashboardPage;
