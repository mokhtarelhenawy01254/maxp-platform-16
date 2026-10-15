import React, { useEffect, useState } from 'react';
import {
  RotateCw,
  ListFilter,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, AccountingSettings, Account, UnpostedEntry } from './accountingApi';

export const AccountingSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [unposted, setUnposted] = useState<UnpostedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsRes, accountsRes, unpostedRes] = await Promise.all([
        accountingApi.getSettings().catch(() => null),
        accountingApi.getChartOfAccounts().catch(() => []),
        accountingApi.listUnpostedQueue().catch(() => []),
      ]);
      setSettings(settingsRes);
      setAccounts(Array.isArray(accountsRes) ? accountsRes.filter((a) => a.isPostable) : []);
      setUnposted(Array.isArray(unpostedRes) ? unpostedRes : []);
    } catch (err: any) {
      console.error('Failed to load accounting settings', err);
      setError('تعذر تحميل بعض إعدادات النظام المحاسبي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await accountingApi.updateSettings(settings);
      alert('تم حفظ إعدادات النظام المحاسبي بنجاح');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRetrySingle = async (id: string) => {
    try {
      setRetryingId(id);
      await accountingApi.retryUnpostedEntry(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.retryAllUnposted();
      alert(`تمت معالجة ${res.processed} حركة بنجاح من إجمالي ${res.total}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="إعدادات المحاسبة والترحيل التلقائي"
        actions={
          <button
            onClick={handleSaveSettings}
            disabled={saving || !settings}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadData}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Auto-Posting Switch Card */}
        {settings && (
          <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>محرك الترحيل التلقائي للقيود (Auto-Posting Engine)</span>
                {settings.autoPostingEnabled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    نشط ومفعّل
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                    متوقف
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                عند التفعيل، يقوم النظام تلقائياً بإنشاء وترحيل قيود يومية متوازنة لحظة إتمام فواتير المبيعات، تسجيل المصروفات، سداد الموردين، وإيداعات رأس المال.
              </p>
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
        )}

        {/* Default Accounts Configuration */}
        {settings && (
          <form onSubmit={handleSaveSettings} className="p-6 rounded-xl bg-card border border-border/70 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border/60">
              الحسابات الافتراضية للتوجيه المحاسبي الآلي
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب الخزينة / النقدية الرئيسي (110101)</label>
                <select
                  value={settings.defaultCashAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultCashAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (110101) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب العملاء والمدينون (110301)</label>
                <select
                  value={settings.defaultArAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultArAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (110301) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب الموردون والدائنون (210101)</label>
                <select
                  value={settings.defaultApAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultApAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (210101) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب إيرادات المبيعات (4101)</label>
                <select
                  value={settings.defaultSalesAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultSalesAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (4101) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب ضريبة القيمة المضافة مخرجات - مبيعات (210202)</label>
                <select
                  value={settings.defaultVatOutputAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultVatOutputAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (210202) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">حساب ضريبة القيمة المضافة مدخلات - مشتريات (110502)</label>
                <select
                  value={settings.defaultVatInputAccountId || ''}
                  onChange={(e) => setSettings({ ...settings, defaultVatInputAccountId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- افتراضي (110502) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        )}

        {/* Unposted Queue Section */}
        <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/60 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-amber-500" />
                <span>قائمة العمليات المعلقة ومؤجلة الترحيل ({unposted.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                حركات أصلية تمت بنجاح تشغيلياً ولكن تأجل قيدها المحاسبي لوقوعها في فترة مقفلة.
              </p>
            </div>

            {unposted.filter((u) => u.status === 'PENDING').length > 0 && (
              <button
                onClick={handleRetryAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>إعادة ترحيل الكل الآن</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">نوع المستند</th>
                  <th className="py-2.5 px-4 font-semibold">رقم المستند</th>
                  <th className="py-2.5 px-4 font-semibold">التاريخ</th>
                  <th className="py-2.5 px-4 font-semibold text-left">المبلغ</th>
                  <th className="py-2.5 px-4 font-semibold">سبب التأجيل</th>
                  <th className="py-2.5 px-4 font-semibold">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {unposted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      لا توجد عمليات مؤجلة في قائمة الانتظار (جميع الحركات مرحلة بالكامل).
                    </td>
                  </tr>
                ) : (
                  unposted.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-foreground">{u.sourceType}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">{u.documentNo || u.sourceId}</td>
                      <td className="py-2.5 px-4 tabular-nums font-mono text-muted-foreground">{new Date(u.date).toLocaleDateString('ar-EG')}</td>
                      <td className="py-2.5 px-4 text-left font-mono font-bold tabular-nums text-foreground">{formatEGP(u.amount)} ج.م</td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">{u.reason}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            u.status === 'PROCESSED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {u.status === 'PROCESSED' ? 'تم الترحيل' : 'معلّق'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-left">
                        {u.status === 'PENDING' && (
                          <button
                            onClick={() => handleRetrySingle(u.id)}
                            disabled={retryingId === u.id}
                            className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition"
                          >
                            {retryingId === u.id ? 'جارٍ...' : 'إعادة الترحيل'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingSettingsPage;
