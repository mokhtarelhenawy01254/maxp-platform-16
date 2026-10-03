import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  BoltIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderAction, WorkspaceOrder, AgentWorkload, WorkspaceOrderItem } from './types';
import { WorkspaceItemsEditor } from './WorkspaceItemsEditor';
import { WorkspaceCustomerEditor, parseCleanAddress } from './WorkspaceCustomerEditor';
export { parseCleanAddress };
import { WorkspaceCallHistory } from './WorkspaceCallHistory';
import { OrderCallButton } from '../../../components/telephony/OrderCallButton';
import { WorkspaceWhatsAppDrawer } from './WorkspaceWhatsAppDrawer';

interface WorkspaceInspectorProps {
  order: WorkspaceOrder | null;
  busyAction: OrderAction | undefined;
  onConfirm: (order: WorkspaceOrder) => void;
  onCancel: (order: WorkspaceOrder) => void;
  onLogCall: (order: WorkspaceOrder, result: string) => void;
  onOpenFollowUp: (order: WorkspaceOrder) => void;
  onOpenDetailsModal: (order: WorkspaceOrder) => void;
  onRefreshOrder?: () => void;
  isManager?: boolean;
  agents?: AgentWorkload[];
  onAssignOrder?: (orderId: string, targetUserId: string) => Promise<void>;
  onConvertIncomplete?: (cartId: string) => Promise<void>;
  onSaveItems?: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
  onSaveCustomer?: (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

export const WorkspaceInspector: React.FC<WorkspaceInspectorProps> = ({
  order,
  busyAction,
  onConfirm,
  onCancel,
  onLogCall,
  onOpenFollowUp,
  onOpenDetailsModal,
  onRefreshOrder,
  isManager = false,
  agents = [],
  onAssignOrder,
  onConvertIncomplete,
  onSaveItems,
  onSaveCustomer,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);

  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <ShoppingBagIcon className="h-12 w-12 stroke-[1.5] text-muted-foreground/40" />
        <p className="mt-3 text-sm font-semibold text-foreground">
          {t('orders.noOrderSelected')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('orders.selectOrderFromList')}
        </p>
      </div>
    );
  }

  const isConfirmed = order.status === 'CONFIRMED';
  const isCancelled = order.status === 'CANCELLED';
  const isBusy = Boolean(busyAction);

  const dispositions = [
    { key: 'unreached', label: isArabic ? 'لم يرد' : 'Unreached', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
    { key: 'busy', label: isArabic ? 'مشغول / مغلق' : 'Busy', color: 'hover:bg-rose-500/10 hover:text-rose-600' },
    { key: 'callback', label: isArabic ? 'إعادة اتصال' : 'Callback', color: 'hover:bg-blue-500/10 hover:text-blue-600' },
    { key: 'wrong_number', label: isArabic ? 'رقم خاطئ' : 'Wrong No.', color: 'hover:bg-zinc-500/10 hover:text-zinc-600' },
    { key: 'reached', label: isArabic ? 'تم الرد' : 'Answered', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card p-4 text-xs space-y-4">
      {/* 1. Customer & Header Controls */}
      <section className="border-b border-border/30 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground" dir="ltr">
                № {order.orderNumber}
              </span>
              {order.isIncomplete && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {isArabic ? 'سلة متروكة' : 'Abandoned Cart'}
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpenDetailsModal(order)}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                title={isArabic ? 'عرض كل تفاصيل الطلب في نافذة منبثقة' : 'View full order modal'}
              >
                <span>{isArabic ? 'كامل التفاصيل' : 'Full Details'}</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Quick Communication Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWhatsAppDrawerOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 transition-transform active:scale-[0.98] hover:bg-emerald-500/20 dark:text-emerald-400"
              title={isArabic ? 'فتح واتساب المنصة (محادثة كاملة، قوالب، إرسال مباشر)' : 'Open Platform WhatsApp'}
            >
              <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
              <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
            </button>

            <OrderCallButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              secondaryPhone={order.secondaryPhone}
              compact={false}
              onConfirm={() => onConfirm(order)}
              onNoAnswer={() => onLogCall(order, 'no_answer')}
              onPostpone={() => onOpenFollowUp(order)}
              onCancel={() => onCancel(order)}
              onCallFinished={onRefreshOrder}
            />
          </div>
        </div>

        {/* Modular Customer & Address Editor */}
        <div className="mt-2.5">
          <WorkspaceCustomerEditor
            order={order}
            isArabic={isArabic}
            isManager={isManager}
            agents={agents}
            onAssignOrder={onAssignOrder}
            onSaveCustomer={onSaveCustomer}
          />
        </div>
      </section>

      {/* 2. Order Items Section (Live Editor or Static Display) */}
      <section className="border-b border-border/30 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t('orders.orderItems')} ({order.items.length})
          </p>
          {onSaveItems && (
            <button
              type="button"
              onClick={() => setIsEditingItems(!isEditingItems)}
              className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
              {isEditingItems ? (
                <>
                  <CheckIcon className="h-3 w-3" />
                  <span>{isArabic ? 'إنهاء التعديل' : 'Done'}</span>
                </>
              ) : (
                <>
                  <PencilSquareIcon className="h-3 w-3" />
                  <span>{isArabic ? 'تعديل المنتجات والأسعار' : 'Edit Items'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {isEditingItems && onSaveItems ? (
          <WorkspaceItemsEditor
            order={order}
            onSave={async (orderId, items, financials) => {
              await onSaveItems(orderId, items, financials);
              setIsEditingItems(false);
            }}
            onCancel={() => setIsEditingItems(false)}
            isSaving={busyAction === 'details'}
          />
        ) : (
          <>
            <div className="space-y-1.5">
              {order.items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-2"
                >
                  <div className="flex items-center gap-2">
                    {it.productImage && (
                      <img
                        src={it.productImage}
                        alt=""
                        className="h-8 w-8 rounded object-cover border border-border/40"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{it.productName}</p>
                      {(it.productColor || it.productSize) && (
                        <p className="text-[10px] text-muted-foreground">
                          {[it.productColor, it.productSize].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-mono tabular-nums text-foreground">
                      {it.quantity} × {formatPrice(it.price)}
                    </p>
                    <p className="font-mono text-[11px] font-bold tabular-nums text-primary">
                      {formatPrice(it.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-3 space-y-1 border-t border-border/30 pt-2 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-mono tabular-nums">{formatPrice(order.subtotal || order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isArabic ? 'الشحن' : 'Shipping'}</span>
                <span className="font-mono tabular-nums">{formatPrice(order.shipping || 0)}</span>
              </div>
              {(order.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{isArabic ? 'الخصم' : 'Discount'}</span>
                  <span className="font-mono tabular-nums">-{formatPrice(order.discount || 0)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-border/40 pt-1 font-bold text-foreground">
                <span>{isArabic ? 'الإجمالي النهائي' : 'Final Total'}</span>
                <span className="font-mono text-sm tabular-nums text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3. Instant Call Dispositions (1-Click outcomes) */}
      <section className="border-b border-border/30 pb-3">
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

      {/* 3.5 Dedicated Call History and Timeline */}
      <WorkspaceCallHistory order={order} isArabic={isArabic} />

      {/* 4. Action Command Bar */}
      <section className="pt-1">
        {order.isIncomplete ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                if (onConvertIncomplete) {
                  void onConvertIncomplete(order.cartId || order.id);
                } else {
                  onConfirm(order);
                }
              }}
              disabled={isBusy}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-[0.98] hover:bg-amber-700 disabled:opacity-50"
            >
              <BoltIcon className="h-4 w-4" />
              <span>
                {busyAction === 'confirm'
                  ? isArabic
                    ? 'جارٍ الاعتماد…'
                    : 'Confirming…'
                  : isArabic
                  ? '⚡ اعتماد وتأكيد الطلب'
                  : 'Confirm Order'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenFollowUp(order)}
              disabled={isBusy}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all active:scale-[0.98] hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>{t('orders.scheduleFollowUp')}</span>
            </button>

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
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

            <button
              type="button"
              onClick={() => onOpenFollowUp(order)}
              disabled={isBusy}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all active:scale-[0.98] hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>{t('orders.scheduleFollowUp')}</span>
            </button>

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
        )}
      </section>

      {/* Embedded Platform WhatsApp Drawer */}
      <WorkspaceWhatsAppDrawer
        isOpen={isWhatsAppDrawerOpen}
        onClose={() => setIsWhatsAppDrawerOpen(false)}
        order={order}
      />
    </div>
  );
};
export default WorkspaceInspector;
