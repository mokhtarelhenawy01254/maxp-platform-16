import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Landmark,
  Settings,
  FileText,
  RotateCcw,
  Check,
  ShieldCheck,
  Percent,
  Banknote,
  Loader2,
} from 'lucide-react';
import { storefrontSettingsService, type StorefrontSettings } from '../../services/storefrontSettingsService';
import { apiClient } from '../../services/apiClient';
import { CodDepositOrdersReport } from './CodDepositOrdersReport';

const CodDepositSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'orders'>('settings');

  const enabled = settings?.codDepositEnabled === true;
  const depositType = settings?.codDepositType || 'PERCENTAGE';
  const depositValue = settings?.codDepositValue ? Number(settings.codDepositValue) : 25;
  const minAmount = settings?.codDepositMinAmount ? Number(settings.codDepositMinAmount) : null;
  const maxAmount = settings?.codDepositMaxAmount ? Number(settings.codDepositMaxAmount) : null;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await storefrontSettingsService.getSettings();
        setSettings(response.data as StorefrontSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error(t('settings.k_1'));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [t]);

  const updateField = useCallback((key: string, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await apiClient.put('/api/v1/payment/cod-deposit/settings', {
        enabled: settings.codDepositEnabled,
        type: settings.codDepositType || 'PERCENTAGE',
        value: Number(settings.codDepositValue) || 25,
        minAmount: settings.codDepositMinAmount ? Number(settings.codDepositMinAmount) : null,
        maxAmount: settings.codDepositMaxAmount ? Number(settings.codDepositMaxAmount) : null,
      });
      if (response.data?.success) {
        toast.success(t('settings.k_2'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('settings.k_3'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12" dir="rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </span>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              {t('settings.k_44')}
            </h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold font-mono tabular-nums ${
              enabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              <ShieldCheck className="h-3 w-3" />
              {enabled ? 'مفعل' : 'معطل'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('settings.k_45')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-[0.98] ${
              activeTab === 'settings'
                ? 'bg-card text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{t('settings.title')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-[0.98] ${
              activeTab === 'orders'
                ? 'bg-card text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t('settings.k_46')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
          {/* Section 1: Enable/Disable Toggle */}
          <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <label htmlFor="cod-deposit-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                  {t('settings.k_4')}
                </label>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-muted text-muted-foreground">
                  Deposit Policy
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pr-8">
                {t('settings.k_47')}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                id="cod-deposit-toggle"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => updateField('codDepositEnabled', e.target.checked)}
              />
              <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          {enabled && (
            <>
              {/* Section 2: Deposit Type */}
              <div className="p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold text-foreground">{t('settings.k_5')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                    depositType === 'PERCENTAGE'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/70 bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}>
                    <input
                      type="radio"
                      name="depositType"
                      className="mt-0.5 text-primary focus:ring-0"
                      checked={depositType === 'PERCENTAGE'}
                      onChange={() => updateField('codDepositType', 'PERCENTAGE')}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <Percent className="w-3.5 h-3.5 text-primary" />
                        <span>{t('settings.k_6')}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{t('settings.k_7')}</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                    depositType === 'FIXED'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/70 bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}>
                    <input
                      type="radio"
                      name="depositType"
                      className="mt-0.5 text-primary focus:ring-0"
                      checked={depositType === 'FIXED'}
                      onChange={() => updateField('codDepositType', 'FIXED')}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <Banknote className="w-3.5 h-3.5 text-primary" />
                        <span>{t('settings.k_8')}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{t('settings.k_9')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 3: Deposit Value */}
              <div className="p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold text-foreground">
                  {depositType === 'PERCENTAGE' ? t('settings.k_10') : t('settings.k_11')}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    {depositType === 'PERCENTAGE' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={depositValue}
                          onChange={(e) => updateField('codDepositValue', Number(e.target.value))}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-primary min-w-[3.5rem] text-center bg-primary/10 py-1 rounded-md border border-primary/20 tabular-nums">
                          {depositValue}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="10"
                          step="10"
                          value={depositValue}
                          onChange={(e) => updateField('codDepositValue', Number(e.target.value))}
                          className="w-32 px-3 py-1.5 border border-border/80 rounded-md bg-background text-center font-mono tabular-nums text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">{t('settings.k_12')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('settings.k_48')}{' '}
                  {depositType === 'PERCENTAGE'
                    ? t('settings.k_13') + (500 * depositValue) / 100 + ' ' + t('settings.k_12')
                    : t('settings.k_13') + depositValue + ' ' + t('settings.k_12')}
                </p>
              </div>

              {/* Section 4: Min/Max Caps */}
              <div className="p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-bold text-foreground">{t('settings.k_14')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">{t('settings.k_15')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={minAmount ?? ''}
                        onChange={(e) => updateField('codDepositMinAmount', e.target.value ? Number(e.target.value) : null)}
                        placeholder={t('settings.k_16')}
                        className="w-full px-3 py-1.5 text-xs border border-border/80 rounded-md bg-background font-mono tabular-nums text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{t('settings.k_12')}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t('settings.k_17')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">{t('settings.k_18')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={maxAmount ?? ''}
                        onChange={(e) => updateField('codDepositMaxAmount', e.target.value ? Number(e.target.value) : null)}
                        placeholder={t('settings.k_19')}
                        className="w-full px-3 py-1.5 text-xs border border-border/80 rounded-md bg-background font-mono tabular-nums text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{t('settings.k_12')}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t('settings.k_20')}</p>
                  </div>
                </div>
              </div>

              {/* Section 5: Summary Box */}
              <div className="p-4 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
                <h4 className="font-bold text-xs text-foreground">{t('settings.k_21')}</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>{t('settings.k_22')}{enabled ? t('settings.k_23') : t('settings.k_24')}</li>
                  {enabled && (
                    <>
                      <li>
                        {t('settings.k_25')}
                        {depositType === 'PERCENTAGE'
                          ? t('settings.deposit_percentage_summary', { value: depositValue })
                          : t('settings.deposit_fixed_summary', { value: depositValue })}
                      </li>
                      {minAmount !== null && <li>{t('settings.k_26')}{minAmount} {t('settings.k_12')}</li>}
                      {maxAmount !== null && <li>{t('settings.k_27')}{maxAmount} {t('settings.k_12')}</li>}
                    </>
                  )}
                </ul>
              </div>

              {/* Section 6: Action Footer */}
              <div className="p-4 bg-card flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  COD Deposit System v2.1
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? t('settings.saving') : t('settings.k_28')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'orders' && <CodDepositOrdersReport />}
    </div>
  );
};

export default CodDepositSettings;
