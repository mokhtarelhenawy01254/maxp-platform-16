import { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api';
import { tToast } from '../../../utils/i18n-toast';
import { DEFAULT_SETTINGS } from './constants';
import type { DuplicateOrderSettingsData } from './types';

export function useDuplicateOrderSettingsController() {
  const [settings, setSettings] = useState<DuplicateOrderSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response =
        (await apiClient.get('/order-settings/duplicates').catch(() => null)) ||
        (await apiClient.get('/order-settings'));

      if (response?.data?.success) {
        const raw = response.data.data?.duplicateSettings || response.data.data || {};

        const criterion = ['phone', 'phone_amount', 'phone_products'].includes(raw.criterion)
          ? raw.criterion
          : raw.criteria === 'phone_items'
            ? 'phone_products'
            : ['phone', 'phone_amount'].includes(raw.criteria)
              ? raw.criteria
              : DEFAULT_SETTINGS.criterion;

        const windowMinutes =
          raw.windowMinutes !== undefined
            ? raw.windowMinutes === null || raw.windowMinutes === ''
              ? null
              : Number(raw.windowMinutes)
            : raw.windowEnabled === false || raw.windowMinutes === 0
              ? null
              : raw.windowMinutes
                ? Number(raw.windowMinutes)
                : null;

        const action = ['record_visible', 'record_hidden', 'block'].includes(raw.action)
          ? raw.action
          : raw.duplicateOrderAction === 'ignore'
            ? 'block'
            : raw.duplicateOrderAction === 'hidden'
              ? 'record_hidden'
              : DEFAULT_SETTINGS.action;

        const notifyTeam =
          raw.notifyTeam !== undefined
            ? Boolean(raw.notifyTeam)
            : raw.alertTeam !== undefined
              ? Boolean(raw.alertTeam)
              : DEFAULT_SETTINGS.notifyTeam;

        const compareStorefrontOrders =
          raw.compareStorefrontOrders !== undefined
            ? Boolean(raw.compareStorefrontOrders)
            : raw.includeStoreOrders !== undefined
              ? Boolean(raw.includeStoreOrders)
              : DEFAULT_SETTINGS.compareStorefrontOrders;

        const reportAs =
          raw.reportAs === 'cancelled' || raw.reportTreatment === 'cancelled'
            ? 'cancelled'
            : 'duplicate';

        const activeStatuses =
          Array.isArray(raw.activeStatuses) && raw.activeStatuses.length > 0
            ? raw.activeStatuses
            : DEFAULT_SETTINGS.activeStatuses;

        const excludedPhones = Array.isArray(raw.excludedPhones)
          ? raw.excludedPhones
          : Array.isArray(raw.exemptPhones)
            ? raw.exemptPhones
            : [];

        const merged: DuplicateOrderSettingsData = {
          enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : DEFAULT_SETTINGS.enabled,
          criterion,
          windowMinutes,
          action,
          notifyTeam,
          compareStorefrontOrders,
          reportAs,
          activeStatuses,
          excludedPhones,

          // Legacy fields for backward compatibility
          criteria: criterion,
          windowEnabled: windowMinutes !== null,
          alertTeam: notifyTeam,
          includeStoreOrders: compareStorefrontOrders,
          reportTreatment: reportAs === 'cancelled' ? 'cancelled' : 'separate',
          exemptPhones: excludedPhones,
        };

        setSettings(merged);
      }
    } catch (error) {
      console.error('Error fetching duplicate order settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handleStatusToggle = (statusCode: string) => {
    setSettings((prev) => {
      const exists = prev.activeStatuses.includes(statusCode);
      const nextStatuses = exists
        ? prev.activeStatuses.filter((s) => s !== statusCode)
        : [...prev.activeStatuses, statusCode];
      return { ...prev, activeStatuses: nextStatuses.length > 0 ? nextStatuses : [statusCode] };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const excludedPhones = Array.isArray(settings.excludedPhones)
        ? settings.excludedPhones
        : Array.isArray(settings.exemptPhones)
          ? settings.exemptPhones
          : [];

      const payload: DuplicateOrderSettingsData = {
        enabled: settings.enabled,
        criterion: settings.criterion,
        windowMinutes: settings.windowMinutes,
        action: settings.action,
        notifyTeam: settings.notifyTeam,
        compareStorefrontOrders: settings.compareStorefrontOrders,
        reportAs: settings.reportAs,
        activeStatuses: settings.activeStatuses,
        excludedPhones,

        // Legacy compatibility
        criteria: settings.criterion,
        windowEnabled: settings.windowMinutes !== null,
        alertTeam: settings.notifyTeam,
        includeStoreOrders: settings.compareStorefrontOrders,
        reportTreatment: settings.reportAs === 'cancelled' ? 'cancelled' : 'separate',
        exemptPhones: excludedPhones,
      };

      const res =
        (await apiClient.put('/order-settings/duplicates', payload).catch(async (err) => {
          if (err?.response?.status === 400) {
            throw err;
          }
          return apiClient.put('/order-settings', {
            duplicateSettings: payload,
            duplicateOrderAction:
              payload.action === 'block'
                ? 'ignore'
                : payload.action === 'record_hidden'
                  ? 'hidden'
                  : 'filter',
            duplicateOrderWindowMinutes: payload.windowMinutes,
          });
        })) || null;

      if (res?.data?.success) {
        tToast.success('DuplicateOrderSettings.success_save_eed8');
        setSettings(payload);
      }
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message || 'فشل حفظ الإعدادات، يرجى التحقق من صحة البيانات';
      tToast.error(errMsg);
      console.error('Error saving duplicate order settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    exemptPhonesText: (settings.excludedPhones || settings.exemptPhones || []).join('\n'),
    setExemptPhonesText: (text: string) => {
      const parsed = text
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      setSettings((s) => ({
        ...s,
        excludedPhones: parsed,
        exemptPhones: parsed,
      }));
    },
    loading,
    saving,
    fetchSettings,
    handleStatusToggle,
    handleSave,
  };
}
