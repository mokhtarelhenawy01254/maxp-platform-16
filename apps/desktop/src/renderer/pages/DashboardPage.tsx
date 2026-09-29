import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Play, Clock, CheckCircle2, Sparkles, LogOut, Calendar, Zap, Square } from 'lucide-react';
import Sidebar, { TabId } from '../components/Sidebar';
import CockpitTab from './CockpitTab';
import TasksTab from './TasksTab';
import GoalsTab from './GoalsTab';
import SimpleReportTab from './SimpleReportTab';
import AppsTimelineTab from './AppsTimelineTab';
import AttendanceAuditTab from './AttendanceAuditTab';
import SystemStatusTab from './SystemStatusTab';
import SettingsModal from '../components/SettingsModal';
import { BreakReasonModal } from '../components/BreakReasonModal';
import { ShiftHandoverModal } from '../components/ShiftHandoverModal';
import { OvertimeModal } from '../components/OvertimeModal';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const roleStr = String(user?.role || '').toUpperCase();
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleStr);

  // Real connectivity state (wired to browser online/offline events) — drives the Sidebar live indicator
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const [activeTab, setActiveTabState] = useState<TabId>(() => {
    try {
      if (window.location.hash.startsWith('#/tasks')) {
        return 'tasks';
      }
      const saved = (localStorage.getItem('maxp_active_tab') as TabId) || 'tasks';
      if (!isAdmin && (saved === 'attendance' || saved === 'system')) {
        return 'tasks';
      }
      return saved;
    } catch {
      return 'tasks';
    }
  });

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.startsWith('#/tasks')) {
        setActiveTabState('tasks');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [inactivityNotice, setInactivityNotice] = useState<{ elapsedHours: number; returnTime: string } | null>(null);
  const [clockInDisplay, setClockInDisplay] = useState<string | null>(null);
  const [updateBanner, setUpdateBanner] = useState<{
    stage: 'available' | 'downloading' | 'downloaded';
    version?: string;
    percent?: number;
  } | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((status: any) => {
      if (status.stage === 'available') {
        setUpdateBanner({ stage: 'available', version: status.version });
      } else if (status.stage === 'downloading') {
        setUpdateBanner({ stage: 'downloading', percent: status.percent, version: status.version });
      } else if (status.stage === 'downloaded') {
        setUpdateBanner({ stage: 'downloaded', version: status.version });
      } else if (status.stage === 'up-to-date' || status.stage === 'error') {
        setUpdateBanner((prev) => (prev?.stage === 'downloaded' ? prev : null));
      }
    });
    return () => unsub();
  }, []);

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
          const timeStr = new Date(audit.clockInTime).toLocaleTimeString('ar-EG-u-nu-latn', {
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
    if (isPaused) {
      setBreakLoading(true);
      try {
        await window.electronAPI.resumeTracking();
        await refreshState();
      } catch (err) {
        console.error('Resume error:', err);
      } finally {
        setBreakLoading(false);
      }
    } else {
      setShowBreakModal(true);
    }
  };

  const handleConfirmBreak = async (reason: string) => {
    setBreakLoading(true);
    try {
      await window.electronAPI.pauseTracking(reason);
      setShowBreakModal(false);
      await refreshState();
    } catch (err) {
      console.error('Break start error:', err);
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndShift = () => {
    setShowHandoverModal(true);
  };

  const confirmEndShift = async (data: { handoverNotes: string; pendingTasks: string }) => {
    setShiftLoading(true);
    try {
      await window.electronAPI.endShift(data);
      await refreshState();
    } catch (err) {
      console.error('End shift error:', err);
      throw err;
    } finally {
      setShiftLoading(false);
    }
  };

  const confirmStartOvertime = async (data: { reason: string; taskSummary?: string }) => {
    setShiftLoading(true);
    try {
      await window.electronAPI.startOvertime(data);
      await refreshState();
    } catch (err) {
      console.error('Start overtime error:', err);
      throw err;
    } finally {
      setShiftLoading(false);
    }
  };

  const handleEndOvertime = async () => {
    if (window.confirm('هل ترغب في إنهاء الوردية الإضافية (Overtime) وتوثيق الساعات؟')) {
      setShiftLoading(true);
      try {
        await window.electronAPI.endOvertime();
        await refreshState();
      } catch (err) {
        console.error('End overtime error:', err);
      } finally {
        setShiftLoading(false);
      }
    }
  };

  const handleStartShift = async () => {
    setShiftLoading(true);
    try {
      await window.electronAPI.startShift();
      await refreshState();
    } catch (err) {
      console.error('Start shift error:', err);
    } finally {
      setShiftLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 10_000); // 10s poll

    const unsubscribe = window.electronAPI.onTrackerStateUpdate((state) => {
      setTrackerState((prev: any) => ({ ...prev, ...state }));
    });

    const unsubRollover = window.electronAPI.onDayRollover?.((data) => {
      console.log('Day rollover received:', data);
      refreshState();
    });

    const unsubInactivity = window.electronAPI.onInactivityReturn?.((data: any) => {
      const hours = Math.round((data.elapsedSec / 3600) * 10) / 10;
      setInactivityNotice({
        elapsedHours: hours,
        returnTime: new Date(data.returnTime).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
      });
      refreshState();
    });

    return () => {
      clearInterval(interval);
      unsubscribe?.();
      unsubRollover?.();
      unsubInactivity?.();
    };
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
      case 'goals':
        return 'الأهداف ومؤشرات الأداء (OKRs)';
      case 'reports':
        return 'التقرير اليومي وملخص الإنتاجية';
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
        isOnline={isOnline}
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
                <Clock size={12} color="var(--accent-green)" />
                <span>حضور اليوم: {clockInDisplay}</span>
              </div>
            )}

            {trackerState?.isOvertime ? (
              <div style={styles.breakStatusGroup}>
                <div style={styles.overtimeActiveChip} title={`السبب: ${trackerState?.activeOvertimeSession?.reason || 'وردية إضافية'}`}>
                  <Zap size={13} color="#f97316" />
                  <span>وردية إضافية: {trackerState?.activeOvertimeSession?.reason || 'نشطة'}</span>
                </div>
                <button
                  onClick={handleEndOvertime}
                  disabled={shiftLoading}
                  style={styles.endOvertimeBtn}
                  title="إنهاء الوردية الإضافية وتوثيق الساعات"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Square size={12} color="#f97316" />
                  <span>إنهاء الإضافي</span>
                </button>
              </div>
            ) : trackerState?.shiftEnded ? (
              <div style={styles.breakStatusGroup}>
                <div style={styles.shiftEndedActiveChip} title="تم إنهاء وردية عمل اليوم وتسجيل الانصراف بنجاح">
                  <CheckCircle2 size={13} color="var(--accent-green)" />
                  <span>انتهت وردية اليوم</span>
                </div>
                <button
                  onClick={() => setShowOvertimeModal(true)}
                  disabled={shiftLoading}
                  style={styles.overtimeTriggerBtn}
                  title="بدء وردية عمل إضافية مع توثيق الساعات بشكل مستقل"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Zap size={13} color="#f97316" />
                  <span>وردية إضافية</span>
                </button>
                <button
                  onClick={handleStartShift}
                  disabled={shiftLoading}
                  style={styles.resumeWorkBtn}
                  title="بدء وردية أساسية جديدة"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Play size={13} fill="var(--accent-green)" color="var(--accent-green)" />
                  <span>بدء وردية جديدة</span>
                </button>
              </div>
            ) : isPaused ? (
              <div style={styles.breakStatusGroup}>
                <div style={styles.breakActiveChip} title={`السبب الموثق: ${trackerState?.breakReason || 'استراحة رسمية'}`}>
                  <Coffee size={13} color="var(--accent-yellow)" />
                  <span>استراحة: {trackerState?.breakReason || 'استراحة رسمية'}</span>
                </div>
                <button
                  onClick={handleToggleBreak}
                  disabled={breakLoading}
                  style={styles.resumeWorkBtn}
                  title="استئناف توثيق العمل والإنتاجية"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Play size={13} fill="var(--accent-green)" color="var(--accent-green)" />
                  <span>استئناف العمل</span>
                </button>
              </div>
            ) : (
              <div style={styles.breakStatusGroup}>
                <div style={styles.enforcedChip}>
                  <span style={styles.greenDot} />
                  <span>الوردية نشطة وموثقة</span>
                </div>
                <button
                  onClick={handleToggleBreak}
                  disabled={breakLoading}
                  style={styles.startBreakBtn}
                  title="بدء استراحة رسمية مسموحة (صلاة / غداء)"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Coffee size={13} color="var(--text-muted)" />
                  <span>استراحة</span>
                </button>
                <button
                  onClick={handleEndShift}
                  disabled={shiftLoading}
                  style={styles.endShiftBtn}
                  title="إنهاء وردية العمل الحالية وتسليم المهام"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <LogOut size={13} color="var(--accent-red)" />
                  <span>قفل الشيفت</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Inactivity Return Notice Banner */}
        {inactivityNotice && (
          <div style={styles.inactivityBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={15} color="var(--accent-blue)" />
              <span>
                مرحباً بعودتك! لاحظنا ابتعادك عن الجهاز لمدة {inactivityNotice.elapsedHours} ساعة. تم تدوير وحفظ إحصائيات الأمس بدقة وفصل عداد اليوم الجديد.
              </span>
            </div>
            <button
              onClick={() => setInactivityNotice(null)}
              style={styles.dismissNoticeBtn}
            >
              حسناً
            </button>
          </div>
        )}

        {/* Global Update Notification Banner */}
        {updateBanner && (
          <div
            style={{
              background:
                updateBanner.stage === 'downloaded'
                  ? 'rgba(34, 197, 94, 0.14)'
                  : 'rgba(56, 189, 248, 0.12)',
              borderBottom: `1px solid ${
                updateBanner.stage === 'downloaded'
                  ? 'var(--accent-green-border)'
                  : 'rgba(56, 189, 248, 0.25)'
              }`,
              padding: '7px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              animation: 'fadeIn 200ms ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {updateBanner.stage === 'downloaded' ? (
                <CheckCircle2 size={15} color="var(--accent-green)" />
              ) : (
                <Sparkles size={15} color="var(--accent-blue)" />
              )}
              <span
                style={{
                  color: updateBanner.stage === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-blue)',
                  fontWeight: 600,
                }}
              >
                {updateBanner.stage === 'downloaded'
                  ? `تم تنزيل التحديث الجديد v${updateBanner.version || ''} بنجاح! جاهز للتثبيت الفوري.`
                  : updateBanner.stage === 'downloading'
                  ? `جاري تنزيل التحديث v${updateBanner.version || ''} في الخلفية (${updateBanner.percent || 0}%)…`
                  : `يتوفر تحديث جديد v${updateBanner.version || ''}، جاري التنزيل تلقائياً في الخلفية…`}
              </span>
            </div>
            {updateBanner.stage === 'downloaded' && (
              <button
                onClick={() => window.electronAPI.quitAndInstallUpdate()}
                style={{
                  background: 'var(--accent-green)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 140ms ease-out',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                إعادة التشغيل والتثبيت الآن
              </button>
            )}
          </div>
        )}

        {/* Content Container */}
        <div style={styles.contentArea}>
          {activeTab === 'cockpit' && (
            <CockpitTab
              trackerState={trackerState}
              dailySummary={dailySummary}
              formatTime={formatTime}
              onToggleBreak={handleToggleBreak}
              onEndShift={handleEndShift}
              onStartShift={handleStartShift}
              user={user}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'tasks' && <TasksTab />}
          {activeTab === 'goals' && <GoalsTab />}
          {activeTab === 'reports' && <SimpleReportTab />}

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
      />

      {/* Break Reason & Duration Modal */}
      <BreakReasonModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onConfirm={handleConfirmBreak}
      />

      {/* Shift Handover Modal */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onConfirm={confirmEndShift}
        workingSeconds={trackerState?.todayActiveSeconds || 0}
        clockInTime={clockInDisplay}
      />

      {/* Overtime Modal */}
      <OvertimeModal
        isOpen={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onConfirm={confirmStartOvertime}
        deviceType={trackerState?.deviceType}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    background: 'var(--bg-page)',
    color: 'var(--text-primary)',
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
    background: 'var(--bg-page)',
  },
  topBar: {
    height: 58,
    minHeight: 58,
    borderBottom: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'var(--bg-topbar)',
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
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
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  enforcedChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  breakActiveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-yellow-bg)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--accent-yellow)',
    fontWeight: 600,
  },
  shiftEndedActiveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  startBreakBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  endShiftBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-red)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  overtimeActiveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(249, 115, 22, 0.12)',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#f97316',
    fontWeight: 600,
  },
  endOvertimeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(249, 115, 22, 0.1)',
    border: '1px solid rgba(249, 115, 22, 0.35)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#f97316',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  overtimeTriggerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(249, 115, 22, 0.1)',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#f97316',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  inactivityBanner: {
    background: 'rgba(56, 189, 248, 0.12)',
    borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'var(--accent-blue)',
    animation: 'fadeIn 200ms ease-out',
  },
  dismissNoticeBtn: {
    background: 'var(--accent-blue)',
    color: 'var(--text-inverse)',
    border: 'none',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  resumeWorkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 8,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green-dim)',
  },
  contentArea: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
  },
};

export default DashboardPage;
