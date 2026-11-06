import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Trash2,
  Copy,
  Check,
  Power,
  X,
  Radio,
  ShoppingBag,
} from 'lucide-react';
import { shippingOpsService, StoreIntegrationItem } from '../../../services/shippingOpsService';

export const ShippingIntegrationsTab: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [integrations, setIntegrations] = useState<StoreIntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'WOOCOMMERCE',
    storeUrl: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shippingOpsService.getStoreIntegrations();
      setIntegrations(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تحميل التكاملات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeUrl) {
      setError(isEn ? 'Store URL is required' : 'رابط المتجر مطلوب');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await shippingOpsService.createStoreIntegration(formData);
      setSuccessMsg(isEn ? 'Integration added successfully' : 'تم إضافة تكامل المتجر بنجاح');
      setShowAddModal(false);
      setFormData({
        platform: 'WOOCOMMERCE',
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
      });
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل إضافة التكامل');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: StoreIntegrationItem) => {
    try {
      await shippingOpsService.updateStoreIntegration(item.id, { isActive: !item.isActive });
      setSuccessMsg(item.isActive ? (isEn ? 'Integration disabled' : 'تم تعطيل التكامل') : (isEn ? 'Integration activated' : 'تم تفعيل التكامل'));
      loadData();
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تغيير حالة التكامل');
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      setError(null);
      const res = await shippingOpsService.testStoreIntegration(id);
      if (res.success) {
        setSuccessMsg(res.message || (isEn ? 'Connection verified successfully!' : 'تم الاتصال بالمتجر واعتماد المفاتيح بنجاح!'));
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل اختبار الاتصال بالمتجر');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isEn ? 'Remove this integration?' : 'هل أنت متأكد من حذف هذا التكامل؟')) return;
    try {
      await shippingOpsService.deleteStoreIntegration(id);
      setSuccessMsg(isEn ? 'Integration removed' : 'تم حذف التكامل بنجاح');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل حذف التكامل');
    }
  };

  const copyWebhookUrl = (integrationId: string) => {
    const url = `${window.location.origin}/api/v1/webhooks/store/${integrationId}/order`;
    navigator.clipboard.writeText(url);
    setCopiedId(integrationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{isEn ? 'E-Commerce Integrations' : 'تكاملات المتاجر الخارجية (WooCommerce & Shopify)'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEn
              ? 'Receive orders directly from your online stores via Webhooks into the shipping pipeline (with idempotency).'
              : 'استقبال أوردرات متاجرك الخارجية تلقائياً عبر Webhooks مع تشفير المفاتيح ومنع التكرار (Idempotency).'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Store' : 'ربط متجر جديد'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400">
            {loading ? (isEn ? 'Loading stores...' : 'جاري تحميل المتاجر...') : (isEn ? 'No store integrations connected' : 'لا توجد متاجر مربوطة حالياً. اضغط "ربط متجر جديد" للبدء.')}
          </div>
        ) : (
          integrations.map((item) => {
            const isWoo = item.platform === 'WOOCOMMERCE';
            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-sm space-y-3 transition ${
                  item.isActive
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg font-bold text-xs ${
                        isWoo
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.platform}</span>
                      <span
                        className={`mr-2 px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.isActive ? (isEn ? 'Active' : 'نشط') : (isEn ? 'Inactive' : 'معطل')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        item.isActive
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'border-slate-300 text-slate-400 hover:bg-slate-100'
                      }`}
                      title={item.isActive ? 'تعطيل' : 'تفعيل'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600 transition"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-400">{isEn ? 'Store URL:' : 'رابط المتجر:'}</span>
                    <a
                      href={item.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{item.storeUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      <span>{isEn ? 'Credentials Encrypted (AES-256)' : 'المفاتيح مشفّرة بأمان'}</span>
                    </span>
                    <span>
                      {isEn ? 'Last Sync:' : 'آخر مزامنة:'}{' '}
                      <span className="font-mono text-slate-500">
                        {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString('ar-EG') : (isEn ? 'Never' : 'لم تتم بعد')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Webhook copy box */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {isEn ? 'Webhook URL (Copy to store settings):' : 'رابط الويب هوك (الصقه في إعدادات المتجر):'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/v1/webhooks/store/${item.id}/order`}
                      className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 select-all"
                    />
                    <button
                      onClick={() => copyWebhookUrl(item.id)}
                      className="px-2.5 py-1 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
                    </button>
                  </div>
                </div>

                {/* Test button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleTest(item.id)}
                    disabled={testingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition active:scale-95 disabled:opacity-50"
                  >
                    <Radio className={`w-3.5 h-3.5 ${testingId === item.id ? 'animate-pulse' : ''}`} />
                    <span>{testingId === item.id ? (isEn ? 'Testing...' : 'جاري الاختبار...') : (isEn ? 'Test Connection' : 'اختبار الاتصال')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Connect New Store' : 'ربط متجر إلكتروني جديد'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isEn ? 'Platform *' : 'المنصة *'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: 'WOOCOMMERCE' })}
                    className={`p-2.5 border rounded-lg text-xs font-bold text-center transition ${
                      formData.platform === 'WOOCOMMERCE'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 ring-1 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    WooCommerce
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: 'SHOPIFY' })}
                    className={`p-2.5 border rounded-lg text-xs font-bold text-center transition ${
                      formData.platform === 'SHOPIFY'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 ring-1 ring-emerald-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Shopify
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isEn ? 'Store URL *' : 'رابط المتجر *'}
                </label>
                <input
                  type="url"
                  required
                  value={formData.storeUrl}
                  onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                  placeholder="https://my-store.com"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                />
              </div>

              {formData.platform === 'WOOCOMMERCE' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Consumer Key (ck_...)
                    </label>
                    <input
                      type="password"
                      value={formData.consumerKey}
                      onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Consumer Secret (cs_...)
                    </label>
                    <input
                      type="password"
                      value={formData.consumerSecret}
                      onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Admin API Access Token (shpat_...)
                  </label>
                  <input
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {isEn
                  ? 'All sensitive credentials are encrypted with AES-256-GCM before saving into the database and are masked from responses.'
                  : 'تنويه أمان: يتم تشفير المفاتيح تلقائياً بمفتاح مشفر خاص ولن تظهر ثانية في واجهة المستخدم لحماية متجرك.'}
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Connect Store' : 'حفظ وربط المتجر')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShippingIntegrationsTab;
