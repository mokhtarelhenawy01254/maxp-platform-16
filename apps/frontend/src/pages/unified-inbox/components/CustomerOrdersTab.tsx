import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerProfile } from '../types/unifiedInboxTypes';

interface CustomerOrdersTabProps {
  customerProfile: CustomerProfile | null;
  contactId?: string;
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({
  customerProfile,
  contactId,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  if (!customerProfile?.recentOrders || customerProfile.recentOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4">
      <div
        className="p-4 border rounded-[20px] bg-transparent"
        style={{
          borderColor:
            'var(--business-muted-line, var(--business-card-border))',
        }}
      >
        <h4
          className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
            isRtl ? 'text-right' : 'text-left'
          }`}
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {t('unifiedInbox.customer.recentOrders', 'الطلبات الأخيرة')}
          <span className="opacity-60 ml-1 tabular-nums font-mono">
            ({customerProfile.totalOrders})
          </span>
        </h4>
        <div className="space-y-2">
          {customerProfile.recentOrders.map((order) => (
            <button
              type="button"
              key={order.id}
              onClick={() =>
                window.open(
                  `/orders/${encodeURIComponent(String(order.id))}`,
                  '_blank',
                )
              }
              className="business-profile-item-card w-full flex items-center justify-between rounded-lg p-2.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
              style={{
                background:
                  'color-mix(in srgb, var(--color-foreground) 5%, var(--color-background))',
                border: '1px solid var(--business-card-border)',
              }}
              title={t('unifiedInbox.viewOrder', 'عرض الطلب')}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="text-xs font-medium tabular-nums font-mono"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  #{order.orderNumber}
                </div>
                <div
                  className="text-[10px] tabular-nums font-mono"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {new Date(order.createdAt).toLocaleDateString(
                    i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                  )}
                  {order._count?.items > 0 && <span className="mx-1">·</span>}
                  {order._count?.items > 0 && (
                    <span>
                      {order._count.items}{' '}
                      {t('unifiedInbox.products', 'منتجات')}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`${isRtl ? 'text-right' : 'text-right'} ml-3 flex-shrink-0`}
              >
                <div
                  className="text-xs font-semibold tabular-nums font-mono"
                  style={{ color: 'var(--business-success)' }}
                >
                  {new Intl.NumberFormat(i18n.language, {
                    style: 'currency',
                    currency: 'EGP',
                    maximumFractionDigits: 0,
                  }).format(Number(order.total))}
                </div>
                <div
                  className="text-[10px]"
                  style={{
                    color:
                      order.status === 'completed' ||
                      order.status === 'DELIVERED' ||
                      order.status === 'SHIPPED'
                        ? 'var(--business-success)'
                        : order.status === 'CANCELLED' ||
                            order.status === 'REFUNDED'
                          ? 'var(--business-danger, #ef4444)'
                          : 'var(--business-warning)',
                  }}
                >
                  {order.status === 'completed' || order.status === 'DELIVERED'
                    ? t('unifiedInbox.customer.orderStatus.completed', 'مكتمل')
                    : order.status === 'pending'
                      ? t('unifiedInbox.customer.orderStatus.pending', 'قيد الانتظار')
                      : order.status === 'CANCELLED'
                        ? t('unifiedInbox.customer.orderStatus.cancelled', 'ملغي')
                        : order.status}
                </div>
              </div>
            </button>
          ))}
        </div>
        {customerProfile.totalOrders >
          customerProfile.recentOrders.length && (
          <button
            type="button"
            onClick={() =>
              window.open(
                `/orders?customerId=${encodeURIComponent(contactId || '')}`,
                '_blank',
              )
            }
            className="mt-2 w-full text-xs font-medium py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--color-primary)',
              background:
                'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            }}
          >
            {t('unifiedInbox.viewAllOrders', 'عرض كل الطلبات')}
          </button>
        )}
      </div>
    </div>
  );
};
