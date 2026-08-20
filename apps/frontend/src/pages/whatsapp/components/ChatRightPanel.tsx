import React, { useEffect, useState } from 'react';
import { User, Mail, Clock, ShoppingBag, Activity, X, MapPin, Tag, Plus, Sparkles, Loader2, Check, SquarePen, Pencil, FileText, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerProfile } from '../../../hooks/inbox/useCustomerProfile';
import { getInboxExternalImageUrl } from '../../../utils/imageUrl';
import { Contact } from '../../../hooks/useWhatsAppQueries';
import { apiClient } from '../../../services/apiClient';
import { customerService } from '../../../services/customerService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { tToast } from "../../../utils/i18n-toast";
import { useQueryClient } from '@tanstack/react-query';
import { getBestContactDisplayName } from '../whatsappContactDisplay';
import { getStatusDisplay } from "../../../utils/statusRegistry";
import EnhancedOrderModal from "../../../components/orders/EnhancedOrderModal";
import ReturnDetailsModal from "../../returns/ReturnDetailsModal";
import { returnService, ReturnRequest } from '../../../services/returnService';
import { toast } from 'sonner';

type Tab = 'info' | 'orders' | 'activity';

interface ChatRightPanelProps {
  contact: Contact | null;
  onOpenOrder: () => void;
  onOpenTasks: () => void;
  onClose?: () => void;
  onOpenLabels?: () => void;
  labels?: { id: string; name: string; color: string }[];
  refreshToken?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'عميل محتمل', color: '#f59e0b' },
  ACTIVE: { label: 'عميل نشط', color: '#10b981' },
  VIP: { label: 'عميل مميز', color: '#8b5cf6' },
  BLOCKED: { label: 'محظور', color: '#ef4444' },
};

const ChatRightPanel: React.FC<ChatRightPanelProps> = ({ contact, onOpenOrder, onOpenTasks, onClose, onOpenLabels, labels = [], refreshToken = 0 }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [avatarError, setAvatarError] = useState(false);
  const [leadCategories, setLeadCategories] = useState<any[]>([]);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [orderMenu, setOrderMenu] = useState<{
    mouseX: number;
    mouseY: number;
    orderNumber: string;
  } | null>(null);
  const [previewOrder, setPreviewOrder] = useState<any | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<Array<{ code: string; name: string; color?: string }>>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/order-status")
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setOrderStatuses(res.data.data || []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewOrderDetails = async (orderNumber: string) => {
    setOrderDetailsLoading(true);
    try {
      const response = await apiClient.get(
        `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
      );
      const orderData = response.data?.data;
      if (response.data?.success && orderData) {
        setPreviewOrder(orderData);
        return;
      }
    } catch (err) {
      console.error("Failed to load full order details:", err);
    } finally {
      setOrderDetailsLoading(false);
    }
    window.open(`/orders/${encodeURIComponent(orderNumber)}`, "_blank");
  };

  const handleOpenReturnReason = async (orderNumber: string) => {
    let req: ReturnRequest | null = null;
    try {
      const res = await returnService.getRequests({ search: orderNumber, limit: 1 });
      req = res.data?.data?.[0] || null;
    } catch {}
    if (req) {
      setSelectedReturn(req);
    } else {
      toast.error("هذا الطلب ليس له طلب مرتجع — تعديل السبب متاح فقط للطلبات الظاهرة في صفحة مراجعة المرتجعات");
    }
  };


  // 📱 Phone Editing State
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneUpdateMessage, setPhoneUpdateMessage] = useState<string | null>(null);
  // 📱 Second Phone State
  const [editingPhone2, setEditingPhone2] = useState(false);
  const [phone2Draft, setPhone2Draft] = useState('');
  const [savingPhone2, setSavingPhone2] = useState(false);
  
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

  const { customer, orders, activities, loading, loadCustomerData, updateCustomerPhone, updateCustomerPhone2, calculateLTV } = useCustomerProfile();

  const customerId = contact?.customer?.id;

  const handleStartEditPhone = () => {
    setPhoneDraft(customer?.phone || '');
    setEditingPhone(true);
    setPhoneUpdateMessage(null);
  };

  const handleSavePhone = async () => {
    const phone = phoneDraft.trim();
    if (!phone) {
      setPhoneUpdateMessage('❌ يرجى إدخال رقم الهاتف');
      return;
    }
    setSavingPhone(true);
    setPhoneUpdateMessage(null);
    const result = await updateCustomerPhone(phone);
    setSavingPhone(false);
    if (result.success) {
      setEditingPhone(false);
      setPhoneUpdateMessage(`✅ ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 4000);
      if (customer?.id) loadCustomerData(customer.id);
    } else {
      setPhoneUpdateMessage(`❌ ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 5000);
    }
  };

  const displayPhone = customer?.phone || contact?.phoneNumber || '';
  const phone2FromMeta = (() => {
    try {
      const meta = typeof customer?.metadata === 'string' ? JSON.parse(customer.metadata) : (customer?.metadata || {});
      return meta?.phone2 || '';
    } catch { return ''; }
  })();
  const displayPhone2 = phone2FromMeta || customer?.phone2 || '';

  const handleStartEditPhone2 = () => {
    setPhone2Draft(displayPhone2);
    setEditingPhone2(true);
  };

  const handleSavePhone2 = async () => {
    const phone2 = phone2Draft.trim();
    if (!phone2) {
      setEditingPhone2(false);
      return;
    }
    setSavingPhone2(true);
    const result = await updateCustomerPhone2(phone2);
    setSavingPhone2(false);
    setEditingPhone2(false);
    if (result.success) {
      tToast.success("ChatRightPanel.success_update_506f");
      if (customer?.id) loadCustomerData(customer.id);
    } else {
      tToast.error("ChatRightPanel.failed_update_1f8e");
    }
  };

  const phoneControl = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {displayPhone ? (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600">
            <X className="size-3" strokeWidth={3} />
          </span>
        )}
        {editingPhone ? (
          <input
            autoFocus
            type="tel"
            dir="ltr"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSavePhone();
              if (e.key === "Escape") {
                setEditingPhone(false);
                setPhoneUpdateMessage(null);
              }
            }}
            className="business-chat-input flex-1 min-w-0 px-2 py-1 text-sm font-medium font-mono"
            placeholder="01xxxxxxxxx"
            disabled={savingPhone}
          />
        ) : displayPhone ? (
          <span className="font-mono flex-1 min-w-0 truncate text-foreground" dir="ltr">
            {displayPhone}
          </span>
        ) : (
          <span className="flex-1 min-w-0 text-xs text-muted-foreground">لم يتم إضافة رقم هاتف بعد</span>
        )}
        {editingPhone ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-50"
              style={{
                color: "#ffffff",
                background: "var(--business-success)",
                borderColor: "transparent",
                boxShadow:
                  "0 10px 20px -12px color-mix(in srgb, var(--business-success) 70%, transparent)",
              }}
              title="حفظ رقم الهاتف"
              aria-label="حفظ رقم الهاتف"
            >
              {savingPhone ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
              ) : (
                <Check className="size-5" strokeWidth={3} />
              )}
            </button>
            <button
              onClick={() => { setEditingPhone(false); setPhoneUpdateMessage(null); }}
              disabled={savingPhone}
              className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
              style={{
                color: "var(--business-danger)",
                background:
                  "color-mix(in srgb, var(--business-danger) 12%, white)",
                borderColor:
                  "color-mix(in srgb, var(--business-danger) 30%, transparent)",
              }}
              title="إلغاء"
              aria-label="إلغاء"
            >
              <X className="size-[18px]" strokeWidth={3} />
            </button>
          </div>
        ) : displayPhone ? (
          <button
            onClick={handleStartEditPhone}
            className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              color: "var(--color-primary)",
              background:
                "color-mix(in srgb, var(--color-primary) 12%, white)",
              borderColor:
                "color-mix(in srgb, var(--color-primary) 30%, transparent)",
            }}
            title="تعديل رقم الهاتف"
            aria-label="تعديل رقم الهاتف"
          >
            <SquarePen className="size-4" />
          </button>
        ) : null}
      </div>
      {!displayPhone && !editingPhone && (
        <button
          onClick={handleStartEditPhone}
          className="business-chip-button w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{
            color: "#ffffff",
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
            border: "none",
            boxShadow:
              "0 18px 34px -22px color-mix(in srgb, var(--color-primary) 65%, transparent)",
          }}
          title="إضافة رقم الهاتف"
          aria-label="إضافة رقم الهاتف"
        >
          <Plus className="size-4" />
          إضافة رقم الهاتف
        </button>
      )}
      {phoneUpdateMessage && (
        <p className="text-xs" style={{ color: phoneUpdateMessage.includes("✅") ? "var(--business-success)" : "var(--business-danger)" }}>
          {phoneUpdateMessage}
        </p>
      )}
    </div>
  );

  // Sync selected category from contact
  useEffect(() => {
    setSelectedCategoryId(contact?.leadCategoryId || 'none');
  }, [contact?.leadCategoryId]);

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
  }, [customerId, loadCustomerData, refreshToken]);

  // Fetch active journey for this customer
  useEffect(() => {
    if (!customerId) { setActiveJourney(null); return; }
    setJourneyLoading(true);
    apiClient.get("/whatsapp/automation/journeys", { params: { customerId, status: 'ACTIVE' } })
      .then(r => {
        const data = (r as any).data?.data || [];
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
      setLeadCategories((r as any).data?.data || []);
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
      const data = (r as any).data?.data || [];
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
    const prevCategoryId = selectedCategoryId;
    setSelectedCategoryId(categoryId);
    const actualCategoryId = categoryId === 'none' ? null : categoryId;
    try {
      await apiClient.put("/whatsapp/contacts/" + contact.id, { leadCategoryId: actualCategoryId });
      tToast.success("ChatRightPanel.success_update_506f");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch {
      setSelectedCategoryId(prevCategoryId);
      tToast.error("ChatRightPanel.failed_update_1f8e");
    } finally {
      setUpdatingCategory(false);
    }
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

  const selectedCategory = selectedCategoryId && selectedCategoryId !== 'none'
    ? leadCategories.find(c => c.id === selectedCategoryId)
    : null;

  if (!contact) return null;

  const ltv = calculateLTV();
  const displayName = getBestContactDisplayName(contact);
  const statusInfo = contact.customer?.status ? STATUS_MAP[contact.customer.status] : null;

  const avatarSrc = !avatarError
    ? (contact.profilePicUrl || customer?.avatar || null)
    : (customer?.avatar || contact.profilePicUrl || null);

  const proxiedAvatar = avatarSrc
    ? getInboxExternalImageUrl(avatarSrc, { customerId })
    : null;

  const sectionStyle: React.CSSProperties = {
    background: 'var(--business-surface-subtle)',
    border: '1px solid var(--business-card-border)',
    borderRadius: '0.75rem',
    padding: '0.75rem',
  };

  return (
    <aside className="flex h-full w-80 shrink-0 min-h-0 flex-col overflow-hidden border-border/50 bg-card ltr:border-l rtl:border-r">
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
                      <Select value={selectedCategoryId} onValueChange={(v) => v && void handleCategoryChange(v)} disabled={updatingCategory}>
                        <SelectTrigger className="h-9 w-full text-xs">
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون تصنيف</SelectItem>
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

                  <div style={sectionStyle}>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">تصنيفات واتساب</h4>
                    {contact.labels && contact.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {contact.labels.map(labelId => {
                          const def = labels.find(l => l.id === labelId);
                          return def ? (
                            <span key={labelId}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                              style={{ backgroundColor: def.color }}>
                              {def.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-2">لا توجد تصنيفات</p>
                    )}
                    {onOpenLabels ? (
                      <Button variant="outline" size="sm" className="w-full gap-1 mt-1 text-xs" onClick={onOpenLabels}>
                        <Tag className="size-3" />
                        إدارة التصنيفات
                      </Button>
                    ) : null}
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
                      {phoneControl}
                      {/* رقم هاتف إضافي (ثاني) - يظهر تحت الرقم الأساسي */}
                      <div className="flex items-center gap-2 text-sm">
                        {editingPhone2 ? (
                          <input
                            autoFocus
                            type="tel"
                            dir="ltr"
                            value={phone2Draft}
                            onChange={(e) => setPhone2Draft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePhone2();
                              if (e.key === "Escape") setEditingPhone2(false);
                            }}
                            className="business-chat-input flex-1 min-w-0 px-2 py-1 text-sm font-medium font-mono"
                            placeholder="01xxxxxxxxx"
                            disabled={savingPhone2}
                          />
                        ) : displayPhone2 ? (
                          <span className="font-mono flex-1 min-w-0 truncate text-foreground" dir="ltr">
                            {displayPhone2}
                          </span>
                        ) : (
                          <button
                            onClick={handleStartEditPhone2}
                            className="flex-1 min-w-0 cursor-pointer text-start text-xs font-semibold text-primary hover:underline"
                            title="إضافة رقم هاتف إضافي"
                            aria-label="إضافة رقم هاتف إضافي"
                          >
                            إضافة رقم إضافي
                          </button>
                        )}
                        {editingPhone2 ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={handleSavePhone2}
                              disabled={savingPhone2}
                              className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-50"
                              style={{ color: "#ffffff", background: "var(--business-success)", borderColor: "transparent" }}
                              title="حفظ"
                              aria-label="حفظ"
                            >
                              {savingPhone2 ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                              ) : (
                                <Check className="size-5" strokeWidth={3} />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingPhone2(false)}
                              disabled={savingPhone2}
                              className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                              style={{ color: "var(--business-danger)", background: "color-mix(in srgb, var(--business-danger) 12%, white)" }}
                              title="إلغاء"
                              aria-label="إلغاء"
                            >
                              <X className="size-[18px]" strokeWidth={3} />
                            </button>
                          </div>
                        ) : displayPhone2 ? (
                          <button
                            onClick={handleStartEditPhone2}
                            className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                            style={{ color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 12%, white)" }}
                            title="تعديل رقم الهاتف الإضافي"
                            aria-label="تعديل رقم الهاتف الإضافي"
                          >
                            <SquarePen className="size-4" />
                          </button>
                        ) : null}
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
                        const statusDisplay = getStatusDisplay(order.status);
                        return (
                          <div key={order.id} style={sectionStyle}>
                            <div className="mb-1.5 flex items-start justify-between">
                              <div className="min-w-0">
                                <p
                                  role="button"
                                  tabIndex={0}
                                  title={order.orderNumber}
                                  className="w-fit cursor-pointer text-sm font-bold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOrderMenu({
                                      mouseX: e.clientX + 2,
                                      mouseY: e.clientY - 6,
                                      orderNumber: order.orderNumber,
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOrderMenu({
                                        mouseX: (e.currentTarget as HTMLElement).getBoundingClientRect().left,
                                        mouseY: (e.currentTarget as HTMLElement).getBoundingClientRect().bottom + 4,
                                        orderNumber: order.orderNumber,
                                      });
                                    }
                                  }}
                                >
                                  #{order.orderNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: arSA })}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusDisplay.colorClass}`}>
                                {statusDisplay.label}
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

      {orderMenu ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOrderMenu(null)}
            aria-label="Close order menu"
          />
          <div
            className="fixed z-50 w-56 rounded-3xl border border-[color:var(--shell-overlay-border)] bg-[var(--shell-overlay-bg)] p-1.5 shadow-[var(--shell-overlay-shadow)] ring-1 ring-[color:var(--shell-overlay-edge)]"
            style={{
              left: Math.min(orderMenu.mouseX, (typeof window !== "undefined" ? window.innerWidth : 0) - 240),
              top: Math.min(orderMenu.mouseY, (typeof window !== "undefined" ? window.innerHeight : 0) - 200),
            }}
            role="menu"
          >
            <p className="mx-1 mb-1 border-b border-[color:var(--shell-control-border)] px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
              {orderMenu.orderNumber}
            </p>
            <button
              type="button"
              onClick={() => {
                const code = orderMenu.orderNumber;
                setOrderMenu(null);
                window.open(`/orders/${encodeURIComponent(code)}?edit=1`, "_blank");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Pencil className="size-4" />
              <span>تعديل</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const code = orderMenu.orderNumber;
                setOrderMenu(null);
                void handleViewOrderDetails(code);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <FileText className="size-4" />
              <span>{orderDetailsLoading ? "جاري التحميل..." : "عرض التفاصيل"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const code = orderMenu.orderNumber;
                setOrderMenu(null);
                void handleOpenReturnReason(code);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Undo2 className="size-4" />
              <span>سبب المرتجع</span>
            </button>
          </div>
        </>
      ) : null}

      {previewOrder ? (
        <EnhancedOrderModal
          order={previewOrder}
          isOpen={Boolean(previewOrder)}
          onClose={() => setPreviewOrder(null)}
          orderStatuses={orderStatuses.map((s) => ({ code: s.code, name: s.name, color: s.color }))}
        />
      ) : null}

      {selectedReturn ? (
        <ReturnDetailsModal
          request={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onUpdate={() => {}}
        />
      ) : null}
    </aside>
  );
};

export default ChatRightPanel;
