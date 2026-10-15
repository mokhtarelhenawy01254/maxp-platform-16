import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, CreditCard, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export interface OrderDepositInfo {
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

export const CodDepositOrdersReport: React.FC = () => {
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (filter === 'paid') return o.isPaid;
    if (filter === 'unpaid') return !o.isPaid;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">{t('settings.k_29')}</h3>
        <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/70">
          {(['all', 'paid', 'unpaid'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f
                  ? 'bg-card text-foreground shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? t('settings.k_30') : f === 'paid' ? t('settings.k_31') : t('settings.k_32')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/70 rounded-2xl bg-card p-6">
          <Coins className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{t('settings.k_33')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_34')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_35')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_36')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_37')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_38')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_39')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('settings.k_40')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{o.orderNumber}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-foreground">{o.total} {t('settings.k_41')}</td>
                  <td className="px-4 py-3 font-mono tabular-nums font-semibold text-primary">
                    {o.depositAmount} {t('settings.k_41')}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{o.remainingAmount} {t('settings.k_41')}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-muted/40 text-foreground border border-border/60 font-medium">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      {o.method === 'kashier_card' ? t('settings.k_42') : o.method === 'manual_transfer' ? t('settings.k_43') : 'COD'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-medium">{o.orderStatus}</td>
                  <td className="px-4 py-3">
                    {o.isPaid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('settings.k_31')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                        <Clock className="h-3.5 w-3.5" />
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
