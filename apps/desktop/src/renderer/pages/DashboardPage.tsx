import React, { useState, useEffect, useCallback } from 'react';
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
  const [activeTab, setActiveTab] = useState<TabId>('cockpit');
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
    const interval = setInterval(refreshState, 10_000); // 10s poll

    window.electronAPI.onTrackerStateUpdate((state) => {
      setTrackerState((prev: any) => ({ ...prev, ...state }));
    });

    return () => clearInterval(interval);
  }, [refreshState]);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0 س 0 د';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} س ${m} د`;
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'cockpit':
        return 'لوحة النشاط والمراقبة المباشرة';
      case 'tasks':
        return 'المهام اليومية ومعدل الإنجاز';
      case 'apps':
        return 'سجل استخدام البرامج ومواقع الويب';
      case 'attendance':
        return 'مطابقة الحضور والانصراف الذكية';
      case 'system':
        return 'حالة الجهاز والاتصال السحابي';
      default:
        return 'النشاط المباشر';
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
        {/* Top Control Bar */}
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>{getTabTitle()}</h1>
            <div style={styles.breadcrumb}>
              منصة MaxP للمراقبة المؤسسية &rsaquo; {getTabTitle()}
            </div>
          </div>

          <div style={styles.enforcedChip}>
            <span style={styles.greenDot} />
            <span>المراقبة مفعلة تلقائياً</span>
          </div>
        </header>

        {/* Content Container */}
        <div style={styles.contentArea}>
          {activeTab === 'cockpit' && (
            <CockpitTab
              trackerState={trackerState}
              dailySummary={dailySummary}
              formatTime={formatTime}
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
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
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
  breadcrumb: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  enforcedChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#22c55e',
    fontWeight: 600,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
  },
  contentArea: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
  },
};

export default DashboardPage;
