import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { FileIcon, ImageIcon, Music, Paperclip, ShoppingBag, Video } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socketService';
import LinkifiedText from '../../components/common/LinkifiedText';
import { formatQueueLabel } from './queuePresentation';
import { getWhatsAppInboxWorkspaceCopy } from './workspaceCopy';
import QuickOrderModal from '../../components/facebook-inbox/Modals/QuickOrderModal';
import QuickCreateTaskModal from '../../components/facebook-inbox/Modals/QuickCreateTaskModal';

type ConversationDetail = {
  id: string;
  status: string;
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
  const { i18n } = useTranslation();
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
  const [showQuickCreateTaskModal, setShowQuickCreateTaskModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Array<{ id: string; orderNumber?: string; status?: string; createdAt?: string; items?: unknown[]; total?: number }>>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
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
      navigate(`/super-admin/whatsapp/companies/${companyId}/inbox`);
    } else {
      navigate('/whatsapp-inbox');
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
      if (response.data?.success) {
        setCustomerOrders(response.data.data || []);
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
    const refresh = () => loadConversation();
    socketService.on('conversation:updated', refresh);
    socketService.on('conversation:assignment', refresh);
    socketService.on('whatsapp:message:new', refresh);
    socketService.on('whatsapp:message:sent', refresh);

    return () => {
      socketService.leaveConversation(conversationId);
      socketService.off('conversation:updated', refresh);
      socketService.off('conversation:assignment', refresh);
      socketService.off('whatsapp:message:new', refresh);
      socketService.off('whatsapp:message:sent', refresh);
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
          <span>{copy.chat.mediaHint[typeUpper] || message.type}</span>
        </div>
      );
    },
    [copy.chat.mediaHint, mediaHint],
  );

  const getOrderStatusTheme = (status?: string) => {
    const upper = (status || '').toUpperCase();
    if (['COMPLETED', 'DELIVERED', 'PAID'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-success) 12%, white)', color: 'var(--business-success)' };
    }
    if (['CANCELLED', 'REFUNDED', 'RETURNED'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-danger) 12%, white)', color: 'var(--business-danger)' };
    }
    if (upper === 'PENDING') {
      return { background: 'color-mix(in srgb, var(--business-warning) 12%, white)', color: 'var(--business-warning)' };
    }
    if (upper === 'CONFIRMED') {
      return { background: 'color-mix(in srgb, var(--color-primary) 12%, white)', color: 'var(--color-primary)' };
    }
    if (['PROCESSING', 'SHIPPED'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-chart-tertiary) 12%, white)', color: 'var(--business-chart-tertiary)' };
    }
    return { background: 'color-mix(in srgb, var(--color-border) 42%, white)', color: 'var(--color-muted-foreground)' };
  };

  const canTransfer = conversation?.canTransfer && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(currentRole || '');

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500 dark:border-slate-600 dark:border-t-cyan-400" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        {copy.chat.notAvailable}
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-64px)] min-h-0 gap-0 xl:grid-cols-[1fr,380px]">
      <main className="flex min-h-0 flex-col bg-background">
        <header className="border-b border-border/50 bg-card px-4 py-3 md:px-5">
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
            <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-medium text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">
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
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          <div className="space-y-3">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
              >
                <div
                className={`max-w-[72%] rounded-xl px-4 py-3 shadow-sm ${
                  message.isFromCustomer
                    ? 'rounded-bl-sm bg-card text-foreground'
                    : 'rounded-br-sm bg-primary text-primary-foreground'
                }`}
                >
                  {renderMessageContent(message)}
                  <div className={`mt-1.5 text-[11px] ${message.isFromCustomer ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                    {formatTime(message.createdAt)}
                  </div>
                  {!message.isFromCustomer && message.user ? (
                    <div className="mt-0.5 text-[10px] text-primary-foreground/50 text-right">
                      {`${message.user.firstName} ${message.user.lastName}`.trim()}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border/50 bg-card px-4 py-3 md:px-5">
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
            <div className="flex justify-end">
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

      <aside className="min-h-0 overflow-y-auto border-l border-border/50 bg-card p-4 md:p-5">
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
                  className="w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950"
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
                        background: 'linear-gradient(180deg, color-mix(in srgb, white 88%, var(--color-background) 12%) 0%, color-mix(in srgb, white 76%, var(--color-background) 24%) 100%)',
                        borderColor: 'var(--business-card-border)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                            #{order.orderNumber}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ ...theme }}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-muted-foreground)' }}>
                          {itemsCount} {itemsCount === 1 ? copy.chat.orders.itemsOne : copy.chat.orders.itemsOther}
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
                  <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">{note.content}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
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
        conversationId={conversation.id}
        customerId={conversation.customer.id}
        customerName={conversation.customer.name}
        platform="whatsapp"
        pageName="WhatsApp"
        onOrderCreated={(orderId) => {
          console.log('✅ WhatsApp order created:', orderId);
        }}
      />

      <QuickCreateTaskModal
        isOpen={showQuickCreateTaskModal}
        onClose={() => setShowQuickCreateTaskModal(false)}
      />
    </div>
  );
};

export default WhatsAppChat;
