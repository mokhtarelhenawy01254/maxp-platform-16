import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStatusDisplay } from "../../utils/statusRegistry";
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { FileIcon, ImageIcon, Music, Paperclip, ShoppingBag, Video, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socketService';
import LinkifiedText from '../../components/common/LinkifiedText';
import { formatQueueLabel } from './queuePresentation';
import { getWhatsAppInboxWorkspaceCopy } from './workspaceCopy';
import QuickOrderModal from '../../components/facebook-inbox/Modals/QuickOrderModal';
import QuickCreateTaskModal from '../../components/facebook-inbox/Modals/QuickCreateTaskModal';
import ProductImagePickerModal from '../../components/facebook-inbox/ProductImagePicker/ProductImagePickerModal';
import ImageGalleryModal from '../../components/facebook-inbox/ImageGallery/ImageGalleryModal';
import CreateServiceOrderModal from '../../components/facebook-inbox/Modals/CreateServiceOrderModal';

type ConversationDetail = {
  id: string;
  status: string;
  aiEnabled?: boolean;
  queueKey?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    avatar: string | null;
    status: string | null;
  };
  messages: Array<{
    id: string;
    content: string;
    type: string;
    isFromCustomer: boolean;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
  }>;
  notes: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    author: { id: string; firstName: string; lastName: string; avatar: string | null };
  }>;
  conversationTags: Array<{
    id: string;
    tag: string;
    color: string;
  }>;
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    department: string | null;
  } | null;
  availableModerators: Array<{
    id: string;
    name: string;
    online: boolean;
    department: string | null;
    workload: {
      active: number;
      pending: number;
      waitingCustomer: number;
      unread: number;
      totalWeighted: number;
    };
  }>;
  flags: {
    detectedLanguage: string | null;
    detectedCountry: string | null;
    detectedDepartment: string | null;
    ownerLock: {
      lockExpiresAt?: string;
    };
    sla: {
      firstResponseDeadlineAt?: string;
      maxWaitingDeadlineAt?: string;
      firstResponseAt?: string | null;
    };
  };
  canTransfer: boolean;
  window: {
    isOpen: boolean;
    remainingSeconds: number;
    remainingLabel: string;
    windowExpiresAt: string | null;
  };
};

type ConversationApiResponse = {
  success: boolean;
  conversation: ConversationDetail;
};

const statusOptions = ['NEW', 'QUEUED', 'ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED', 'CLOSED'];

interface WhatsAppChatProps {
  companyId?: string;
  superAdminMode?: boolean;
}

const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ companyId, superAdminMode }) => {
  const { conversationId } = useParams();
  const apiBase = superAdminMode ? '/api/v1/admin/whatsapp-inbox' : '/api/v1/whatsapp-inbox';
  const apiParams = useMemo(
    () => (superAdminMode && companyId ? { params: { companyId } } : undefined),
    [superAdminMode, companyId],
  );
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const copy = useMemo(() => getWhatsAppInboxWorkspaceCopy(i18n.language), [i18n.language]);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showServiceOrderModal, setShowServiceOrderModal] = useState(false);
  const [showQuickCreateTaskModal, setShowQuickCreateTaskModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Array<{ id: string; orderNumber?: string; status?: string; createdAt?: string; items?: unknown[]; total?: number }>>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentRole = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return String(user.role || '').toUpperCase();
    } catch {
      return '';
    }
  }, []);

  const navigateToInbox = useCallback(() => {
    if (superAdminMode && companyId) {
      navigate(`/super-admin/whatsapp/companies/${companyId}/routing`);
    } else {
      navigate('/whatsapp/routing');
    }
  }, [companyId, navigate, superAdminMode]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      const response = await apiClient.get<ConversationApiResponse>(`${apiBase}/conversations/${conversationId}`, apiParams);
      if (response.data?.success) {
        setConversation(response.data.conversation);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } } | undefined;
      if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
        navigateToInbox();
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, navigateToInbox, apiBase, apiParams]);

  const fetchCustomerOrders = useCallback(async (customerId: string) => {
    if (!customerId) return;
    setLoadingOrders(true);
    try {
      const response = await apiClient.get(`/customers/${customerId}/orders`);
      if ((response as any).data?.success) {
        setCustomerOrders((response as any).data.data || []);
      }
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (conversation?.customer?.id) {
      fetchCustomerOrders(conversation.customer.id);
    }
  }, [conversation?.customer?.id, fetchCustomerOrders]);

  useEffect(() => {
    if (!conversationId) return;

    socketService.joinConversation(conversationId);

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    // Coalesce socket events: نداء واحد بدل نداء لكل رسالة
    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadConversation();
      }, 800);
    };

    socketService.on('conversation:updated', scheduleRefresh);
    socketService.on('conversation:assignment', scheduleRefresh);
    socketService.on('whatsapp:message:new', scheduleRefresh);
    socketService.on('whatsapp:message:sent', scheduleRefresh);

    return () => {
      socketService.leaveConversation(conversationId);
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
      socketService.off('conversation:updated', scheduleRefresh);
      socketService.off('conversation:assignment', scheduleRefresh);
      socketService.off('whatsapp:message:new', scheduleRefresh);
      socketService.off('whatsapp:message:sent', scheduleRefresh);
    };
  }, [conversationId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post(`${apiBase}/conversations/${conversationId}/messages${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
        content: draft,
        type: 'TEXT',
      });
      setDraft('');
      await loadConversation();
    } finally {
      setSaving(false);
    }
  };

  const sendSms = async () => {
    if (!draft.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post(`${apiBase}/conversations/${conversationId}/send-sms${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
        content: draft,
      });
      setDraft('');
      await loadConversation();
      toast.success('تم إرسال رسالة SMS للعميل بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'فشل إرسال رسالة SMS');
    } finally {
      setSaving(false);
    }
  };

  const sendProductImages = async (
    product: { id: string; name: string; price: number | string },
    images: Array<{ url: string; filename: string }>,
    includeDetails: boolean,
  ) => {
    if (!conversationId || images.length === 0) return;
    setSaving(true);
    setShowProductPicker(false);
    try {
      if (includeDetails) {
        await apiClient.post(`${apiBase}/conversations/${conversationId}/messages${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
          content: `${product.name}\nالسعر: ${product.price} ج.م`,
          type: 'TEXT',
        });
      }
      for (const image of images) {
        await apiClient.post(`${apiBase}/conversations/${conversationId}/send-existing-image${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
          imageUrl: image.url,
          filename: image.filename,
        });
        if (images.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      await loadConversation();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'فشل إرسال صور المنتج');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectImageFromGallery = async (imageUrl: string, filename: string) => {
    if (!conversationId) return;
    setSaving(true);
    setShowImageGallery(false);
    try {
      await apiClient.post(`${apiBase}/conversations/${conversationId}/send-existing-image${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
        imageUrl,
        filename,
      });
      await loadConversation();
      toast.success("تم إرسال الصورة بنجاح");
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'فشل إرسال الصورة من الحافظة');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMultipleImagesFromGallery = async (images: Array<{ url: string; filename: string }>) => {
    if (!conversationId || images.length === 0) return;
    setSaving(true);
    setShowImageGallery(false);
    try {
      for (const image of images) {
        await apiClient.post(`${apiBase}/conversations/${conversationId}/send-existing-image${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
          imageUrl: image.url,
          filename: image.filename,
        });
        if (images.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      await loadConversation();
      toast.success(`تم إرسال ${images.length} صورة بنجاح`);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'فشل إرسال الصور من الحافظة');
    } finally {
      setSaving(false);
    }
  };

  const submitCorrection = async (messageId: string) => {
    if (!correctionText.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post(`${apiBase}/conversations/${conversationId}/messages/${messageId}/correct${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
        correction: correctionText.trim(),
      });
      setEditingMessageId(null);
      setCorrectionText('');
      await loadConversation();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'فشل إرسال التصحيح');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (requestAssistance = false) => {
    if (!noteDraft.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post('/api/v1/internal-notes', {
        conversationId,
        content: noteDraft,
        mentionUserIds: selectedMentionIds,
        requestAssistance,
        isInternal: true,
      });
      setNoteDraft('');
      setSelectedMentionIds([]);
      await loadConversation();
    } finally {
      setSaving(false);
    }
  };

  const addTag = async () => {
    if (!tagInput.trim() || !conversationId) return;
    await apiClient.post('/api/v1/internal-notes/tags', {
      conversationId,
      tag: tagInput.trim(),
    });
    setTagInput('');
    await loadConversation();
  };

  const removeTag = async (tagId: string) => {
    await apiClient.delete(`/api/v1/internal-notes/tags/${tagId}`);
    await loadConversation();
  };

  const updateStatus = async (status: string) => {
    if (!conversationId) return;
    await apiClient.patch(`${apiBase}/conversations/${conversationId}/status${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
      status,
    });
    await loadConversation();
  };

  const transferConversation = async () => {
    if (!conversationId || !transferTarget) return;
    await apiClient.post(`${apiBase}/conversations/${conversationId}/transfer${superAdminMode && companyId ? `?companyId=${companyId}` : ''}`, {
      toUserId: transferTarget,
      note: noteDraft || undefined,
    });
    setTransferTarget('');
    setNoteDraft('');
    await loadConversation();
  };

  const toggleMention = (userId: string) => {
    setSelectedMentionIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const formatTime = useCallback(
    (value?: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat(copy.locale, {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }).format(date);
    },
    [copy.locale],
  );

  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat(copy.locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    },
    [copy.locale],
  );

  const translateStatus = useCallback(
    (status?: string) => {
      const key = String(status || '').toUpperCase();
      return copy.chat.status[key] || key;
    },
    [copy.chat?.status],
  );

  const mediaHint = useCallback((type?: string) => {
    const key = String(type || '').toUpperCase();
    const hints: Record<string, React.ReactNode> = {
      IMAGE: <ImageIcon className="size-4" />,
      VIDEO: <Video className="size-4" />,
      AUDIO: <Music className="size-4" />,
      DOCUMENT: <FileIcon className="size-4" />,
      VOICE: <Music className="size-4" />,
    };
    return hints[key] || <Paperclip className="size-4" />;
  }, []);

  const renderMessageContent = useCallback(
    (message: { type: string; content: string }) => {
      const typeUpper = String(message.type || '').toUpperCase();
      if (typeUpper === 'TEXT') {
        return (
          <LinkifiedText
            text={message.content}
            className="block whitespace-pre-wrap break-words text-sm leading-6"
          />
        );
      }
      return (
        <div className="flex items-center gap-2 text-sm italic">
          {mediaHint(typeUpper)}
          <span>{(copy.chat.mediaHint as Record<string, string>)[typeUpper] || message.type}</span>
        </div>
      );
    },
    [copy.chat.mediaHint, mediaHint],
  );

  const getOrderStatusTheme = (status?: string) => {
    if (!status) return { background: '#f3f4f6', color: '#374151' };
    const info = getStatusDisplay(status);
    const colorMatch = info.colorClass.match(/text-([a-z]+)-(\d+)/);
    const colorMap: Record<string, string> = {
      'green': '#16a34a', 'red': '#dc2626', 'yellow': '#ca8a04',
      'blue': '#2563eb', 'indigo': '#4f46e5', 'purple': '#9333ea',
      'orange': '#ea580c', 'amber': '#d97706', 'gray': '#6b7280',
      'cyan': '#06b6d4', 'teal': '#0d9488', 'rose': '#e11d48',
      'sky': '#0284c7', 'emerald': '#059669', 'pink': '#db2777',
      'stone': '#78716c',
    };
    const colorName = colorMatch ? colorMatch[1]! : 'gray';
    const color = colorMap[colorName] || '#6b7280';
    return {
      background: `color-mix(in srgb, ${color} 12%, white)`,
      color,
    };
  };

  const canTransfer = conversation?.canTransfer && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(currentRole || '');

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <svg className="mb-3 size-12 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <div className="text-sm text-muted-foreground">
          {copy.chat.notAvailable}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100dvh-64px)] min-h-0 gap-0 xl:grid-cols-[1fr,380px]">
      <main className="flex min-h-0 flex-col bg-background">
        <header className="wa-glass-header border-b border-border/50 bg-card px-4 py-3 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => navigateToInbox()}
          className="rounded-md border border-border/50 bg-muted px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted/80"
        >
          {copy.chat.back}
        </button>
              <div>
          <div className="text-xs font-medium text-muted-foreground">{copy.chat.chatLabel}</div>
          <h1 className="mt-1 text-xl font-bold text-foreground">{conversation.customer.name}</h1>
                  <div className="text-sm text-muted-foreground">{conversation.customer.phone}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {formatQueueLabel(conversation.queueKey, conversation.status)}
              </span>
              <button
                type="button"
                onClick={() => setShowOrderModal(true)}
                className="business-icon-button rounded-xl transition-colors"
                data-tone="warning"
                title="إنشاء طلب سريع"
              >
                <ShoppingCartIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowQuickCreateTaskModal(true)}
                className="business-icon-button rounded-xl transition-colors"
                data-tone="primary"
                title="المهام"
              >
                <span className="text-xs font-bold px-1">Task</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const newStatus = conversation.aiEnabled === false;
                    // Send to backend
                    await apiClient.put(`/conversations/${conversation.id}`, {
                      aiEnabled: newStatus,
                      companyId: companyId
                    });
                    loadConversation();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  conversation.aiEnabled !== false
                    ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                    : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                }`}
                title={conversation.aiEnabled !== false ? "الرد الذكي مفعل" : "الرد الذكي معطل"}
              >
                <span>🤖</span>
                <span>{conversation.aiEnabled !== false ? "إيقاف الرد الآلي" : "تشغيل الرد الآلي"}</span>
              </button>
          <select
            value={conversation.status}
            onChange={(event) => updateStatus(event.target.value)}
            className="rounded-lg border border-border/50 bg-muted px-3 py-1.5 text-xs font-medium text-foreground outline-none"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {translateStatus(status)}
              </option>
            ))}
          </select>
          {conversation.customer.status === 'VIP' ? (
            <span className="rounded-full bg-tertiary/10 px-2.5 py-0.5 text-xs font-medium text-tertiary">
              {copy.chat.vipBadge}
            </span>
          ) : null}
        </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{copy.chat.owner}: {conversation.assignedUser ? `${conversation.assignedUser.firstName} ${conversation.assignedUser.lastName}`.trim() : copy.chat.unassigned}</span>
            {conversation.flags.detectedLanguage ? <span>{copy.chat.language}: {conversation.flags.detectedLanguage.toUpperCase()}</span> : null}
            {conversation.flags.detectedCountry ? <span>{copy.chat.country}: {conversation.flags.detectedCountry}</span> : null}
            {conversation.flags.detectedDepartment ? <span>{copy.chat.department}: {conversation.flags.detectedDepartment}</span> : null}
            {conversation.flags.ownerLock?.lockExpiresAt ? <span>{copy.chat.lockUntil}: {formatTime(conversation.flags.ownerLock.lockExpiresAt)}</span> : null}
            {conversation.flags.sla?.maxWaitingDeadlineAt ? <span>{copy.chat.slaDeadline}: {formatTime(conversation.flags.sla.maxWaitingDeadlineAt)}</span> : null}
            {conversation.window?.isOpen ? (
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-success">⏱ {conversation.window.remainingLabel}</span>
            ) : (
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-destructive">✕ {conversation.window.remainingLabel}</span>
            )}
          </div>
        </header>

        <div className="wa-slim-scroll wa-messages-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          <div className="space-y-3">
            {conversation.messages.map((message) => (
              <div key={message.id} className="space-y-1.5">
                <div
                  className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`wa-bubble wa-bubble-enter max-w-[72%] rounded-xl px-4 py-3 shadow-sm ${
                      message.isFromCustomer
                        ? 'rounded-bl-sm bg-card text-foreground'
                        : 'rounded-br-sm bg-primary text-primary-foreground'
                    }`}
                  >
                    {renderMessageContent(message)}
                    <div className={`mt-1.5 text-[11px] ${message.isFromCustomer ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                      {formatTime(message.createdAt)}
                    </div>
                    {!message.isFromCustomer && message.user && (
                      <div className="mt-0.5 text-[10px] text-primary-foreground/50 text-right">
                        {`${message.user.firstName} ${message.user.lastName}`.trim()}
                      </div>
                    )}
                    {!message.isFromCustomer && !message.user && (
                      <div className="mt-2 border-t border-primary-foreground/20 pt-1.5 flex justify-between items-center text-[10px]">
                        <span className="text-primary-foreground/60">🤖 رد تلقائي من الوكيل</span>
                        {editingMessageId !== message.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setCorrectionText(message.content);
                            }}
                            className="text-white hover:underline font-medium cursor-pointer"
                          >
                            تصحيح الرد
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {editingMessageId === message.id && (
                  <div className="flex justify-end">
                    <div className="w-[72%] bg-muted rounded-xl p-3 border border-border/80 space-y-2">
                      <div className="text-xs font-semibold text-foreground">تصحيح رد الوكيل:</div>
                      <textarea
                        value={correctionText}
                        onChange={(e) => setCorrectionText(e.target.value)}
                        className="w-full min-h-[60px] p-2 text-sm rounded border bg-background text-foreground outline-none resize-none focus:border-primary"
                        placeholder="اكتب الرد الصحيح للعميل هنا لتعليم الوكيل وتصحيح الخطأ..."
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setCorrectionText('');
                          }}
                          className="px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => submitCorrection(message.id)}
                          disabled={saving || !correctionText.trim()}
                          className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
                        >
                          {saving ? 'جاري الحفظ...' : 'حفظ وتصحيح'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="wa-input-bar border-t border-border/50 bg-card px-4 py-3 md:px-5">
          {conversation.window && !conversation.window.isOpen && (
            <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <span>نافذة الـ 24 ساعة مغلقة — لا يمكن إرسال نصوص حرة عبر واتساب. يمكنك إرسال الرسالة كـ SMS أو استخدام قالب معتمد.</span>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border/50 bg-muted p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={copy.chat.replyPlaceholder}
              className="min-h-[80px] w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImageGallery(true)}
                disabled={saving}
                className="business-icon-button rounded-lg px-3 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                title="حافظة الصور المحفوظة"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowProductPicker(true)}
                disabled={saving}
                className="business-icon-button rounded-lg px-3 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                title="اختيار منتج من المتجر وإرسال صوره كرسالة"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4m-9 4v5"
                  />
                </svg>
              </button>
              {conversation.window && !conversation.window.isOpen && (
                <button
                  type="button"
                  onClick={sendSms}
                  disabled={saving || !draft.trim()}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-500 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1.5"
                  title="إرسال المحتوى كرسالة SMS للعميل"
                >
                  إرسال كـ SMS
                </button>
              )}
              <button
                type="button"
                onClick={sendMessage}
                disabled={saving || !draft.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.chat.sendReply}
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className="wa-slim-scroll min-h-0 overflow-y-auto border-l border-border/50 bg-card p-4 md:p-5">
        <div className="space-y-4">
          <section className="rounded-xl border border-border/50 bg-muted/50 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.chat.tags.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {conversation.conversationTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: tag.color || '#0f172a' }}
                >
                  {tag.tag}
                  <button type="button" onClick={() => removeTag(tag.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder={copy.chat.tags.addPlaceholder}
                className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                {copy.chat.tags.add}
              </button>
            </div>
          </section>

          {canTransfer ? (
            <section className="rounded-xl border border-border/50 bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.chat.transfer.title}</div>
              <div className="mt-3 space-y-2">
                <select
                  value={transferTarget}
                  onChange={(event) => setTransferTarget(event.target.value)}
                  className="w-full rounded-lg border border-border/50 bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                >
                  <option value="">{copy.chat.transfer.selectPlaceholder}</option>
                  {conversation.availableModerators.map((moderator) => (
                    <option key={moderator.id} value={moderator.id}>
                      {moderator.name} {moderator.online ? `• ${copy.chat.transfer.onlineBadge}` : `• ${copy.chat.transfer.offlineBadge}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={transferConversation}
                  disabled={!transferTarget}
                  className="w-full rounded-lg bg-warning px-3 py-2 text-sm font-medium text-warning-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.chat.transfer.button}
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-border/50 bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.chat.collaboration.title}</div>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder={copy.chat.collaboration.placeholder}
              className="mt-3 min-h-[100px] w-full rounded-lg border border-border/50 bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="w-full text-xs font-medium text-muted-foreground">{copy.chat.collaboration.mentionTitle}</div>
              {conversation.availableModerators.map((moderator) => (
                <button
                  key={moderator.id}
                  type="button"
                  onClick={() => toggleMention(moderator.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  selectedMentionIds.includes(moderator.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                >
                  @{moderator.name}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => addNote(false)}
                disabled={!noteDraft.trim()}
                className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.chat.collaboration.saveNote}
              </button>
              <button
                type="button"
                onClick={() => addNote(true)}
                disabled={!noteDraft.trim()}
                className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.chat.collaboration.requestAssistance}
              </button>
            </div>
          </section>

          <section className="business-page-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                <ShoppingBag size={16} style={{ color: 'var(--color-muted-foreground)' }} />
                {copy.chat.orders.title}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowQuickCreateTaskModal(true)}
                  className="business-icon-button business-icon-button--sm"
                  data-tone="primary"
                  title="المهام"
                >
                  <span className="text-[10px] font-bold px-1">Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowServiceOrderModal(true)}
                  className="business-icon-button business-icon-button--sm"
                  data-tone="primary"
                  title="إنشاء طلب خدمة للعميل"
                >
                  <span className="text-xs">🛠️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(true)}
                  className="business-icon-button business-icon-button--sm"
                  data-tone="warning"
                  title="إنشاء طلب سريع"
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {loadingOrders ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : customerOrders.length === 0 ? (
              <div
                className="text-center py-8"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <ShoppingBag size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">{copy.chat.orders.empty}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerOrders.map((order) => {
                  const theme = getOrderStatusTheme(order.status);
                  const itemsCount = order.items?.length || 0;
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border p-3"
                      style={{
                        background: 'var(--color-card)',
                        borderColor: 'var(--business-card-border)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                              #{order.orderNumber}
                            </span>
                            {(order as any).type === 'SERVICE' && (
                              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                🛠️ خدمة
                              </span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                            {formatDate(order.createdAt)}
                            {(order as any).type === 'SERVICE' && (order as any).serviceName && (
                              <span className="mr-1 text-purple-600 dark:text-purple-400 font-medium">
                                • {(order as any).serviceName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ ...theme }}>
                          {(() => { const info = getStatusDisplay(order.status ?? ''); return (t(info.labelKey) as string) || info.label; })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-muted-foreground)' }}>
                          {(order as any).type === 'SERVICE'
                            ? ((order as any).serviceName || 'طلب خدمة')
                            : `${itemsCount} ${itemsCount === 1 ? copy.chat.orders.itemsOne : copy.chat.orders.itemsOther}`}
                        </span>
                        <span className="font-bold" style={{ color: 'var(--color-foreground)' }}>
                          {Number(order.total).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border/50 bg-muted/50 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{copy.chat.notes.title}</div>
            <div className="mt-4 space-y-3">
              {conversation.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="text-sm leading-6 text-foreground">{note.content}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/70">
                    <span>{`${note.author.firstName} ${note.author.lastName}`.trim()}</span>
                    <span>{formatTime(note.createdAt)}</span>
                  </div>
                </div>
              ))}
              {conversation.notes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  {copy.chat.notes.empty}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </aside>

      <QuickOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        conversationId={conversation?.id}
        customerId={conversation?.customer?.id}
        customerName={conversation?.customer?.name}
        platform="whatsapp"
        pageName="WhatsApp"
        onOrderCreated={(orderId) => {
          console.log('✅ WhatsApp order created:', orderId);
        }}
      />

      <CreateServiceOrderModal
        isOpen={showServiceOrderModal}
        onClose={() => setShowServiceOrderModal(false)}
        customerName={conversation.customer.name}
        customerPhone={conversation.customer.phone}
        onOrderCreated={() => {
          if (conversation.customer.id) {
            fetchCustomerOrders(conversation.customer.id);
          }
        }}
      />

      <QuickCreateTaskModal
        isOpen={showQuickCreateTaskModal}
        onClose={() => setShowQuickCreateTaskModal(false)}
      />

      <ProductImagePickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSendProduct={sendProductImages}
      />

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={handleSelectImageFromGallery}
        onSelectMultipleImages={handleSelectMultipleImagesFromGallery}
      />
    </div>
  );
};

export default WhatsAppChat;
