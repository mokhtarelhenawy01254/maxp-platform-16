import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, Mail, CheckCircle2, AlertTriangle, ShieldCheck, Sliders, Radio, Save } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import i18n from '../../i18n';

interface NotificationSettings {
  emailAlerts: boolean;
  dashboardAlerts: boolean;
  weeklyDigest: boolean;
  priceChangeThreshold: number;
  newProductAlerts: boolean;
  adChangeAlerts: boolean;
}

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    dashboardAlerts: true,
    weeklyDigest: true,
    priceChangeThreshold: 10,
    newProductAlerts: true,
    adChangeAlerts: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/competitors/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      console.error('Failed to save settings');
    }
    setIsSaving(false);
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        enabled ? 'bg-primary' : 'bg-muted/60 dark:bg-muted/40'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
          enabled ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/competitors')}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{t('competitors.settings')}</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  CONFIGURATION
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure price change thresholds, scraping frequencies, and alert delivery channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} />
                <span>{t('common.saved')}</span>
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
            >
              <Save size={14} />
              <span>{isSaving ? t('common.saving') : t('common.save')}</span>
            </button>
          </div>
        </div>

        {/* Settings Panels */}
        <div className="space-y-4">

          {/* Section 1: General Notification Routing */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Bell size={16} className="text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t('competitors.notifications')}
              </h2>
            </div>

            <div className="divide-y divide-border/50">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">{t('competitors.emailAlerts')}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.emailAlertsDesc')}</div>
                </div>
                <Toggle enabled={settings.emailAlerts} onChange={v => setSettings(s => ({ ...s, emailAlerts: v }))} />
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">{t('competitors.dashboardAlerts')}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.dashboardAlertsDesc')}</div>
                </div>
                <Toggle enabled={settings.dashboardAlerts} onChange={v => setSettings(s => ({ ...s, dashboardAlerts: v }))} />
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">{t('competitors.weeklyDigest')}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.weeklyDigestDesc')}</div>
                </div>
                <Toggle enabled={settings.weeklyDigest} onChange={v => setSettings(s => ({ ...s, weeklyDigest: v }))} />
              </div>
            </div>
          </div>

          {/* Section 2: Price Fluctuation Thresholds */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t('competitors.priceAlerts')}
              </h2>
            </div>

            <div className="divide-y divide-border/50">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">{t('competitors.newProductAlerts')}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.newProductAlertsDesc')}</div>
                </div>
                <Toggle enabled={settings.newProductAlerts} onChange={v => setSettings(s => ({ ...s, newProductAlerts: v }))} />
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">{t('competitors.priceChangeAlerts')}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.priceChangeAlertsDesc')}</div>
                </div>
                <Toggle
                  enabled={settings.priceChangeThreshold > 0}
                  onChange={v => setSettings(s => ({ ...s, priceChangeThreshold: v ? 10 : 0 }))}
                />
              </div>

              {settings.priceChangeThreshold > 0 && (
                <div className="pt-3 pb-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {t('competitors.priceChangeThreshold')}
                    </label>
                    <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      ±{settings.priceChangeThreshold}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={settings.priceChangeThreshold}
                      onChange={e => setSettings(s => ({ ...s, priceChangeThreshold: Number(e.target.value) }))}
                      className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Alert triggers only when a competitor alters pricing by at least this percentage.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Ad & Campaign Monitoring */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Mail size={16} className="text-sky-500" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t('competitors.adMonitoring')}
              </h2>
            </div>

            <div className="py-1 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">{t('competitors.adChangeAlerts')}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t('competitors.adChangeAlertsDesc')}</div>
              </div>
              <Toggle enabled={settings.adChangeAlerts} onChange={v => setSettings(s => ({ ...s, adChangeAlerts: v }))} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;