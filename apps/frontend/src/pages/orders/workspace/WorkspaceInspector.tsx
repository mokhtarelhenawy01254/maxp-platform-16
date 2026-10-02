import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  BoltIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderAction, WorkspaceOrder, AgentWorkload, WorkspaceOrderItem } from './types';
import { WorkspaceItemsEditor } from './WorkspaceItemsEditor';
import { OrderCallButton } from '../../../components/telephony/OrderCallButton';
import { GovernorateAreaSearch } from '../../../components/ui/GovernorateAreaSearch';
import { WorkspaceWhatsAppDrawer } from './WorkspaceWhatsAppDrawer';

interface WorkspaceInspectorProps {
  order: WorkspaceOrder | null;
  busyAction: OrderAction | undefined;
  onConfirm: (order: WorkspaceOrder) => void;
  onCancel: (order: WorkspaceOrder) => void;
  onLogCall: (order: WorkspaceOrder, result: string) => void;
  onOpenFollowUp: (order: WorkspaceOrder) => void;
  onOpenDetailsModal: (order: WorkspaceOrder) => void;
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

export function parseCleanAddress(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed.address || parsed.addressLine1 || parsed.street || '';
      }
    } catch {
      return raw;
    }
  }
  return raw;
}

function buildWhatsAppUrl(order: WorkspaceOrder, isArabic: boolean): string {
  const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return '#';

  const phone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

  const itemsList =
    order.items
      ?.map((i) => {
        const variant = [i.productColor, i.productSize].filter(Boolean).join(' - ');
        return `• ${i.productName || i.name} ${variant ? `(${variant})` : ''} × ${i.quantity}`;
      })
      .join('\n') || '';

  const cleanAddr = parseCleanAddress(order.shippingAddress) || [order.governorate, order.city].filter(Boolean).join('، ');

  if (order.isIncomplete) {
    const message = isArabic
      ? `أهلاً بحضرتك أ/ ${order.customerName}،\nلاحظنا اهتمامك بطلب:\n${itemsList}\nولم يتم استكمال الطلب حتى الآن. هل واجهت أي صعوبة في الدفع أو العنوان؟ يسعدنا مساعدتك وتأكيد الطلب لك فوراً!`
      : `Hello ${order.customerName},\nWe noticed you left your cart with:\n${itemsList}\nNeed any help completing your order? We are here to assist!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  const message = isArabic
    ? `أهلاً بحضرتك أ/ ${order.customerName}،\nبخصوص طلبك رقم #${order.orderNumber}:\n${itemsList}\nالإجمالي: ${order.total} ج.م\nالعنوان: ${cleanAddr}\nهل نعتمد الشحن اليوم؟`
    : `Hello ${order.customerName},\nRegarding your order #${order.orderNumber}:\n${itemsList}\nTotal: ${order.total}\nAddress: ${cleanAddr}\nWould you like to confirm for shipment?`;

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
  const [isSavingItems, setIsSavingItems] = useState(false);

  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(order?.secondaryPhone || '');
  const [governorate, setGovernorate] = useState(order?.governorate || '');
  const [city, setCity] = useState(order?.city || '');
  const [shippingAddress, setShippingAddress] = useState(parseCleanAddress(order?.shippingAddress));
  const [notes, setNotes] = useState(order?.notes || '');

  // Reset local edit states when selected order changes
  React.useEffect(() => {
    setIsEditingItems(false);
    setIsEditingCustomer(false);
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setSecondaryPhone(order.secondaryPhone || '');
      setGovernorate(order.governorate || '');
      setCity(order.city || '');
      setShippingAddress(parseCleanAddress(order.shippingAddress));
      setNotes(order.notes || '');
    }
  }, [order?.id]);

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-sm font-medium">
          {isArabic
            ? 'اختر طلباً من الطابور لبدء المراجعة والتنفيذ'
            : 'Select an order from the queue to inspect'}
        </p>
      </div>
    );
  }

  const isConfirmed = order.status === 'CONFIRMED';
  const isCancelled = order.status === 'CANCELLED';
  const isBusy = Boolean(busyAction);
  const waUrl = buildWhatsAppUrl(order, isArabic);

  const dispositions = [
    { key: 'unreached', label: isArabic ? 'لم يرد' : 'Unreached', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
    { key: 'busy', label: isArabic ? 'مشغول / مغلق' : 'Busy', color: 'hover:bg-rose-500/10 hover:text-rose-600' },
    { key: 'callback', label: isArabic ? 'إعادة اتصال' : 'Callback', color: 'hover:bg-blue-500/10 hover:text-blue-600' },
    { key: 'wrong_number', label: isArabic ? 'رقم خاطئ' : 'Wrong No.', color: 'hover:bg-zinc-500/10 hover:text-zinc-600' },
    { key: 'reached', label: isArabic ? 'تم الرد' : 'Answered', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  ];

  const handleSaveCustomerDetails = async () => {
    if (!onSaveCustomer) return;
    try {
      setIsSavingCustomer(true);
      await onSaveCustomer(order.id, {
        customerName,
        customerPhone,
        secondaryPhone,
        governorate,
        city,
        shippingAddress,
        notes,
      });
      setIsEditingCustomer(false);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card px-4 py-3 sm:px-6">
      {/* Abandoned Cart Recovery Banner */}
      {order.isIncomplete && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-600 dark:text-amber-400">
              🛒 {isArabic ? 'سلة متروكة غير مكتملة' : 'Abandoned Cart Lead'}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
              ID: {order.cartId || order.id}
            </span>
          </div>
          {order.abandonReason && (
            <p className="mt-1 text-muted-foreground">
              {isArabic ? 'سبب التوقف:' : 'Abandon reason:'}{' '}
              {typeof order.abandonReason === 'string'
                ? order.abandonReason
                : (order.abandonReason as any)?.code || JSON.stringify(order.abandonReason)}
            </p>
          )}
        </div>
      )}

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
              {onSaveCustomer && !isEditingCustomer && (
                <button
                  type="button"
                  onClick={() => setIsEditingCustomer(true)}
                  className="rounded p-0.5 text-muted-foreground hover:text-primary"
                  title={isArabic ? 'تعديل بيانات العميل' : 'Edit Customer'}
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground" dir="ltr">
              <span>{order.customerPhone || t('orders.noPhone')}</span>
              {order.secondaryPhone && order.secondaryPhone !== order.customerPhone && (
                <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.2 text-[11px] font-semibold text-foreground">
                  <span className="text-[10px] text-muted-foreground">{isArabic ? 'بديل:' : 'Alt:'}</span>
                  <span>{order.secondaryPhone}</span>
                </span>
              )}
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
              compact={false}
              onConfirm={() => onConfirm(order)}
              onNoAnswer={() => onLogCall(order, 'no_answer')}
              onPostpone={() => onOpenFollowUp(order)}
              onCancel={() => onCancel(order)}
            />
          </div>
        </div>

        {/* Inline Customer Edit Mode (Rich Address & Phone Editor matching Order Details) */}
        {isEditingCustomer ? (
          <div className="mt-2 space-y-2.5 rounded-md border border-primary/30 bg-muted/20 p-2.5 text-xs">
            {/* Row 1: Name & Phones */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isArabic ? 'اسم العميل' : 'Customer Name'}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isArabic ? 'رقم الهاتف الأساسي' : 'Primary Phone'}
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {isArabic ? 'هاتف بديل (اختياري)' : 'Alt Phone (Optional)'}
                </label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 2: Governorate & Area Smart Search */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                {isArabic ? 'المحافظة والمنطقة / المدينة (خريطة الشحن)' : 'Governorate & City / Area'}
              </label>
              <GovernorateAreaSearch
                value={{
                  governorate: governorate || '',
                  area: city || '',
                }}
                onChange={(next) => {
                  setGovernorate(next.governorate);
                  setCity(next.area);
                }}
                placeholder={isArabic ? 'ابحث عن المحافظة أو المنطقة…' : 'Search governorate / area…'}
              />
            </div>

            {/* Row 3: Detailed Address */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                {isArabic ? 'العنوان بالتفصيل' : 'Detailed Address'}
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={2}
                placeholder={isArabic ? 'الشارع، رقم العقار، رقم الشقة، علامة مميزة…' : 'Street, building, apt, landmark…'}
                className="w-full rounded border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Row 4: Notes */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                {isArabic ? 'ملاحظات العميل أو الطلب' : 'Notes'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? 'ملاحظات خاصة بالتوصيل أو الاستلام…' : 'Special delivery notes…'}
                className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={() => setIsEditingCustomer(false)}
                className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerDetails}
                disabled={isSavingCustomer}
                className="inline-flex items-center gap-1 rounded bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                <span>{isSavingCustomer ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ البيانات' : 'Save Details')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span className="leading-snug">
              {[order.governorate, order.city, parseCleanAddress(order.shippingAddress)].filter(Boolean).join(' • ') || '—'}
            </span>
          </div>
        )}

        {/* Manager Fleet Assignment Control */}
        {isManager && agents.length > 0 && onAssignOrder && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">
                {isArabic ? 'الموظف المسؤول:' : 'Assigned Agent:'}
              </span>
              <span className="font-medium text-primary">
                {order.assignedToName || (isArabic ? 'غير موزع' : 'Unassigned')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">{isArabic ? 'تعيين:' : 'Assign:'}</span>
              <select
                value={order.assignedTo || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    void onAssignOrder(order.id, e.target.value);
                  }
                }}
                className="h-6 rounded border border-border/60 bg-background px-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
              >
                <option value="" disabled>
                  {isArabic ? 'اختر موظف…' : 'Select agent…'}
                </option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.pendingCount})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* 2. Order Items Section (Live Editor or Static List) */}
      <section className="flex-1 border-b border-border/30 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <ShoppingBagIcon className="h-4 w-4" />
            <span>
              {isArabic ? 'بنود الطلب' : 'Order Items'} ({order.items?.length || 0})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingItems && onSaveItems && (
              <button
                type="button"
                onClick={() => setIsEditingItems(true)}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-2 py-0.5 text-[11px] font-bold text-foreground hover:bg-muted/40"
              >
                <PencilSquareIcon className="h-3.5 w-3.5 text-primary" />
                <span>{isArabic ? 'تعديل البنود وعروض Upsell' : 'Edit Items & Upsell'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDetailsModal(order)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <span>{t('orders.viewDetails')}</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isEditingItems && onSaveItems ? (
          <WorkspaceItemsEditor
            order={order}
            onSave={async (orderId, newItems, financials) => {
              try {
                setIsSavingItems(true);
                await onSaveItems(orderId, newItems, financials);
                setIsEditingItems(false);
              } finally {
                setIsSavingItems(false);
              }
            }}
            onCancel={() => setIsEditingItems(false)}
            isSaving={isSavingItems}
          />
        ) : (
          <>
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
              {Boolean(order.discount && order.discount > 0) && (
                <div className="flex justify-between py-0.5 text-emerald-600 dark:text-emerald-400">
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
        {order.isIncomplete ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Confirm / Convert Button */}
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
        ) : (
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
