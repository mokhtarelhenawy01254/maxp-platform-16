import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { storefrontSettingsService, type StorefrontSettings } from '../../services/storefrontSettingsService';
import { apiClient } from '../../services/apiClient';

interface OrderDepositInfo {
  id: string;
  orderNumber: string;
  total: number;
  depositAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  method: string | null;
  paymentStatus: string;
  orderStatus: string;
}

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
  }, []);

  const updateField = useCallback((key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BanknotesIcon className="h-7 w-7 text-blue-500" />
          {t('settings.k_44')}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {t('settings.k_45')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Cog6ToothIcon className="h-4 w-4 inline ml-1" />
          {t('settings.title')}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DocumentMagnifyingGlassIcon className="h-4 w-4 inline ml-1" />
          {t('settings.k_46')}
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('settings.k_4')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('settings.k_47')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enabled}
                  onChange={e => updateField('codDepositEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>

          {enabled && (
            <>
              {/* Deposit Type */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">{t('settings.k_5')}</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="depositType"
                      className="accent-blue-600"
                      checked={depositType === 'PERCENTAGE'}
                      onChange={() => updateField('codDepositType', 'PERCENTAGE')}
                    />
                    <div>
                      <p className="font-medium">{t('settings.k_6')}</p>
                      <p className="text-sm text-gray-500">{t('settings.k_7')}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="depositType"
                      className="accent-blue-600"
                      checked={depositType === 'FIXED'}
                      onChange={() => updateField('codDepositType', 'FIXED')}
                    />
                    <div>
                      <p className="font-medium">{t('settings.k_8')}</p>
                      <p className="text-sm text-gray-500">{t('settings.k_9')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Deposit Value */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {depositType === 'PERCENTAGE' ? t('settings.k_10') : t('settings.k_11')}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-xs">
                    {depositType === 'PERCENTAGE' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={depositValue}
                          onChange={e => updateField('codDepositValue', Number(e.target.value))}
                          className="flex-1 accent-blue-600"
                        />
                        <span className="text-lg font-bold text-blue-600 min-w-[4rem] text-center">
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
                          onChange={e => updateField('codDepositValue', Number(e.target.value))}
                          className="w-32 px-3 py-2 border rounded-lg text-center"
                        />
                        <span className="text-gray-500">{t('settings.k_12')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {t('settings.k_48')} {depositType === 'PERCENTAGE' ? t('settings.k_13') + (500 * depositValue / 100) + t('settings.k_12') : t('settings.k_13') + depositValue + t('settings.k_12')}
                </p>
              </div>

              {/* Min/Max Caps */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">{t('settings.k_14')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings.k_15')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={minAmount ?? ''}
                        onChange={e => updateField('codDepositMinAmount', e.target.value ? Number(e.target.value) : null)}
                        placeholder={t('settings.k_16')}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <span className="text-gray-500">{t('settings.k_12')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('settings.k_17')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings.k_18')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={maxAmount ?? ''}
                        onChange={e => updateField('codDepositMaxAmount', e.target.value ? Number(e.target.value) : null)}
                        placeholder={t('settings.k_19')}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <span className="text-gray-500">{t('settings.k_12')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('settings.k_20')}</p>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">{t('settings.k_21')}</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>{t('settings.k_22')}{enabled ? t('settings.k_23') : t('settings.k_24')}</li>
                  {enabled && (
                    <>
                      <li>{t('settings.k_25')}{depositType === 'PERCENTAGE' ? t('settings.deposit_percentage_summary', { value: depositValue }) : t('settings.deposit_fixed_summary', { value: depositValue })}</li>
                      {minAmount !== null && <li>{t('settings.k_26')}{minAmount}{t('settings.k_12')}</li>}
                      {maxAmount !== null && <li>{t('settings.k_27')}{maxAmount}{t('settings.k_12')}</li>}
                    </>
                  )}
                </ul>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('settings.saving')}
                  </span>
                ) : (
                  t('settings.k_28')
                )}
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'orders' && <OrdersReport />}
    </div>
  );
};

/* ───────────── Orders Report Tab ───────────── */

const OrdersReport: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderDepositInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/orders-v2', {
        params: { paymentMethod: 'CASH', limit: 50, sort: '-createdAt' },
      });
      const list = res.data?.data || res.data?.orders || [];
      const depositInfo = await Promise.all(
        list.map(async (order: any) => {
          try {
            const statusRes = await apiClient.get(`/api/v1/payment/cod-deposit/status/${order.id}`);
            return statusRes.data?.data || null;
          } catch {
            return null;
          }
        })
      );
      setOrders(depositInfo.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (filter === 'paid') return o.isPaid;
    if (filter === 'unpaid') return !o.isPaid;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('settings.k_29')}</h3>
        <div className="flex gap-2">
          {(['all', 'paid', 'unpaid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? t('settings.k_30') : f === 'paid' ? t('settings.k_31') : t('settings.k_32')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>{t('settings.k_33')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-right">{t('settings.k_34')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_35')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_36')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_37')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_38')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_39')}</th>
                <th className="px-4 py-3 text-right">{t('settings.k_40')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.total}{t('settings.k_41')}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{o.depositAmount}{t('settings.k_41')}</td>
                  <td className="px-4 py-3">{o.remainingAmount}{t('settings.k_41')}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                      <CreditCardIcon className="h-3 w-3" />
                      {o.method === 'kashier_card' ? t('settings.k_42') : o.method === 'manual_transfer' ? t('settings.k_43') : 'COD'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{o.orderStatus}</td>
                  <td className="px-4 py-3">
                    {o.isPaid ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        {t('settings.k_31')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <ClockIcon className="h-4 w-4" />
                        {t('settings.k_49')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CodDepositSettings;
