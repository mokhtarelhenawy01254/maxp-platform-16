import React, { useEffect, useState } from 'react';
import { User, Phone, Mail, Clock, ShoppingBag, Activity, Tags, X, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerProfile } from '../../../hooks/inbox/useCustomerProfile';
import { getInboxCustomerAvatarUrl, buildProxyImageUrl } from '../../../utils/imageUrl';
import { Contact } from '../../../hooks/useWhatsAppQueries';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

type Tab = 'info' | 'orders' | 'activity';

interface ChatRightPanelProps {
  contact: Contact | null;
  onOpenLabels: () => void;
  onOpenOrder: () => void;
  onOpenTasks: () => void;
  onClose?: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'عميل محتمل', color: '#f59e0b' },
  ACTIVE: { label: 'عميل نشط', color: '#10b981' },
  VIP: { label: 'عميل مميز', color: '#8b5cf6' },
  BLOCKED: { label: 'محظور', color: '#ef4444' },
};

const ORDER_STATUS_THEME: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'جديد', color: '#f59e0b' },
  CONFIRMED: { label: 'مؤكد', color: '#3b82f6' },
  PROCESSING: { label: 'جاري التجهيز', color: '#8b5cf6' },
  SHIPPED: { label: 'تم الشحن', color: '#06b6d4' },
  DELIVERED: { label: 'تم التسليم', color: '#10b981' },
  COMPLETED: { label: 'مكتمل', color: '#10b981' },
  CANCELLED: { label: 'ملغي', color: '#ef4444' },
  paid: { label: 'مدفوع', color: '#10b981' },
  completed: { label: 'مكتمل', color: '#10b981' },
  cancelled: { label: 'ملغي', color: '#ef4444' },
};

const ChatRightPanel: React.FC<ChatRightPanelProps> = ({ contact, onOpenLabels, onOpenOrder, onOpenTasks, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [avatarError, setAvatarError] = useState(false);
  const { customer, orders, activities, loading, loadCustomerData, calculateLTV } = useCustomerProfile();

  const customerId = contact?.customer?.id;

  useEffect(() => {
    if (customerId) {
      loadCustomerData(customerId);
    }
    setAvatarError(false);
  }, [customerId, loadCustomerData]);

  if (!contact) return null;

  const ltv = calculateLTV();
  const displayName = contact.name || contact.pushName || contact.jid;
  const statusInfo = contact.customer?.status ? STATUS_MAP[contact.customer.status] : null;

  const avatarSrc = !avatarError
    ? (contact.profilePicUrl || customer?.avatar || null)
    : (customer?.avatar || contact.profilePicUrl || null);

  const proxiedAvatar = avatarSrc
    ? (customerId
        ? getInboxCustomerAvatarUrl(customerId, avatarSrc)
        : avatarSrc)
    : null;

  const sectionStyle: React.CSSProperties = {
    background: 'var(--business-surface-subtle)',
    border: '1px solid var(--business-card-border)',
    borderRadius: '0.75rem',
    padding: '0.75rem',
  };

  return (
    <aside className="flex w-80 flex-col border-l border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          التفاصيل
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" className="size-7 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <div className="relative">
              {proxiedAvatar ? (
                <img
                  src={proxiedAvatar}
                  alt={displayName}
                  className="size-16 rounded-full object-cover shadow-sm"
                  style={{ border: '2px solid var(--business-card-border)' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                  <User className="size-8" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{displayName}</div>
              {contact.phoneNumber ? (
                <div className="mt-0.5 flex items-center justify-center gap-1 text-sm text-muted-foreground" dir="ltr">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{contact.phoneNumber}</span>
                </div>
              ) : null}
              {statusInfo ? (
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ background: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-[var(--business-surface-subtle)] px-3 py-2 text-center" style={{ borderColor: 'var(--business-card-border)' }}>
              <p className="text-xs text-muted-foreground">الطلبات</p>
              <p className="text-lg font-semibold text-foreground">{orders.length}</p>
            </div>
            <div className="rounded-lg border bg-[var(--business-surface-subtle)] px-3 py-2 text-center" style={{ borderColor: 'var(--business-card-border)' }}>
              <p className="text-xs text-muted-foreground">القيمة</p>
              <p className="text-lg font-semibold text-primary">{ltv.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>

        <div className="flex border-y border-border/50">
          {(['info', 'orders', 'activity'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'info' ? 'معلومات' : tab === 'orders' ? 'طلبات' : 'نشاط'}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab === 'info' && (
                <div className="space-y-3">
                  <div style={sectionStyle}>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">التصنيفات</h4>
                    {contact.labels && contact.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {contact.labels.map((label) => (
                          <span key={label} className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                            <Tags className="size-3" />
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">لا توجد تصنيفات</p>
                    )}
                    <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={onOpenLabels}>
                      <Tags className="size-3.5" /> إدارة التصنيفات
                    </Button>
                  </div>

                  <div style={sectionStyle}>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">التواصل</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-mono text-foreground" dir="ltr">{contact.phoneNumber || 'غير متوفر'}</span>
                      </div>
                      {customer?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-foreground">{customer.email}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">بيانات أخرى</h4>
                    <div className="space-y-2 text-sm">
                      {customer?.city || customer?.country ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{customer.city}{customer.city && customer.country ? '، ' : ''}{customer.country}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">آخر ظهور:</span>
                        <span className="font-medium text-foreground">
                          {contact.lastMessageAt
                            ? format(new Date(contact.lastMessageAt), 'MMM d, HH:mm', { locale: arSA })
                            : 'غير معروف'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {orders.length > 0 ? (
                    <>
                      <div className="rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 p-3 text-center" style={{ border: '1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)' }}>
                        <ShoppingBag className="mx-auto mb-1 size-5 text-primary" />
                        <p className="text-sm font-semibold text-primary">سجل الطلبات</p>
                        <p className="text-xs text-muted-foreground">{orders.length} طلب — بإجمالي {ltv.toLocaleString()} ج.م</p>
                      </div>
                      {orders.map((order) => {
                        const theme = ORDER_STATUS_THEME[order.status] || { label: order.status, color: 'var(--color-muted-foreground)' };
                        return (
                          <div key={order.id} style={sectionStyle}>
                            <div className="mb-1.5 flex items-start justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground">#{order.orderNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: arSA })}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: theme.color }}>
                                {theme.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t pt-1.5 text-xs" style={{ borderColor: 'var(--business-muted-line)' }}>
                              <span className="text-muted-foreground">{order.items?.length || 0} منتجات</span>
                              <span className="font-bold text-primary">{order.total?.toLocaleString() || 0} ج.م</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <ShoppingBag className="mx-auto mb-2 size-10 opacity-20" />
                      <p className="text-sm">لا توجد طلبات سابقة</p>
                    </div>
                  )}
                  <Button variant="outline" className="w-full gap-1.5" onClick={onOpenOrder}>
                    <ShoppingBag className="size-4" /> طلب جديد
                  </Button>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {activities.length > 0 ? (
                    <div className="relative mr-2 space-y-4 pl-4" style={{ borderRight: '2px solid var(--business-muted-line)' }}>
                      {activities.map((act) => (
                        <div key={act.id} className="relative pr-5">
                          <div className="absolute -right-[25px] top-1 size-2.5 rounded-full border-2" style={{
                            background: 'var(--color-primary)',
                            borderColor: 'color-mix(in srgb, white 76%, var(--color-background) 24%)',
                            boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, white)',
                          }} />
                          <p className="text-sm font-medium text-foreground">{act.description}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {format(new Date(act.createdAt), 'dd MMM, HH:mm', { locale: arSA })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Clock className="mx-auto mb-2 size-10 opacity-20" />
                      <p className="text-sm">لا يوجد نشاط مسجل</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border/50 p-3">
          <Button variant="outline" className="w-full gap-1.5" onClick={onOpenTasks}>
            <Activity className="size-4" /> مهمة جديدة
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default ChatRightPanel;
