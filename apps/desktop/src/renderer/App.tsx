import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Type declarations for the Electron API bridge
declare global {
  interface Window {
    electronAPI: {
      getTrackerState: () => Promise<any>;
      toggleTracking: () => Promise<boolean>;
      pauseTracking: (reason?: string) => Promise<void>;
      resumeTracking: () => Promise<void>;
      getDailySummary: () => Promise<any>;
      getAppsSummary: () => Promise<{ appName: string; durationSeconds: number; category: string }[]>;
      getWebsitesSummary: () => Promise<{ domain: string; durationSeconds: number; category: string }[]>;
      getSystemInfo: () => Promise<any>;
      syncNow: () => Promise<{ success: boolean; error?: string }>;
      getAttendanceAudit: () => Promise<any>;
      login: (data: { email: string; password: string; serverUrl: string }) => Promise<{ success: boolean; user?: any; error?: string }>;
      logout: () => Promise<boolean>;
      getAuthState: () => Promise<{ isLoggedIn: boolean; user: any; serverUrl: string }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: Record<string, any>) => Promise<boolean>;
      getTasks: (type?: 'my-tasks' | 'assigned-by-me') => Promise<{ success: boolean; tasks: any[]; error?: string }>;
      getCompanyUsers: () => Promise<{ success: boolean; users: any[]; error?: string }>;
      createTask: (taskData: any) => Promise<{ success: boolean; task?: any; error?: string }>;
      updateTaskStatus: (taskId: string, status: string) => Promise<{ success: boolean; task?: any; error?: string }>;
      uploadTaskAttachment: (data: {
        taskId: string;
        base64Data: string;
        originalName: string;
        mimeType?: string;
      }) => Promise<{ success: boolean; attachment?: any; error?: string }>;
      captureDesktopSnippet: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
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
    };
  }
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
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
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#71717a',
        fontSize: 14,
      }}>
        {'جاري التحميل…'}
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
