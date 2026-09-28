import { TabContext, ExtensionSettings, UserSession } from '../types/extension';

const DEFAULT_SETTINGS: ExtensionSettings = {
  serverUrl: 'https://maxp.online',
  selectedAgentSlug: 'executive-assistant-agent',
  includeTabContextByDefault: true,
};

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const chromeStorage = {
  async getSettings(): Promise<ExtensionSettings> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['maxp_settings'], (result) => {
          resolve(result.maxp_settings || DEFAULT_SETTINGS);
        });
      });
    }
    const stored = localStorage.getItem('maxp_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  },

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ maxp_settings: updated }, () => resolve());
      });
    }
    localStorage.setItem('maxp_settings', JSON.stringify(updated));
  },

  async getSession(): Promise<UserSession | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['maxp_session'], (result) => {
          resolve(result.maxp_session || null);
        });
      });
    }
    const stored = localStorage.getItem('maxp_session');
    return stored ? JSON.parse(stored) : null;
  },

  async saveSession(session: UserSession | null): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ maxp_session: session }, () => resolve());
      });
    }
    if (session) {
      localStorage.setItem('maxp_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('maxp_session');
    }
  },
};

export const getActiveTabContext = async (): Promise<TabContext | null> => {
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab && activeTab.url && !activeTab.url.startsWith('chrome://')) {
        return {
          title: activeTab.title || 'صفحة بدون عنوان',
          url: activeTab.url,
          favIconUrl: activeTab.favIconUrl,
        };
      }
    } catch {
      // In case activeTab permission is not granted or restricted URL
    }
  }

  // Fallback for local web development
  if (typeof window !== 'undefined') {
    return {
      title: document.title || 'MaxP Workspace',
      url: window.location.href,
    };
  }

  return null;
};
