import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderAction, WorkspaceOrder } from './types';

interface WorkspaceInspectorProps {
  order: WorkspaceOrder | null;
  busyAction: OrderAction | undefined;
  onConfirm: (order: WorkspaceOrder) => void;
  onCancel: (order: WorkspaceOrder) => void;
  onLogCall: (order: WorkspaceOrder, result: string) => void;
  onOpenFollowUp: (order: WorkspaceOrder) => void;
  onOpenDetailsModal: (order: WorkspaceOrder) => void;
}

function buildWhatsAppUrl(order: WorkspaceOrder, isArabic: boolean): string {
  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
  if (!cleanPhone) return '#';
  const phone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

  const itemsList = order.items
    ?.map((i) => {
      const variant = [i.productColor, i.productSize].filter(Boolean).join(' - ');
      return `• ${i.productName || i.name} ${variant ? `(${variant})` : ''} × ${i.quantity}`;
    })
    .join('\n') || '';

  const message = isArabic
    ? `أهلاً بحضرتك أ/ ${order.customerName}،\nبخصوص طلبك رقم #${order.orderNumber}:\n${itemsList}\nالإجمالي: ${order.total} ج.م\nالعنوان: ${order.shippingAddress || [order.governorate, order.city].filter(Boolean).join('، ')}\nهل نعتمد الشحن اليوم؟`
    : `Hello ${order.customerName},\nRegarding your order #${order.orderNumber}:\n${itemsList}\nTotal: ${order.total}\nAddress: ${order.shippingAddress || [order.governorate, order.city].filter(Boolean).join(', ')}\nWould you like to confirm for shipment?`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const WorkspaceInspector: React.FC<WorkspaceInspectorProps> = ({
  order,
  busyAction,
  onConfirm,
  onCancel,
  onLogCall,
  onOpenFollowUp,
  onOpenDetailsModal,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-sm font-medium">
          {isArabic ? 'اختر طلباً من الطابور لبدء المراجعة والتنفيذ' : 'Select an order from the queue to inspect'}
        </p>
      </div>
    );
  }

  const isConfirmed = order.status === 'CONFIRMED';
  const isCancelled = order.status === 'CANCELLED';
  const isBusy = Boolean(busyAction);
  const waUrl = buildWhatsAppUrl(order, isArabic);
  const telUrl = order.customerPhone ? `tel:${order.customerPhone.replace(/\D/g, '')}` : '#';

  const dispositions = [
    { key: 'unreached', label: isArabic ? 'لم يرد' : 'Unreached', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
    { key: 'busy', label: isArabic ? 'مشغول / مغلق' : 'Busy', color: 'hover:bg-rose-500/10 hover:text-rose-600' },
    { key: 'callback', label: isArabic ? 'إعادة اتصال' : 'Callback', color: 'hover:bg-blue-500/10 hover:text-blue-600' },
    { key: 'wrong_number', label: isArabic ? 'رقم خاطئ' : 'Wrong No.', color: 'hover:bg-zinc-500/10 hover:text-zinc-600' },
    { key: 'reached', label: isArabic ? 'تم الرد' : 'Answered', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card px-4 py-3 sm:px-6">
      {/* 1. Customer Context & Direct Comms */}
      <section className="border-b border-border/30 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground">
                {order.customerName || '—'}
              </h2>
              <span className="font-mono text-xs font-bold text-muted-foreground" dir="ltr">
                № {order.orderNumber}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground" dir="ltr">
              {order.customerPhone || t('orders.noPhone')}
            </p>
          </div>

          {/* Quick Communication Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 transition-transform active:scale-[0.98] hover:bg-emerald-500/20 dark:text-emerald-400"
              title={isArabic ? 'فتح واتساب برسالة تأكيد جاهزة' : 'Open WhatsApp with confirmation template'}
            >
              <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
              <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
            </a>

            <a
              href={telUrl}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 text-xs font-bold text-blue-600 transition-transform active:scale-[0.98] hover:bg-blue-500/20 dark:text-blue-400"
              title={isArabic ? 'اتصال مباشر' : 'Direct Call'}
            >
              <PhoneIcon className="h-4 w-4" />
              <span>{isArabic ? 'اتصال' : 'Call'}</span>
            </a>
          </div>
        </div>

        {/* Address */}
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="leading-snug">
            {[order.governorate, order.city, order.shippingAddress].filter(Boolean).join(' • ') || '—'}
          </span>
        </div>
      </section>

      {/* 2. Order Items Table */}
      <section className="flex-1 border-b border-border/30 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <ShoppingBagIcon className="h-4 w-4" />
            <span>{isArabic ? 'بنود الطلب' : 'Order Items'} ({order.items?.length || 0})</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenDetailsModal(order)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <span>{t('orders.viewDetails')}</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between rounded-md border border-border/30 bg-muted/20 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-bold text-foreground">
                    {item.productName || item.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {item.productColor && <span>{item.productColor}</span>}
                    {item.productSize && <span>{item.productSize}</span>}
                    <span className="font-mono tabular-nums">× {item.quantity}</span>
                  </div>
                </div>
                <div className="shrink-0 text-end font-mono font-bold tabular-nums text-foreground">
                  {formatPrice(item.total || item.price * item.quantity)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'لا توجد منتجات مسجلة' : 'No items listed'}
            </p>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="mt-3 rounded-md bg-muted/30 p-2 text-xs">
          <div className="flex justify-between py-0.5 text-muted-foreground">
            <span>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span className="font-mono tabular-nums">{formatPrice(order.subtotal || order.total)}</span>
          </div>
          {order.shipping > 0 && (
            <div className="flex justify-between py-0.5 text-muted-foreground">
              <span>{isArabic ? 'مصاريف الشحن' : 'Shipping'}</span>
              <span className="font-mono tabular-nums">{formatPrice(order.shipping)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border/40 pt-1 font-bold text-foreground">
            <span>{isArabic ? 'الإجمالي النهائي' : 'Final Total'}</span>
            <span className="font-mono text-sm tabular-nums text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      {/* 3. Instant Call Dispositions (1-Click outcomes) */}
      <section className="border-b border-border/30 py-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {isArabic ? 'تسجيل نتيجة الاتصال بنقرة واحدة' : 'Instant Call Outcome'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dispositions.map((disp) => (
            <button
              key={disp.key}
              type="button"
              disabled={isBusy}
              onClick={() => onLogCall(order, disp.key)}
              className={`rounded-md border border-border/40 bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50 ${disp.color}`}
            >
              {disp.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Action Command Bar */}
      <section className="pt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => onConfirm(order)}
            disabled={isConfirmed || isCancelled || isBusy}
            className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4" />
            <span>
              {busyAction === 'confirm'
                ? isArabic
                  ? 'جارٍ التأكيد…'
                  : 'Confirming…'
                : t('orders.confirmOrder')}
            </span>
          </button>

          {/* Follow-up Button */}
          <button
            type="button"
            onClick={() => onOpenFollowUp(order)}
            disabled={isBusy}
            className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all active:scale-[0.98] hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{t('orders.scheduleFollowUp')}</span>
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => onCancel(order)}
            disabled={isCancelled || isBusy}
            className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-all active:scale-[0.98] hover:bg-destructive/20 disabled:opacity-50"
          >
            <XCircleIcon className="h-4 w-4" />
            <span>{t('orders.cancelOrder')}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
