import React, { useEffect, useState } from 'react';
import { User, Phone, Mail, Clock, ShoppingBag, Activity, X, ExternalLink, MapPin, ChevronDown, Tag, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerProfile } from '../../../hooks/inbox/useCustomerProfile';
import { getInboxCustomerAvatarUrl, buildProxyImageUrl } from '../../../utils/imageUrl';
import { Contact } from '../../../hooks/useWhatsAppQueries';
import { apiClient } from '../../../services/apiClient';
import { customerService } from '../../../services/customerService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

type Tab = 'info' | 'orders' | 'activity';

interface ChatRightPanelProps {
  contact: Contact | null;
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

const ChatRightPanel: React.FC<ChatRightPanelProps> = ({ contact, onOpenOrder, onOpenTasks, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [avatarError, setAvatarError] = useState(false);
  const [leadCategories, setLeadCategories] = useState<any[]>([]);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  
  // 🏷️ Customer Tags State
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 🔄 Journey Status
  const [activeJourney, setActiveJourney] = useState<{
    id: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    flowName: string;
    lastSentAt?: string;
    nextSendAt?: string;
  } | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [reEnrolling, setReEnrolling] = useState(false);

  const { customer, orders, activities, loading, loadCustomerData, calculateLTV } = useCustomerProfile();

  const customerId = contact?.customer?.id;

  // Sync tags state when customer changes
  useEffect(() => {
    if (customer?.tags) {
      try {
        const parsed = typeof customer.tags === 'string' ? JSON.parse(customer.tags) : customer.tags;
        if (Array.isArray(parsed)) {
          setTags(parsed);
        } else {
          setTags([]);
        }
      } catch {
        setTags([]);
      }
    } else {
      setTags([]);
    }
  }, [customer]);

  useEffect(() => {
    if (customerId) {
      loadCustomerData(customerId);
    }
    setAvatarError(false);
  }, [customerId, loadCustomerData]);

  // Fetch active journey for this customer
  useEffect(() => {
    if (!customerId) { setActiveJourney(null); return; }
    setJourneyLoading(true);
    apiClient.get("/whatsapp/automation/journeys", { params: { customerId, status: 'ACTIVE' } })
      .then(r => {
        const data = r.data?.data || [];
        if (data.length > 0) {
          const j = data[0];
          setActiveJourney({
            id: j.id,
            status: j.status,
            currentStep: j.currentStep || 0,
            totalSteps: j.flow?.steps?.length || 0,
            flowName: j.flow?.name || '',
            lastSentAt: j.lastSentAt,
            nextSendAt: j.nextSendAt,
          });
        } else {
          setActiveJourney(null);
        }
      })
      .catch(() => setActiveJourney(null))
      .finally(() => setJourneyLoading(false));
  }, [customerId]);

  useEffect(() => {
    apiClient.get("/whatsapp/lead-categories").then(r => {
      setLeadCategories(r.data?.data || []);
    }).catch(() => {});

    // Fetch distinct tags for suggestions
    customerService.getDistinctTags().then(res => {
      const distinctNames = res.map(t => t.name);
      // Merge with suggestions from service
      const defaultSuggestions = customerService.getTagSuggestions();
      const merged = Array.from(new Set([...distinctNames, ...defaultSuggestions]));
      setAvailableTags(merged);
    }).catch(() => {});
  }, []);

  const handleReEnroll = async () => {
    if (!customerId || !contact?.leadCategoryId) return;
    setReEnrolling(true);
    try {
      await apiClient.post("/whatsapp/automation/journeys/re-enroll", {
        customerId,
        contactId: contact.id,
        categoryId: contact.leadCategoryId,
      });
      // Refresh journey status
      const r = await apiClient.get("/whatsapp/automation/journeys", { params: { customerId, status: 'ACTIVE' } });
      const data = r.data?.data || [];
      if (data.length > 0) {
        const j = data[0];
        setActiveJourney({
          id: j.id, status: j.status, currentStep: j.currentStep || 0,
          totalSteps: j.flow?.steps?.length || 0, flowName: j.flow?.name || '',
          lastSentAt: j.lastSentAt, nextSendAt: j.nextSendAt,
        });
      }
    } catch { /* handled */ }
    finally { setReEnrolling(false); }
  };

  const handleCategoryChange = async (categoryId: string) => {
    if (!contact) return;
    setUpdatingCategory(true);
    try {
      await apiClient.put("/whatsapp/contacts/" + contact.id, { leadCategoryId: categoryId || null });
      contact.leadCategoryId = categoryId || null;
      contact.leadCategory = leadCategories.find(c => c.id === categoryId) || null;
      setUpdatingCategory(false);
    } catch { setUpdatingCategory(false); }
  };

  const handleAddTag = async (tagName: string) => {
    if (!customerId) return;
    const trimmed = tagName.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    
    const updatedTags = [...tags, trimmed];
    setIsAddingTag(true);
    try {
      await customerService.updateCustomerTags(customerId, updatedTags);
      setTags(updatedTags);
      setNewTagInput('');
      
      // Update suggestions if new
      if (!availableTags.includes(trimmed)) {
        setAvailableTags(prev => [...prev, trimmed]);
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!customerId) return;
    const updatedTags = tags.filter(t => t !== tagToRemove);
    try {
      await customerService.updateCustomerTags(customerId, updatedTags);
      setTags(updatedTags);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const selectedCategory = contact?.leadCategoryId
    ? leadCategories.find(c => c.id === contact.leadCategoryId)
    : null;

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
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">تصنيف العميل</h4>
                    <div className="flex items-center gap-2">
                      {selectedCategory && (
                        <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: selectedCategory.color || '#6366f1' }} />
                      )}
                      <Select value={contact.leadCategoryId || ""} onValueChange={handleCategoryChange} disabled={updatingCategory}>
                        <SelectTrigger className="h-9 w-full text-xs">
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">بدون تصنيف</SelectItem>
                          {leadCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                <span className="inline-block size-2.5 rounded-full" style={{ background: cat.color || '#6366f1' }} />
                                {cat.name} ({cat.contactCount})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">وسوم العميل (Tags)</h4>
                    
                    {/* عرض الوسوم الحالية */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded bg-secondary/15 hover:bg-secondary/25 px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors group"
                          >
                            <Tag className="size-2.5" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground focus:outline-none"
                              title="حذف الوسم"
                            >
                              <X className="size-2.5" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground w-full">لا توجد وسوم لهذا العميل</p>
                      )}
                    </div>

                    {/* إدخال وسم جديد مع اقتراحات */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(newTagInput);
                            }
                          }}
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="وسم جديد... (اضغط Enter)"
                          disabled={isAddingTag}
                          list="suggested-tags-list"
                        />
                        <datalist id="suggested-tags-list">
                          {availableTags
                            .filter(t => !tags.includes(t))
                            .map(t => (
                              <option key={t} value={t} />
                            ))
                          }
                        </datalist>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="h-8 w-8 rounded-md"
                        onClick={() => handleAddTag(newTagInput)}
                        disabled={isAddingTag || !newTagInput.trim()}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {activeJourney ? (
                    <div style={sectionStyle}>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">رحلة المتابعة</h4>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="size-3.5 text-amber-500" />
                        <span className="text-sm font-medium text-foreground">{activeJourney.flowName}</span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>الخطوة:</span>
                          <span className="font-medium text-foreground">{activeJourney.currentStep + 1}/{activeJourney.totalSteps || '?'}</span>
                        </div>
                        {activeJourney.lastSentAt && (
                          <div className="flex justify-between">
                            <span>آخر رسالة:</span>
                            <span className="font-medium text-foreground">
                              {format(new Date(activeJourney.lastSentAt), 'MMM d, HH:mm', { locale: arSA })}
                            </span>
                          </div>
                        )}
                        {activeJourney.nextSendAt && (
                          <div className="flex justify-between">
                            <span>الرسالة القادمة:</span>
                            <span className="font-medium text-foreground">
                              {format(new Date(activeJourney.nextSendAt), 'MMM d, HH:mm', { locale: arSA })}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="mt-2 w-full gap-1 text-xs"
                        onClick={handleReEnroll} disabled={reEnrolling}>
                        {reEnrolling ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                        إعادة تسجيل
                      </Button>
                    </div>
                  ) : (contact?.leadCategoryId && selectedCategory?.triggerFlowId && (
                    <div style={sectionStyle}>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">رحلة المتابعة</h4>
                      <p className="text-xs text-muted-foreground mb-2">العميل مش مسجل في الرحلة</p>
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs"
                        onClick={handleReEnroll} disabled={reEnrolling}>
                        {reEnrolling ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                        تسجيل في الرحلة
                      </Button>
                    </div>
                  ))}
                  {journeyLoading && (
                    <div style={sectionStyle} className="flex items-center justify-center py-3">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}

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
