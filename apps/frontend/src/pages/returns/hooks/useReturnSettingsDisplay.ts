import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  returnService,
  ReviewDisplayConfig,
  ReturnSettingsData,
} from '../../../services/returnService';
import {
  getOrderStatusFields,
  getDisplayFields,
} from '../components/returnSettingsConstants';

export const useReturnSettingsDisplay = () => {
  const { t } = useTranslation();
  const ORDER_STATUS_FIELDS = useMemo(() => getOrderStatusFields(t), [t]);
  const DISPLAY_FIELDS = useMemo(() => getDisplayFields(t), [t]);
  const DEFAULT_DISPLAY_CONFIG = useMemo(
    () => ({
      showOrderColumn: true,
      showCustomerColumn: true,
      showCustomerRating: true,
      showCustomerSuccessScore: true,
      showCustomerPhone: true,
      showReasonColumn: true,
      showResponsiblePartyColumn: true,
      showStatusColumn: true,
      showReviewColumn: true,
      showDateColumn: true,
      showActionsColumn: true,
    }),
    []
  );

  const [displayConfig, setDisplayConfig] = useState<ReviewDisplayConfig>(DEFAULT_DISPLAY_CONFIG);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await returnService.getSettings();
      const data: ReturnSettingsData = res.data;
      if (data.reviewDisplayConfig) {
        setDisplayConfig({
          ...DEFAULT_DISPLAY_CONFIG,
          ...data.reviewDisplayConfig,
        });
      }
    } catch (error) {
      console.error('Failed to load display settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveDisplayConfig = async () => {
    setSaving(true);
    try {
      await returnService.updateSettings({
        reviewDisplayConfig: displayConfig,
      });
      toast.success(t('returns.k_92'));
    } catch (error) {
      toast.error(t('returns.k_93'));
    } finally {
      setSaving(false);
    }
  };

  const toggleDisplayField = (key: keyof ReviewDisplayConfig) => {
    setDisplayConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isOrderStatusVisible = (code: string) => {
    const arr = displayConfig.visibleOrderStatuses;
    return !arr || arr.includes(code);
  };

  const toggleOrderStatusField = (code: string) => {
    setDisplayConfig((prev) => {
      const arr = prev.visibleOrderStatuses || ORDER_STATUS_FIELDS.map((f) => f.code);
      if (arr.includes(code)) {
        return { ...prev, visibleOrderStatuses: arr.filter((c) => c !== code) };
      }
      return { ...prev, visibleOrderStatuses: [...arr, code] };
    });
  };

  return {
    displayConfig,
    setDisplayConfig,
    settingsLoading,
    saving,
    fetchSettings,
    handleSaveDisplayConfig,
    toggleDisplayField,
    isOrderStatusVisible,
    toggleOrderStatusField,
    ORDER_STATUS_FIELDS,
    DISPLAY_FIELDS,
  };
};
