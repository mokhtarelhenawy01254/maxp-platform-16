import React, { useEffect, useState } from 'react';
import {
  RotateCw,
  Warehouse,
  Coins,
  Percent,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  ManufacturingSettings,
  WarehouseOption,
  AccountOption,
} from '../manufacturingApi';
import { SettingsGlMappingCard } from './components/SettingsGlMappingCard';

export const ManufacturingSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ManufacturingSettings | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsRes, warehousesRes, accountsRes] = await Promise.all([
        manufacturingApi.getSettings().catch(() => null),
        manufacturingApi.getWarehouses().catch(() => []),
        manufacturingApi.getAccounts().catch(() => []),
      ]);

      setSettings(
        settingsRes || {
          companyId: '',
          defaultSourceWarehouseId: null,
          defaultTargetWarehouseId: null,
          defaultOverheadRatePerPiece: 5.0,
          defaultWasteMarginPercent: 2.5,
          wipAccountId: null,
          rawMaterialsAccountId: null,
          accruedWagesAccountId: null,
          overheadAppliedAccountId: null,
          finishedGoodsAccountId: null,
          autoPostingEnabled: true,
        }
      );
      setWarehouses(warehousesRes);
      setAccounts(accountsRes);
    } catch (err: any) {
      console.error('Failed to load manufacturing settings', err);
      setError('تعذر تحميل إعدادات التصنيع من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      const updated = await manufacturingApi.updateSettings({
        defaultSourceWarehouseId: settings.defaultSourceWarehouseId || null,
        defaultTargetWarehouseId: settings.defaultTargetWarehouseId || null,
        defaultOverheadRatePerPiece: Number(settings.defaultOverheadRatePerPiece || 0),
        defaultWasteMarginPercent: Number(settings.defaultWasteMarginPercent || 0),
        wipAccountId: settings.wipAccountId || null,
        rawMaterialsAccountId: settings.rawMaterialsAccountId || null,
        accruedWagesAccountId: settings.accruedWagesAccountId || null,
        overheadAppliedAccountId: settings.overheadAppliedAccountId || null,
        finishedGoodsAccountId: settings.finishedGoodsAccountId || null,
        autoPostingEnabled: Boolean(settings.autoPostingEnabled),
      });
      setSettings(updated);
      setSuccessMessage('تم حفظ إعدادات التصنيع والتوجيه المحاسبي بنجاح.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16" dir="rtl">
      <ManufacturingHeader
        activeTab="settings"
        actions={
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving || !settings}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>جارٍ الحفظ...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>حفظ الإعدادات</span>
              </>
            )}
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RotateCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">جارٍ تحميل إعدادات التصنيع ومستودعات المنشأة...</p>
          </div>
        ) : settings ? (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. Auto-Posting Switch Card */}
            <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-foreground">
                    محرك الترحيل المحاسبي الآلي للتصنيع (Auto-Posting Engine)
                  </h3>
                  {settings.autoPostingEnabled ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      مفعّل تلقائياً
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                      معطل (يدوي)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  عند التفعيل، يقوم النظام تلقائياً بإنشاء وترحيل قيود يومية متوازنة في دفتر الأستاذ العام عند:
                  صرف الخامات للمصنع (من 110401 إلى 110402)، استحقاق أجور العمالة المباشرة (من 110402 إلى 210201)،
                  تحميل الأعباء غير المباشرة (من 110402 إلى 5103)، واستلام الإنتاج التام بالمستودع (من 110403 إلى 110402).
                </p>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>في حال التعطيل، ستظل الحركات المخزنية تُسجل ولكن لن تنعكس في ميزان المراجعة إلا بعد ترحيل يدوي.</span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoPostingEnabled}
                  onChange={(e) => setSettings({ ...settings, autoPostingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* 2. Warehouses & Operational Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Warehouses Card */}
              <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/50">
                  <Warehouse className="w-4 h-4 text-primary" />
                  <span>المستودعات التشغيلية الافتراضية</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground">
                      مستودع الخامات الافتراضي (المصدر)
                    </label>
                    <select
                      value={settings.defaultSourceWarehouseId || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultSourceWarehouseId: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- اختر مستودع صرف الخامات --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.isDefault ? '(الافتراضي العام)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground">
                      مستودع الإنتاج التام الافتراضي (الهدف)
                    </label>
                    <select
                      value={settings.defaultTargetWarehouseId || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultTargetWarehouseId: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- اختر مستودع استلام التام --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.isDefault ? '(الافتراضي العام)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rates & Standard Defaults */}
              <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/50">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>المعدلات القياسية للتكاليف والهدر</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      <span>نسبة الهدر القياسية المسموحة (%)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={settings.defaultWasteMarginPercent}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultWasteMarginPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1 text-muted-foreground flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>معدل الأعباء الإضافية للقطعة MOH (ج.م)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={settings.defaultOverheadRatePerPiece}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultOverheadRatePerPiece: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">ج.م/قطعة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. GL Accounts Mapping */}
            <SettingsGlMappingCard
              settings={settings}
              accounts={accounts}
              onChange={(field, val) => setSettings({ ...settings, [field]: val })}
            />
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default ManufacturingSettingsPage;
