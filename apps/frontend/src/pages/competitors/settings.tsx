import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
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
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await apiClient.put('/competitors/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { console.error('Failed to save settings'); }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-1 ltr:left-1 rtl:right-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'ltr:translate-x-6 rtl:-translate-x-6' : ''}`} />
    </button>
  );

  return (
    <div className="p-6" dir={i18n.dir()}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/competitors')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {i18n.dir() === 'rtl' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold">{t('competitors.settings')}</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} />
            {t('competitors.notifications')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('competitors.emailAlerts')}</div>
                <div className="text-sm text-gray-500">{t('competitors.emailAlertsDesc')}</div>
              </div>
              <Toggle enabled={settings.emailAlerts} onChange={v => setSettings(s => ({ ...s, emailAlerts: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('competitors.dashboardAlerts')}</div>
                <div className="text-sm text-gray-500">{t('competitors.dashboardAlertsDesc')}</div>
              </div>
              <Toggle enabled={settings.dashboardAlerts} onChange={v => setSettings(s => ({ ...s, dashboardAlerts: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('competitors.weeklyDigest')}</div>
                <div className="text-sm text-gray-500">{t('competitors.weeklyDigestDesc')}</div>
              </div>
              <Toggle enabled={settings.weeklyDigest} onChange={v => setSettings(s => ({ ...s, weeklyDigest: v }))} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            {t('competitors.priceAlerts')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('competitors.newProductAlerts')}</div>
                <div className="text-sm text-gray-500">{t('competitors.newProductAlertsDesc')}</div>
              </div>
              <Toggle enabled={settings.newProductAlerts} onChange={v => setSettings(s => ({ ...s, newProductAlerts: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('competitors.priceChangeAlerts')}</div>
                <div className="text-sm text-gray-500">{t('competitors.priceChangeAlertsDesc')}</div>
              </div>
              <Toggle enabled={settings.priceChangeThreshold > 0} onChange={v => setSettings(s => ({ ...s, priceChangeThreshold: v ? 10 : 0 }))} />
            </div>

            {settings.priceChangeThreshold > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('competitors.priceChangeThreshold')}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.priceChangeThreshold}
                    onChange={e => setSettings(s => ({ ...s, priceChangeThreshold: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-20">{settings.priceChangeThreshold}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} />
            {t('competitors.adMonitoring')}
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t('competitors.adChangeAlerts')}</div>
              <div className="text-sm text-gray-500">{t('competitors.adChangeAlertsDesc')}</div>
            </div>
            <Toggle enabled={settings.adChangeAlerts} onChange={v => setSettings(s => ({ ...s, adChangeAlerts: v }))} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle size={16} />
              {t('common.saved')}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;