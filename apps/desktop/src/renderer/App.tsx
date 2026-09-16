import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Type declarations for the Electron API bridge
declare global {
  interface Window {
    electronAPI: {
      getTrackerState: () => Promise<any>;
      toggleTracking: () => Promise<boolean>;
      pauseTracking: () => Promise<void>;
      resumeTracking: () => Promise<void>;
      getDailySummary: () => Promise<any>;
      login: (data: { email: string; password: string; serverUrl: string }) => Promise<{ success: boolean; user?: any; error?: string }>;
      logout: () => Promise<boolean>;
      getAuthState: () => Promise<{ isLoggedIn: boolean; user: any; serverUrl: string }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: Record<string, any>) => Promise<boolean>;
      onTrackerStateUpdate: (callback: (state: any) => void) => void;
      onNotification: (callback: (data: any) => void) => void;
      onTaskAssigned: (callback: (task: any) => void) => void;
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
        Loading\u2026
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
