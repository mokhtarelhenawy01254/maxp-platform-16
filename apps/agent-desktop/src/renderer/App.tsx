import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { LoginPage } from './pages/LoginPage';
import { AgentCockpitPage } from './pages/AgentCockpitPage';

declare global {
  interface Window {
    electronAPI: {
      login: (data: { email: string; password: string; serverUrl: string }) => Promise<{ success: boolean; user?: any; error?: string }>;
      logout: () => Promise<boolean>;
      getAuthState: () => Promise<{ isLoggedIn: boolean; user: any; serverUrl: string }>;
      getAuthToken: () => Promise<{ token: string }>;
      getAgents: () => Promise<{ success: boolean; agents: any[] }>;
      getProducts: () => Promise<{ success: boolean; products: any[] }>;
      sendAgentMessage: (data: { agentSlug: string; agentId?: string; message: string; product?: any; productId?: string; screenContext?: string }) => Promise<{ success: boolean; text: string; card?: any; telemetry?: any }>;
      triggerAction: (actionData: { action: string; payload: any }) => Promise<{ success: boolean; result?: any; message?: string }>;
      captureScreen: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
      getActiveWindow: () => Promise<{ success: boolean; title?: string; owner?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      windowMinimize: () => Promise<boolean>;
      windowToggleMaximize: () => Promise<boolean>;
      windowClose: () => Promise<boolean>;
      windowIsMaximized: () => Promise<boolean>;
      checkForUpdates: () => Promise<any>;
      quitAndInstallUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (data: any) => void) => (() => void);
    };
  }
}

export const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (window.electronAPI?.getAuthState) {
        const authState = await window.electronAPI.getAuthState();
        setIsLoggedIn(authState.isLoggedIn);
        setUser(authState.user);
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string, serverUrl: string) => {
    if (!window.electronAPI?.login) {
      return { success: false, error: 'Electron API غير مهيأ' };
    }
    const res = await window.electronAPI.login({ email, password, serverUrl });
    if (res.success) {
      setIsLoggedIn(true);
      setUser(res.user);
    }
    return res;
  };

  const handleLogout = async () => {
    if (window.electronAPI?.logout) {
      await window.electronAPI.logout();
    }
    setIsLoggedIn(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">جاري تهيئة MaxP Agent Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Frameless Top Window Bar */}
      <TitleBar storeName={user?.companyName || 'متجر سوان'} isLoggedIn={isLoggedIn} />

      {/* Main Workspace Surface */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isLoggedIn ? (
          <AgentCockpitPage user={user} onLogout={handleLogout} />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
};
export default App;
