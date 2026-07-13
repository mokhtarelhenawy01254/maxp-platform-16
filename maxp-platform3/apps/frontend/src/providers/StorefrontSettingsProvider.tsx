import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  storefrontSettingsService,
  type StorefrontSettings,
} from "../services/storefrontSettingsService";

type StorefrontSettingsContextValue = {
  settings: StorefrontSettings | null;
  loading: boolean;
  saving: boolean;
  updateSetting: (key: keyof StorefrontSettings | string, value: any) => void;
  handleSave: () => Promise<void>;
  handleReset: () => Promise<void>;
  reload: () => Promise<void>;
};

const StorefrontSettingsContext =
  createContext<StorefrontSettingsContextValue | null>(null);

const useStorefrontSettingsController = (): StorefrontSettingsContextValue => {
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    try {
      setLoading(true);
      const response = await storefrontSettingsService.getSettings();
      setSettings(response?.data || null);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const updateSetting = (key: keyof StorefrontSettings | string, value: any) => {
    setSettings((current) => ({
      ...(current || ({} as StorefrontSettings)),
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const response = await storefrontSettingsService.updateSettings(settings);
      setSettings(response?.data || settings);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await storefrontSettingsService.resetSettings();
      setSettings(response?.data || null);
    } finally {
      setSaving(false);
    }
  };

  return useMemo(
    () => ({
      settings,
      loading,
      saving,
      updateSetting,
      handleSave,
      handleReset,
      reload,
    }),
    [loading, saving, settings],
  );
};

export const StorefrontSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useStorefrontSettingsController();
  return (
    <StorefrontSettingsContext.Provider value={value}>
      {children}
    </StorefrontSettingsContext.Provider>
  );
};

export const useStorefrontSettings = (): StorefrontSettingsContextValue => {
  const context = useContext(StorefrontSettingsContext);
  const fallback = useStorefrontSettingsController();
  return context || fallback;
};

export default StorefrontSettingsProvider;
