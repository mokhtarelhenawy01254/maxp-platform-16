import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Truck,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import courierService from '../../../services/courierService';
import {
  getDefaultMarketplaceAppSettings,
  normalizeMarketplaceAppSettings,
} from '../../../config/marketplaceAppSettings';
import {
  JsonRecord,
  setDeepValue,
  InstalledCompanyApp,
  ApiDataEnvelope,
} from '../../marketplace/types/appSettingsTypes';
import { InternalCourierFleetSettingsTab } from '../../marketplace/components/settings/InternalCourierFleetSettingsTab';

export const CourierFleetSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const slug = 'internal-courier-fleet';

  const [settings, setSettings] = useState<JsonRecord>(() =>
    getDefaultMarketplaceAppSettings(slug),
  );
  const [treasuryAccounts, setTreasuryAccounts] = useState<
    Array<{ id: string; name: string; type: string; balance: number }>
  >([]);
  const [companyApp, setCompanyApp] = useState<InstalledCompanyApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // Load treasury accounts and installed apps in parallel
      const [treasuryRes, appsRes] = await Promise.allSettled([
        courierService.getTreasuryAccounts(),
        apiClient.get<ApiDataEnvelope<InstalledCompanyApp[]>>('/my-apps'),
      ]);

      if (treasuryRes.status === 'fulfilled' && treasuryRes.value?.success && Array.isArray(treasuryRes.value.data)) {
        setTreasuryAccounts(treasuryRes.value.data);
      }

      if (appsRes.status === 'fulfilled') {
        const installedList = Array.isArray(appsRes.value.data?.data)
          ? appsRes.value.data.data
          : [];
        let matched = installedList.find(
          (entry: InstalledCompanyApp) => entry?.app?.slug === slug,
        );

        // Auto-provision installation if companyApp record is missing
        if (!matched) {
          try {
            const installRes = await apiClient.post(`/marketplace/apps/${slug}/install`, {});
            if (installRes?.data?.data) {
              matched = installRes.data.data;
            }
          } catch (installErr) {
            console.warn('[CourierFleetSettings] Auto-install attempt bypassed:', installErr);
          }
        }

        if (matched) {
          setCompanyApp(matched);
          setSettings(normalizeMarketplaceAppSettings(slug, matched.settings || {}));
        } else {
          setSettings(getDefaultMarketplaceAppSettings(slug));
        }
      } else {
        setSettings(getDefaultMarketplaceAppSettings(slug));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل إعدادات أسطول المناديب';
      console.error('[CourierFleetSettingsPage] Load error:', err);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateAtPath = (path: string, value: unknown) => {
    setSettings((prev) => {
      const current = prev || getDefaultMarketplaceAppSettings(slug);
      return setDeepValue(current, path.split('.'), value);
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const normalized = normalizeMarketplaceAppSettings(slug, settings);

      let targetAppId = companyApp?.id;

      // If companyApp record is not yet installed, install it first
      if (!targetAppId) {
        try {
          const installRes = await apiClient.post(`/marketplace/apps/${slug}/install`, {});
          if (installRes?.data?.data?.id) {
            targetAppId = installRes.data.data.id;
            setCompanyApp(installRes.data.data);
          }
        } catch (installErr: any) {
          console.warn('[CourierFleetSettings] Install on save note:', installErr);
        }
      }

      if (targetAppId) {
        await apiClient.put(`/my-apps/${targetAppId}/settings`, {
          settings: normalized,
        });
        setCompanyApp((curr) => (curr ? { ...curr, settings: normalized } : curr));
      }

      toast.success('تم حفظ إعدادات أسطول المناديب والتوصيل بنجاح');
    } catch (err: any) {
      console.error('[CourierFleetSettingsPage] Save error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'تعذر حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">جاري تحميل إعدادات أسطول المناديب...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => navigate('/shipping/couriers')}
              className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>أسطول المناديب</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span>إعدادات أسطول التوصيل</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                إعدادات أسطول التوصيل والمناديب
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                ضبط بادئة المانيفست، أمان روابط المناديب (PIN)، تسويات الخزينة، وسياسات التسليم الميداني.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            type="button"
            onClick={loadData}
            disabled={saving}
            className="p-2.5 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
            title="إعادة تحميل"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-xs hover:bg-primary/90 active:scale-97 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ الإعدادات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-200"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <InternalCourierFleetSettingsTab
        normalizedSettings={settings}
        treasuryAccounts={treasuryAccounts}
        updateAtPath={updateAtPath}
        navigate={navigate}
      />

      {/* Bottom Sticky Save Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>يتم تطبيق التغييرات فوراً على المناديب وكشوف المانيفست الجديدة</span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-xs hover:bg-primary/90 active:scale-97 transition cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CourierFleetSettingsPage;
