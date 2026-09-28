import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TitleBar from './components/TitleBar';

// Type declarations for the Electron API bridge
declare global {
  interface Window {
    electronAPI: {
      getTrackerState: () => Promise<any>;
      toggleTracking: () => Promise<boolean>;
      pauseTracking: (reason?: string) => Promise<void>;
      resumeTracking: () => Promise<void>;
      endShift: () => Promise<{ success: boolean; error?: string; message?: string }>;
      startShift: () => Promise<{ success: boolean; error?: string }>;
      getDailySummary: (date?: string) => Promise<any>;
      getAppsSummary: (date?: string) => Promise<{ appName: string; durationSeconds: number; category: string }[]>;
      getWebsitesSummary: (date?: string) => Promise<{ domain: string; durationSeconds: number; category: string }[]>;
      getAllDailyStatsKeys: () => Promise<string[]>;
      getSystemInfo: () => Promise<any>;
      syncNow: () => Promise<{ success: boolean; error?: string }>;
      getAttendanceAudit: () => Promise<any>;
      login: (data: { email: string; password: string; serverUrl: string }) => Promise<{ success: boolean; user?: any; error?: string }>;
      logout: () => Promise<boolean>;
      getAuthState: () => Promise<{ isLoggedIn: boolean; user: any; serverUrl: string }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: Record<string, any>) => Promise<boolean>;
      getTasks: (type?: 'my-tasks' | 'assigned-by-me' | 'all') => Promise<{ success: boolean; tasks: any[]; fromCache?: boolean; isOffline?: boolean; error?: string }>;
      getCompanyUsers: () => Promise<{ success: boolean; users: any[]; error?: string }>;
      createTask: (taskData: any) => Promise<{ success: boolean; task?: any; error?: string }>;
      updateTask: (taskId: string, data: any) => Promise<{ success: boolean; task?: any; error?: string }>;
      updateTaskStatus: (taskId: string, status: string, revisionReason?: string) => Promise<{ success: boolean; task?: any; error?: string }>;
      getTaskActivities: (taskId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      startTaskTimer: (taskId: string) => Promise<{ success: boolean; entry?: any; error?: string }>;
      stopTaskTimer: (entryId: string) => Promise<{ success: boolean; result?: any; error?: string }>;
      getRunningTaskTimer: () => Promise<{ success: boolean; runningTimer?: any; runningTimers?: any[]; error?: string }>;
      getCompanyActiveTimers: () => Promise<{ success: boolean; activeTimers?: any[]; error?: string }>;
      getAuthToken: () => Promise<{ token: string }>;
      uploadTaskAttachment: (data: {
        taskId: string;
        base64Data: string;
        originalName: string;
        mimeType?: string;
      }) => Promise<{ success: boolean; attachment?: any; error?: string }>;
      fetchAttachment: (url: string) => Promise<{
        success: boolean;
        dataUrl?: string;
        contentType?: string;
        fileSize?: number;
        error?: string;
      }>;
      captureDesktopSnippet: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
      addWatcher: (taskId: string, userId: string) => Promise<{ success: boolean; result?: any; error?: string }>;
      removeWatcher: (taskId: string, userId: string) => Promise<{ success: boolean; result?: any; error?: string }>;
      // Task Dependencies
      getTaskDependencies: (taskId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      addTaskDependency: (taskId: string, dependsOnId: string, type: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      removeTaskDependency: (dependencyId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

      // Subtasks & Checklists
      getSubtasks: (parentTaskId: string) => Promise<{ success: boolean; subtasks: any[]; error?: string }>;
      createSubtask: (data: { parentTaskId: string; title: string; assignedTo?: string; priority?: string }) => Promise<{ success: boolean; subtask?: any; error?: string }>;
      getChecklists: (taskId: string) => Promise<{ success: boolean; checklists: any[]; error?: string }>;
      createChecklist: (taskId: string, title?: string) => Promise<{ success: boolean; checklist?: any; error?: string }>;
      addChecklistItem: (checklistId: string, text: string) => Promise<{ success: boolean; item?: any; error?: string }>;
      updateChecklistItem: (itemId: string, data: { isCompleted?: boolean; text?: string }) => Promise<{ success: boolean; item?: any; error?: string }>;
      deleteChecklistItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
      // Task Comments
      getTaskComments: (taskId: string) => Promise<{ success: boolean; comments: any[]; error?: string }>;
      addTaskComment: (taskId: string, content: string) => Promise<{ success: boolean; comment?: any; error?: string }>;
      updateTaskComment: (commentId: string, content: string) => Promise<{ success: boolean; comment?: any; error?: string }>;
      deleteTaskComment: (commentId: string) => Promise<{ success: boolean; data?: any; error?: string }>;

      // Goals (OKRs)
      getTodayGoals: (userId?: string) => Promise<{ success: boolean; goals: any[]; error?: string }>;
      ensureTodayGoals: (userId?: string) => Promise<{ success: boolean; goals: any[]; error?: string }>;
      getGoals: (params?: any) => Promise<{ success: boolean; goals: any[]; error?: string }>;
      createGoal: (goalData: any) => Promise<{ success: boolean; goal?: any; error?: string }>;
      updateGoalProgress: (goalId: string, current: number, notes?: string) => Promise<{ success: boolean; result?: any; error?: string }>;

      // Performance Report & Stats
      getTaskDashboardStats: () => Promise<{ success: boolean; stats: any; error?: string }>;

      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      windowMinimize: () => Promise<boolean>;
      windowToggleMaximize: () => Promise<boolean>;
      windowClose: () => Promise<boolean>;
      windowIsMaximized: () => Promise<boolean>;
      getDeviceInfo: () => Promise<{ hostname: string; platform: string; release: string; appVersion: string }>;
      checkForUpdates: () => Promise<{
        success: boolean;
        status: 'dev' | 'update-available' | 'up-to-date' | 'error';
        currentVersion: string;
        latestVersion?: string;
        message: string;
      }>;
      quitAndInstallUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (status: any) => void) => (() => void);
      onTrackerStateUpdate: (callback: (state: any) => void) => (() => void);
      onNotification: (callback: (data: any) => void) => (() => void);
      onTaskAssigned: (callback: (task: any) => void) => (() => void);
      onTasksRefresh: (callback: (data?: any) => void) => (() => void);
      onDayRollover: (callback: (data: any) => void) => (() => void);
      onInactivityReturn: (callback: (data: any) => void) => (() => void);
      onAuthLoggedOut?: (callback: () => void) => (() => void);
    };
  }
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const unsubAuth = window.electronAPI.onAuthLoggedOut?.(() => {
      setIsLoggedIn(false);
      setUser(null);
    });

    return () => {
      unsubAuth?.();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const authState = await window.electronAPI.getAuthState();
      setIsLoggedIn(authState.isLoggedIn);
      setUser(authState.user);
    } catch {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string, serverUrl: string) => {
    if (!window.electronAPI?.login) {
      return {
        success: false,
        error: 'جاري تهيئة واجهة الاتصال (Electron API Bridge)... يرجى المحاولة مرة أخرى',
      };
    }
    const result = await window.electronAPI.login({ email, password, serverUrl });
    if (result.success) {
      setIsLoggedIn(true);
      setUser(result.user);
    }
    return result;
  };

  const handleLogout = async () => {
    await window.electronAPI.logout();
    setIsLoggedIn(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TitleBar />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page)',
          color: 'var(--text-dim)',
          fontSize: 14,
        }}>
          {'جاري التحميل…'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!isLoggedIn ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <DashboardPage user={user} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
};

export default App;
