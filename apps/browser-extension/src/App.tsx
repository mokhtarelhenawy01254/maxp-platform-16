import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { ChatList } from './components/ChatList';
import { ChatInput } from './components/ChatInput';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { chromeStorage, getActiveTabContext } from './services/chrome';
import { BUILTIN_AGENTS, sendAgentMessage } from './services/api';
import {
  ChatMessage,
  ExtensionAgent,
  ExtensionSettings,
  TabContext,
  UserSession,
} from './types/extension';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings>({
    serverUrl: 'https://maxp.online',
    selectedAgentSlug: 'store-manager-agent',
    includeTabContextByDefault: true,
  });
  const [currentAgent, setCurrentAgent] = useState<ExtensionAgent>(BUILTIN_AGENTS[0]);
  const [activeTab, setActiveTab] = useState<TabContext | null>(null);
  const [includeTabContext, setIncludeTabContext] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Initialize storage & tab context
  useEffect(() => {
    const init = async () => {
      const storedSettings = await chromeStorage.getSettings();
      const storedSession = await chromeStorage.getSession();
      const tab = await getActiveTabContext();

      setSettings(storedSettings);
      setSession(storedSession);
      setActiveTab(tab);
      setIncludeTabContext(storedSettings.includeTabContextByDefault);

      const matchedAgent =
        BUILTIN_AGENTS.find((a) => a.slug === storedSettings.selectedAgentSlug) ||
        BUILTIN_AGENTS[0];
      setCurrentAgent(matchedAgent);
      setIsReady(true);
    };

    init();
  }, []);

  const handleSendMessage = async (text: string, withContext: boolean) => {
    if (!text.trim() || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const attachedContext = withContext && activeTab ? activeTab : undefined;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      tabContext: attachedContext,
      status: 'success',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const reply = await sendAgentMessage(text, {
        agentSlug: currentAgent.slug,
        tabContext: attachedContext,
      });

      const assistantMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        status: 'success',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setSession(null);
        await chromeStorage.saveSession(null);
      }

      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          err.message === 'UNAUTHORIZED'
            ? 'انتهت صلاحية الجلسة، يُرجى تسجيل الدخول مجدداً.'
            : `حدث خطأ أثناء معالجة الطلب: ${err.message}`,
        timestamp: Date.now(),
        status: 'error',
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryMessage = (msg: ChatMessage) => {
    handleSendMessage(msg.content, !!msg.tabContext);
  };

  const handleSelectAgent = async (agent: ExtensionAgent) => {
    setCurrentAgent(agent);
    await chromeStorage.saveSettings({ selectedAgentSlug: agent.slug });
  };

  const handleSaveSettings = async (newSettings: Partial<ExtensionSettings>) => {
    await chromeStorage.saveSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (newSettings.selectedAgentSlug) {
      const agent = BUILTIN_AGENTS.find((a) => a.slug === newSettings.selectedAgentSlug);
      if (agent) setCurrentAgent(agent);
    }
  };

  const handleLogout = async () => {
    await chromeStorage.saveSession(null);
    setSession(null);
    setMessages([]);
    setIsSettingsOpen(false);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b] text-slate-400 text-xs font-mono">
        تحميل MaxP Copilot…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-slate-100 relative overflow-hidden font-sans">
      {!session ? (
        <LoginView
          serverUrl={settings.serverUrl}
          onLoginSuccess={(newSession) => setSession(newSession)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <>
          <Header
            currentAgent={currentAgent}
            isConnected={!!session}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectAgent={handleSelectAgent}
            availableAgents={BUILTIN_AGENTS}
          />

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                <QuickActions
                  onSelectPrompt={(p) => handleSendMessage(p, includeTabContext)}
                  activeTab={activeTab}
                  agentPrompts={currentAgent.suggestedPrompts}
                />
                <div className="p-3 text-center text-[10px] text-slate-500 font-mono">
                  {currentAgent.name} • {currentAgent.description}
                </div>
              </div>
            ) : (
              <ChatList
                messages={messages}
                isLoading={isLoading}
                onRetry={handleRetryMessage}
              />
            )}
          </main>

          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            activeTab={activeTab}
            includeTabContext={includeTabContext}
            onToggleTabContext={() => setIncludeTabContext(!includeTabContext)}
          />
        </>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        session={session}
        onLogout={handleLogout}
        availableAgents={BUILTIN_AGENTS}
      />
    </div>
  );
};
